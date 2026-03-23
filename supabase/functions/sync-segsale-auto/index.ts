import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔄 [sync-segsale-auto] Starting automatic sync...')

    // Fetch distinct sale_summary_ids that still need processing
    const { data: pendingVehicles, error: queryError } = await supabase
      .from('incoming_vehicles')
      .select('sale_summary_id')
      .not('sale_summary_id', 'is', null)
      .neq('homologation_status', 'homologado')
      .order('received_at', { ascending: false })

    if (queryError) {
      console.error('❌ Failed to query incoming_vehicles:', queryError)
      return new Response(
        JSON.stringify({ error: 'Failed to query pending vehicles', details: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get distinct sale_summary_ids, limit to 10
    const uniqueIds = [...new Set(
      (pendingVehicles || [])
        .map(v => v.sale_summary_id)
        .filter((id): id is number => id !== null)
    )].slice(0, 10)

    console.log(`📋 Found ${uniqueIds.length} pending sale_summary_ids: ${uniqueIds.join(', ')}`)

    if (uniqueIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No pending vehicles to sync', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results: { id: number; status: string; error?: string }[] = []

    for (const saleSummaryId of uniqueIds) {
      try {
        console.log(`📡 Syncing sale_summary_id: ${saleSummaryId}`)

        const fetchUrl = `${supabaseUrl}/functions/v1/fetch-segsale-products?idResumoVenda=${saleSummaryId}`
        const response = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          results.push({
            id: saleSummaryId,
            status: data.cached ? 'cache_hit' : 'fetched',
          })
          console.log(`✅ sale_summary_id ${saleSummaryId}: ${data.cached ? 'cache hit' : 'fetched fresh'}`)
        } else {
          const errorText = await response.text()
          results.push({ id: saleSummaryId, status: 'error', error: `HTTP ${response.status}` })
          console.warn(`⚠️ sale_summary_id ${saleSummaryId}: HTTP ${response.status} - ${errorText.substring(0, 200)}`)
        }
      } catch (err: any) {
        results.push({ id: saleSummaryId, status: 'error', error: err?.message || String(err) })
        console.error(`❌ sale_summary_id ${saleSummaryId}: ${err?.message}`)
      }

      // Wait 2 seconds between calls to avoid overloading the Segsale API
      if (uniqueIds.indexOf(saleSummaryId) < uniqueIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    const elapsed = Date.now() - startTime
    const summary = {
      success: true,
      message: `Synced ${results.length} sale_summary_ids in ${elapsed}ms`,
      processed: results.length,
      results,
      elapsed_ms: elapsed,
    }

    console.log(`🏁 [sync-segsale-auto] Done: ${JSON.stringify(summary)}`)

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ [sync-segsale-auto] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
