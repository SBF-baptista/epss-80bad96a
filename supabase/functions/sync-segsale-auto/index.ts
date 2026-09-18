import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 🔄 sync-segsale-auto started`)

  try {
    let requestedIds: number[] = []
    let requestSource = ''
    try {
      const url = new URL(req.url)
      const idsParam = url.searchParams.get('sale_summary_ids') || url.searchParams.get('ids')
      if (idsParam) {
        requestedIds = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => Number.isFinite(id))
      } else if (req.method !== 'GET') {
        const body = await req.json().catch(() => null)
        requestSource = typeof body?.source === 'string' ? body.source : ''
        if (Array.isArray(body?.sale_summary_ids)) {
          requestedIds = body.sale_summary_ids.map((id: any) => parseInt(String(id))).filter((id: number) => Number.isFinite(id))
        }
      }
    } catch (parseError) {
      console.warn('⚠️ Could not parse manual sale_summary_ids:', parseError)
    }

    // The obsolete 5-hour cron cannot be removed by the integration role
    // because it belongs to another database owner. Ignore only its uniquely
    // identifiable payload; the active 10-minute job sends a `time` field.
    if (requestSource === 'pg_cron') {
      return new Response(
        JSON.stringify({ success: true, status: 'ignored_legacy_schedule', message: 'Legacy 5-hour schedule ignored' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Segsale IDs are currently sequential in this range. IDs from 900000 are
    // reserved by the OPM for manually-created records and must never move the
    // Segsale discovery cursor.
    const MIN_SALE_SUMMARY_ID = 10942
    const MANUAL_ID_START = 900000
    const CURSOR_NAME = 'segsale_discovery_cursor'
    const MAX_DISCOVERY_PROBES = 12
    const MAX_RETRIES_PER_RUN = 4

    const { data: cursorState } = await supabase
      .from('integration_state')
      .select('last_processed_id')
      .eq('integration_name', CURSOR_NAME)
      .maybeSingle()

    const { data: maxRealRow, error: maxRealError } = await supabase
      .from('incoming_vehicles')
      .select('sale_summary_id')
      .gte('sale_summary_id', MIN_SALE_SUMMARY_ID)
      .lt('sale_summary_id', MANUAL_ID_START)
      .order('sale_summary_id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (maxRealError) {
      console.error('❌ Failed to determine latest real Segsale ID:', maxRealError.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Database query failed', details: maxRealError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const initialCursor = Math.max(
      cursorState?.last_processed_id ?? 0,
      maxRealRow?.sale_summary_id ?? MIN_SALE_SUMMARY_ID - 1,
      MIN_SALE_SUMMARY_ID - 1,
    )

    // Retry recent empty/error probes independently from Kickoff's `processed`
    // flag. This prevents completed or pending Kickoffs from becoming a
    // permanent import queue.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: integrationRecords, error: retryError } = await supabase
      .from('integration_state')
      .select('integration_name, metadata, last_poll_at, status, error_count')
      .like('integration_name', 'segsale_products_%')
      .gt('created_at', sevenDaysAgo)
      .eq('status', 'error')
      .order('last_poll_at', { ascending: true })

    if (retryError) {
      console.warn('⚠️ Failed to query integration_state for retry:', retryError.message)
    }

    const candidateRetryIds = (integrationRecords || [])
      .map(r => {
        const match = r.integration_name.match(/segsale_products_(\d+)/)
        return match ? parseInt(match[1]) : null
      })
      .filter((id): id is number => id !== null && id >= MIN_SALE_SUMMARY_ID && id < MANUAL_ID_START)

    // Check which of these IDs are NOT in incoming_vehicles (never stored or empty result)
    let retryIds: number[] = []
    if (candidateRetryIds.length > 0) {
      const { data: existingIncoming } = await supabase
        .from('incoming_vehicles')
        .select('sale_summary_id')
        .in('sale_summary_id', candidateRetryIds)

      const existingSet = new Set((existingIncoming || []).map(v => v.sale_summary_id))
      retryIds = [...new Set(candidateRetryIds.filter(id => !existingSet.has(id)))].slice(0, MAX_RETRIES_PER_RUN)
    }

    if (retryIds.length > 0) {
      console.log(`🔄 Found ${retryIds.length} IDs in integration_state not yet in incoming_vehicles: ${retryIds.join(', ')}`)
    }

    // Scan forward from a dedicated cursor. The cursor advances only through
    // confirmed sales, so an empty range is reviewed again on the next cycle.
    let discoveredIds: number[] = []
    let discoveryProbes = 0
    let lastScannedId = initialCursor
    if (requestedIds.length === 0) {
      try {
        let cursor = initialCursor + 1
        console.log(`🔎 Discovery scan starting at real Segsale cursor ${initialCursor}; manual IDs >= ${MANUAL_ID_START} are ignored`)

        while (discoveryProbes < MAX_DISCOVERY_PROBES) {
          const probeUrl = `${supabaseUrl}/functions/v1/fetch-segsale-products?idResumoVenda=${cursor}&forceRefresh=true`
          try {
            const probeResp = await fetch(probeUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
              },
            })
            if (probeResp.ok) {
              const probeData = await probeResp.json().catch(() => null)
              const sales = probeData?.sales || []
              if (sales.length > 0) {
                discoveredIds.push(cursor)
                console.log(`✨ Discovered new sale_summary_id=${cursor} (${sales.length} sale(s))`)
              }
            }
          } catch (probeErr: any) {
            console.warn(`⚠️ Probe failed for ${cursor}: ${probeErr?.message}`)
          }
          lastScannedId = cursor
          cursor++
          discoveryProbes++
          // small delay to be gentle with Segsale
          await new Promise(r => setTimeout(r, 300))
        }

        const confirmedCursor = discoveredIds.length > 0 ? Math.max(...discoveredIds) : initialCursor
        await supabase.from('integration_state').upsert({
          integration_name: CURSOR_NAME,
          last_processed_id: confirmedCursor,
          last_poll_at: new Date().toISOString(),
          status: 'ok',
          error_count: 0,
          last_error: null,
          metadata: { started_at: initialCursor + 1, probes: discoveryProbes, discovered_ids: discoveredIds },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'integration_name' })

        console.log(`🔎 Discovery complete: probed ${discoveryProbes} IDs through ${lastScannedId}, confirmed cursor ${confirmedCursor}, found ${discoveredIds.length} new (${discoveredIds.join(', ') || 'none'})`)
      } catch (discErr: any) {
        console.warn('⚠️ Discovery scan error:', discErr?.message)
        await supabase.from('integration_state').upsert({
          integration_name: CURSOR_NAME,
          last_processed_id: lastScannedId,
          last_poll_at: new Date().toISOString(),
          status: 'error',
          last_error: discErr?.message || 'Discovery scan failed',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'integration_name' })
      }
    }

    // Newly discovered sales always get priority. Retries have a separate,
    // bounded quota so persistent failures cannot starve new sales.
    const allIds = (requestedIds.length > 0
      ? [...new Set(requestedIds)]
      : [...new Set([...discoveredIds, ...retryIds])]
    ).filter(id => id >= MIN_SALE_SUMMARY_ID && id < MANUAL_ID_START)
    if (requestedIds.length > 0) {
      console.log(`🎯 Manual sale_summary_ids requested: ${allIds.join(', ')}`)
    }
    console.log(`📊 Total unique IDs to process: ${allIds.length}`)

    if (allIds.length === 0) {
      console.log('✅ No pending sales to sync')
      return new Response(
        JSON.stringify({ success: true, message: 'No pending sales to sync', synced: 0, timestamp }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const idsToProcess = allIds.slice(0, 16)
    console.log(`🔄 Processing ${idsToProcess.length} sale_summary_ids (${discoveredIds.length} discovered, up to ${MAX_RETRIES_PER_RUN} retries)`)

    const results: any[] = []

    for (const idResumoVenda of idsToProcess) {
      console.log(`\n--- Processing sale_summary_id: ${idResumoVenda} ---`)

      try {
        // Step 2: Call fetch-segsale-products with forceRefresh to bypass cache
        const fetchUrl = `${supabaseUrl}/functions/v1/fetch-segsale-products?idResumoVenda=${idResumoVenda}&forceRefresh=true`
        const fetchResponse = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
        })

        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text()
          console.error(`❌ fetch-segsale-products failed for ${idResumoVenda}: ${fetchResponse.status} - ${errorText}`)
          results.push({ id: idResumoVenda, status: 'fetch_failed', error: fetchResponse.status })
          continue
        }

        const fetchData = await fetchResponse.json()
        const sales = fetchData.sales || []
        console.log(`✅ Got ${sales.length} sales for ${idResumoVenda}`)

        if (sales.length === 0) {
          results.push({ id: idResumoVenda, status: 'no_sales' })
          continue
        }

        // Count total vehicles returned by API
        let apiVehicleCount = 0
        for (const sale of sales) {
          const vehicles = sale.vehicles || []
          apiVehicleCount += vehicles.length
        }

        // Count vehicles already in DB for this sale_summary_id
        const { count: dbVehicleCount, error: countError } = await supabase
          .from('incoming_vehicles')
          .select('*', { count: 'exact', head: true })
          .eq('sale_summary_id', idResumoVenda)

        if (countError) {
          console.error(`❌ Failed to count DB vehicles for ${idResumoVenda}:`, countError.message)
          results.push({ id: idResumoVenda, status: 'count_error', error: countError.message })
          continue
        }

        const dbCount = dbVehicleCount || 0
        console.log(`📊 Vehicle count comparison for ${idResumoVenda}: API=${apiVehicleCount} vs DB=${dbCount}`)

        // Check if all DB records are already processed
        const { data: processedCheck } = await supabase
          .from('incoming_vehicles')
          .select('id')
          .eq('sale_summary_id', idResumoVenda)
          .eq('processed', true)
          .limit(1)

        const hasProcessedRecords = processedCheck && processedCheck.length > 0

        if (apiVehicleCount <= dbCount && hasProcessedRecords) {
          console.log(`✅ sale_summary_id ${idResumoVenda} is complete (API=${apiVehicleCount}, DB=${dbCount}). Skipping.`)
          results.push({ id: idResumoVenda, status: 'already_complete', api_count: apiVehicleCount, db_count: dbCount })
          continue
        }

        if (apiVehicleCount > dbCount) {
          console.log(`🆕 Found ${apiVehicleCount - dbCount} NEW vehicles for ${idResumoVenda} (API=${apiVehicleCount}, DB=${dbCount})`)
        }

        // Step 3: Transform and send to receive-vehicle (dedup in receive-vehicle handles existing records)
        const { groups: vehicleGroups, unmapped } = transformSalesToVehicleGroups(sales, idResumoVenda)
        console.log(`📦 ${vehicleGroups.length} vehicle groups to store (${unmapped.length} unmapped)`) 

        // Critical log for any unmapped productDescription / usage_type coming from Segsale.
        // This surfaces new product families immediately instead of failing silently downstream.
        if (unmapped.length > 0) {
          for (const u of unmapped) {
            console.error(`🚨 Unmapped usage_type "${u.raw_usage_type}" for sale ${idResumoVenda} (${u.company_name}) plates=${u.plates.join(',') || 'n/a'}`)
            await supabase.from('app_logs').insert({
              action: 'segsale_unmapped_usage_type',
              module: 'segsale_sync',
              impact_level: 'critical',
              status: 'error',
              action_type: 'system_event',
              origin: 'edge_function',
              entity_type: 'incoming_vehicle',
              entity_id: String(idResumoVenda),
              entity_name: u.company_name,
              error_code: 'UNMAPPED_USAGE_TYPE',
              error_message: `Segsale productDescription/usage_type "${u.raw_usage_type}" is not in mapUsageType() dictionary. Sale ${idResumoVenda} skipped for this group.`,
              new_state: {
                sale_summary_id: idResumoVenda,
                raw_usage_type: u.raw_usage_type,
                company_name: u.company_name,
                plates: u.plates,
              },
            }).then(({ error }) => {
              if (error) console.error('⚠️ Failed to write app_logs for unmapped usage_type:', error.message)
            })
          }

          // Mark integration_state as errored so it does not silently look healthy.
          await supabase.from('integration_state').upsert({
            integration_name: `segsale_products_${idResumoVenda}`,
            status: 'error',
            last_error: `Unmapped usage_type(s): ${[...new Set(unmapped.map(u => u.raw_usage_type))].join(', ')}`,
            last_poll_at: new Date().toISOString(),
          }, { onConflict: 'integration_name' })
        }

        if (vehicleGroups.length === 0) {
          results.push({
            id: idResumoVenda,
            status: unmapped.length > 0 ? 'unmapped_usage_type' : 'no_vehicle_groups',
            unmapped: unmapped.length > 0 ? unmapped : undefined,
          })
          continue
        }

        const vehicleApiKey = Deno.env.get('VEHICLE_API_KEY')
        if (!vehicleApiKey) {
          console.error('❌ VEHICLE_API_KEY not configured')
          results.push({ id: idResumoVenda, status: 'missing_api_key' })
          continue
        }

        const receiveUrl = `${supabaseUrl}/functions/v1/receive-vehicle`
        const receiveResponse = await fetch(receiveUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': vehicleApiKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
          body: JSON.stringify(vehicleGroups),
        })

        if (!receiveResponse.ok) {
          const receiveError = await receiveResponse.text()
          console.error(`❌ receive-vehicle failed for ${idResumoVenda}: ${receiveResponse.status} - ${receiveError}`)

          // Propagate the failure into integration_state (last_error + error_count)
          // and app_logs so the sync no longer looks healthy when downstream returns 4xx/5xx.
          const isClientError = receiveResponse.status >= 400 && receiveResponse.status < 500
          const { data: existingIS } = await supabase
            .from('integration_state')
            .select('error_count')
            .eq('integration_name', `segsale_products_${idResumoVenda}`)
            .maybeSingle()

          await supabase.from('integration_state').upsert({
            integration_name: `segsale_products_${idResumoVenda}`,
            status: 'error',
            last_error: `receive-vehicle ${receiveResponse.status}: ${receiveError.slice(0, 500)}`,
            error_count: (existingIS?.error_count ?? 0) + 1,
            last_poll_at: new Date().toISOString(),
          }, { onConflict: 'integration_name' })

          await supabase.from('app_logs').insert({
            action: 'segsale_receive_vehicle_failed',
            module: 'segsale_sync',
            impact_level: 'critical',
            status: 'error',
            action_type: 'system_event',
            origin: 'edge_function',
            entity_type: 'incoming_vehicle',
            entity_id: String(idResumoVenda),
            error_code: `HTTP_${receiveResponse.status}`,
            error_message: `receive-vehicle rejected sale ${idResumoVenda} with status ${receiveResponse.status}`,
            new_state: { response_body: receiveError.slice(0, 2000), client_error: isClientError },
          })

          results.push({ id: idResumoVenda, status: 'storage_failed', error: receiveResponse.status })
        } else {
          const receiveData = await receiveResponse.json()
          console.log(`✅ Stored vehicles for ${idResumoVenda} (API=${apiVehicleCount}, DB_before=${dbCount})`)
          results.push({ id: idResumoVenda, status: 'success', stored: receiveData, api_count: apiVehicleCount, db_before: dbCount })
        }
      } catch (itemError: any) {
        console.error(`❌ Error processing ${idResumoVenda}:`, itemError?.message || itemError)
        results.push({ id: idResumoVenda, status: 'error', error: itemError?.message })
      }

      // Wait 2 seconds between calls to avoid overloading Segsale API
      if (idsToProcess.indexOf(idResumoVenda) < idsToProcess.length - 1) {
        console.log('⏳ Waiting 2s before next call...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    const successfulStatuses = new Set(['success', 'already_complete', 'no_sales'])
    const failedResults = results.filter(r => !successfulStatuses.has(r.status))
    const runStatus = failedResults.length === 0 ? 'success' : results.length === failedResults.length ? 'error' : 'partial'
    const summary = {
      success: failedResults.length === 0,
      status: runStatus,
      message: `Sync ${runStatus}: ${results.filter(r => r.status === 'success').length} imported, ${failedResults.length} failed`,
      cursor_before: initialCursor,
      cursor_after: discoveredIds.length > 0 ? Math.max(...discoveredIds) : initialCursor,
      discovery_probes: discoveryProbes,
      discovered: discoveredIds.length,
      retries_selected: retryIds.length,
      processed: idsToProcess.length,
      results,
      timestamp,
    }

    await supabase.from('app_logs').insert({
      action: 'segsale_automatic_sync',
      module: 'segsale_sync',
      details: summary.message,
      impact_level: failedResults.length > 0 ? 'high' : 'info',
      status: runStatus,
      action_type: 'integration',
      origin: 'job',
      entity_type: 'integration',
      entity_id: CURSOR_NAME,
      entity_name: 'Sincronização automática Segsale',
      new_state: summary,
      error_message: failedResults.length > 0 ? `${failedResults.length} sale(s) failed` : null,
      is_critical: runStatus === 'error',
    })

    console.log(`\n🏁 Sync complete:`, JSON.stringify(summary, null, 2))

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ Unexpected error in sync-segsale-auto:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', details: error?.message, timestamp }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Reuse the same mapping from segsale-webhook.
// Returns null when the usage_type is not recognized so the caller can log/fail explicitly,
// instead of silently generating an invalid slug (e.g. "plus_ii_-_gps") that
// receive-vehicle would reject with HTTP 400.
function mapUsageType(usageType: string): string | null {
  const normalized = (usageType || '').toUpperCase().trim()
  const mapping: Record<string, string> = {
    'TELEMETRIA GPS': 'telemetria_gps',
    'TELEMETRIA CAN': 'telemetria_can',
    'COPILOTO 2 CAMERAS': 'copiloto_2_cameras',
    'COPILOTO 4 CAMERAS': 'copiloto_4_cameras',
    'PARTICULAR': 'particular',
    'COMERCIAL': 'comercial',
    'FROTA': 'frota',
    'PLUS II - GPS': 'plus_2_gps',
  }
  return mapping[normalized] ?? null
}

function transformSalesToVehicleGroups(
  sales: any[],
  idResumoVenda: number,
): { groups: any[]; unmapped: Array<{ raw_usage_type: string; company_name: string; plates: string[] }> } {
  const vehicleGroups: any[] = []
  const unmapped: Array<{ raw_usage_type: string; company_name: string; plates: string[] }> = []

  for (const sale of sales) {
    const vehicles = sale.vehicles || []
    if (vehicles.length === 0) continue

    const rawUsageType = sale.usage_type || 'TELEMETRIA GPS'
    const usageType = mapUsageType(rawUsageType)

    if (!usageType) {
      unmapped.push({
        raw_usage_type: rawUsageType,
        company_name: sale.company_name || 'Não identificado',
        plates: vehicles.map((v: any) => v.plate).filter(Boolean),
      })
      // Skip this sale group — do NOT invent a slug that would fail downstream.
      continue
    }

    const transformedVehicles = vehicles.map((v: any) => {
      const vehicle: any = {
        vehicle: v.vehicle || v.modelo || '',
        brand: v.brand || v.marca || '',
        year: v.year || v.ano || null,
        plate: v.plate || null,
        quantity: v.quantity || 1,
      }

      const accessories: any[] = []
      if (Array.isArray(v.accessories)) {
        v.accessories.forEach((acc: string) => {
          accessories.push({ accessory_name: acc, quantity: 1 })
        })
      }
      if (Array.isArray(v.modules)) {
        v.modules.forEach((mod: string) => {
          accessories.push({ accessory_name: mod, quantity: 1 })
        })
      }
      if (accessories.length > 0) {
        vehicle.accessories = accessories
      }

      return vehicle
    })

    const groupAccessories: any[] = []
    if (Array.isArray(sale.contract_items)) {
      for (const item of sale.contract_items) {
        const name = item?.name || item?.nome
        if (!name) continue
        groupAccessories.push({
          accessory_name: String(name),
          categories: item?.categories || item?.categoria || 'Acessórios',
          quantity: Number(item?.quantity ?? item?.quantidade ?? 1) || 1,
        })
      }
    }

    vehicleGroups.push({
      company_name: sale.company_name || 'Não identificado',
      usage_type: usageType,
      sale_summary_id: idResumoVenda,
      pending_contract_id: sale.pending_contract_id || null,
      cpf: sale.cpf || null,
      phone: sale.phone || null,
      vehicles: transformedVehicles,
      contract_items: Array.isArray(sale.contract_items) ? sale.contract_items : undefined,
      accessories: groupAccessories.length > 0 ? groupAccessories : undefined,
      address: sale.address || undefined,
    })
  }

  return { groups: vehicleGroups, unmapped }
}
