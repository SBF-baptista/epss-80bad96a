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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Step 1: Get distinct sale_summary_ids from unprocessed incoming_vehicles
    const { data: pendingVehicles, error: queryError } = await supabase
      .from('incoming_vehicles')
      .select('sale_summary_id')
      .eq('processed', false)
      .not('sale_summary_id', 'is', null)

    if (queryError) {
      console.error('❌ Failed to query pending vehicles:', queryError)
      return new Response(
        JSON.stringify({ success: false, error: 'Database query failed', details: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Deduplicate sale_summary_ids
    const uniqueIds = [...new Set((pendingVehicles || []).map(v => v.sale_summary_id))].filter(Boolean)
    console.log(`📊 Found ${uniqueIds.length} unique pending sale_summary_ids from incoming_vehicles: ${uniqueIds.join(', ')}`)

    // Only retry IDs >= this threshold to avoid re-importing old sales
    const MIN_SALE_SUMMARY_ID = 10942

    // Also fetch IDs from integration_state that were CREATED recently but never stored in incoming_vehicles
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: integrationRecords, error: retryError } = await supabase
      .from('integration_state')
      .select('integration_name, metadata, last_poll_at')
      .like('integration_name', 'segsale_products_%')
      .gt('created_at', sevenDaysAgo)

    if (retryError) {
      console.warn('⚠️ Failed to query integration_state for retry:', retryError.message)
    }

    // Extract all candidate IDs from integration_state
    const candidateRetryIds = (integrationRecords || [])
      .map(r => {
        const match = r.integration_name.match(/segsale_products_(\d+)/)
        return match ? parseInt(match[1]) : null
      })
      .filter((id): id is number => id !== null)

    // Check which of these IDs are NOT in incoming_vehicles (never stored or empty result)
    let retryIds: number[] = []
    if (candidateRetryIds.length > 0) {
      const { data: existingIncoming } = await supabase
        .from('incoming_vehicles')
        .select('sale_summary_id')
        .in('sale_summary_id', candidateRetryIds)

      const existingSet = new Set((existingIncoming || []).map(v => v.sale_summary_id))
      retryIds = candidateRetryIds.filter(id => !existingSet.has(id) && id >= MIN_SALE_SUMMARY_ID)
    }

    if (retryIds.length > 0) {
      console.log(`🔄 Found ${retryIds.length} IDs in integration_state not yet in incoming_vehicles: ${retryIds.join(', ')}`)
    }

    // Combine both sources, deduplicated, sorted by ID descending (newest first)
    const allIds = [...new Set([...uniqueIds, ...retryIds])].sort((a, b) => b - a)
    console.log(`📊 Total unique IDs to process: ${allIds.length}`)

    if (allIds.length === 0) {
      console.log('✅ No pending sales to sync')
      return new Response(
        JSON.stringify({ success: true, message: 'No pending sales to sync', synced: 0, timestamp }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Limit to 10 per execution to avoid overloading
    const idsToProcess = allIds.slice(0, 10)
    console.log(`🔄 Processing ${idsToProcess.length} sale_summary_ids (max 10)`)

    const results: any[] = []

    for (const idResumoVenda of idsToProcess) {
      console.log(`\n--- Processing sale_summary_id: ${idResumoVenda} ---`)

      try {
        // Deduplication check: verify sale_summary_id doesn't already have records
        const { data: existingSale } = await supabase
          .from('incoming_vehicles')
          .select('id')
          .eq('sale_summary_id', idResumoVenda)
          .eq('processed', true)
          .limit(1);

        if (existingSale && existingSale.length > 0) {
          console.log(`⚠️ sale_summary_id ${idResumoVenda} already has processed records. Skipping.`);
          results.push({ id: idResumoVenda, status: 'already_processed' });
          continue;
        }

        // Step 2: Call fetch-segsale-products
        const fetchUrl = `${supabaseUrl}/functions/v1/fetch-segsale-products?idResumoVenda=${idResumoVenda}`
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

        // Step 3: Transform and send to receive-vehicle
        const vehicleGroups = transformSalesToVehicleGroups(sales, idResumoVenda)
        console.log(`📦 ${vehicleGroups.length} vehicle groups to store`)

        if (vehicleGroups.length === 0) {
          results.push({ id: idResumoVenda, status: 'no_vehicle_groups' })
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
          results.push({ id: idResumoVenda, status: 'storage_failed', error: receiveResponse.status })
        } else {
          const receiveData = await receiveResponse.json()
          console.log(`✅ Stored vehicles for ${idResumoVenda}`)
          results.push({ id: idResumoVenda, status: 'success', stored: receiveData })
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

    const summary = {
      success: true,
      message: `Sync completed: ${results.filter(r => r.status === 'success').length}/${idsToProcess.length} processed`,
      total_pending: uniqueIds.length,
      processed: idsToProcess.length,
      results,
      timestamp,
    }

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

// Reuse the same mapping from segsale-webhook
function mapUsageType(usageType: string): string {
  const normalized = usageType.toUpperCase().trim()
  const mapping: Record<string, string> = {
    'TELEMETRIA GPS': 'telemetria_gps',
    'TELEMETRIA CAN': 'telemetria_can',
    'COPILOTO 2 CAMERAS': 'copiloto_2_cameras',
    'COPILOTO 4 CAMERAS': 'copiloto_4_cameras',
    'PARTICULAR': 'particular',
    'COMERCIAL': 'comercial',
    'FROTA': 'frota',
    'PLUS II - GPS': 'telemetria_gps',
    'PLUS II - CAN': 'telemetria_can',
    'PLUS I - GPS': 'telemetria_gps',
  }
  return mapping[normalized] || usageType.toLowerCase().replace(/\s+/g, '_')
}

function transformSalesToVehicleGroups(sales: any[], idResumoVenda: number): any[] {
  const vehicleGroups: any[] = []

  for (const sale of sales) {
    const vehicles = sale.vehicles || []
    if (vehicles.length === 0) continue

    const transformedVehicles = vehicles.map((v: any) => {
      const vehicle: any = {
        vehicle: v.vehicle || v.modelo || '',
        brand: v.brand || v.marca || '',
        year: v.year || v.ano || null,
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

    const usageType = mapUsageType(sale.usage_type || 'TELEMETRIA GPS')

    vehicleGroups.push({
      company_name: sale.company_name || 'Não identificado',
      usage_type: usageType,
      sale_summary_id: idResumoVenda,
      pending_contract_id: sale.pending_contract_id || null,
      cpf: sale.cpf || null,
      phone: sale.phone || null,
      vehicles: transformedVehicles,
      address: sale.address || undefined,
    })
  }

  return vehicleGroups
}
