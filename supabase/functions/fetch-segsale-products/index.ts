import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SegsaleVehicle {
  brand: string
  vehicle: string
  year: number
  quantity: number
  accessories: string[]
  modules: string[]
}

interface SegsaleSale {
  company_name: string
  usage_type: string
  vehicles: SegsaleVehicle[]
}

// Fetch with timeout and retry logic
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2,
  timeoutMs = 60000,
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} - Fetching: ${url}`)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response
    } catch (error: any) {
      clearTimeout(timeoutId)
      lastError = error as Error

      const isAbort = error?.name === 'AbortError'
      console.warn(
        isAbort
          ? `⏱️ Attempt ${attempt}/${maxRetries} - Timeout after ${timeoutMs}ms`
          : `❌ Attempt ${attempt}/${maxRetries} - Error: ${error?.message ?? String(error)}`,
      )

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        console.log(`⏳ Waiting ${waitTime}ms before retry...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`)
}

async function readCachedSegsaleResponse(supabase: any, idResumoVenda: string) {
  const cacheKey = `segsale_products_${idResumoVenda}`
  const { data, error } = await supabase
    .from('integration_state')
    .select('metadata, updated_at')
    .eq('integration_name', cacheKey)
    .maybeSingle()

  if (error) {
    console.warn('⚠️ Failed to read cache from integration_state:', error)
    return null
  }

  const cachedSales = data?.metadata?.sales
  if (!cachedSales) return null

  return { sales: cachedSales, updated_at: data.updated_at }
}

async function writeCachedSegsaleResponse(supabase: any, idResumoVenda: string, sales: any) {
  const cacheKey = `segsale_products_${idResumoVenda}`
  const now = new Date().toISOString()

  // Try update first, then insert if not found
  const { data: existing } = await supabase
    .from('integration_state')
    .select('id')
    .eq('integration_name', cacheKey)
    .maybeSingle()

  if (existing) {
    const { error: updateError } = await supabase.from('integration_state')
      .update({ status: 'ok', last_poll_at: now, metadata: { sales }, updated_at: now })
      .eq('id', existing.id)
    if (updateError) console.warn('⚠️ Failed to update cache:', updateError)
  } else {
    const { error: insertError } = await supabase.from('integration_state').insert({
      integration_name: cacheKey,
      status: 'ok',
      last_poll_at: now,
      metadata: { sales },
      updated_at: now,
    })
    if (insertError) console.warn('⚠️ Failed to insert cache:', insertError)
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const segsaleToken = Deno.env.get('SEGSALE_API_TOKEN')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get idResumoVenda from query params or body
    const url = new URL(req.url)
    const idResumoVenda = url.searchParams.get('idResumoVenda')

    if (!idResumoVenda) {
      return new Response(
        JSON.stringify({ error: 'idResumoVenda parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📡 Fetching Segsale products for idResumoVenda: ${idResumoVenda}`)

    // Rate-limiting: check cache first (5 hour TTL)
    const CACHE_TTL_MS = 5 * 60 * 60 * 1000 // 5 hours
    const cached = await readCachedSegsaleResponse(supabase, idResumoVenda)
    if (cached) {
      const cacheAge = Date.now() - new Date(cached.updated_at).getTime()
      if (cacheAge < CACHE_TTL_MS) {
        console.log(`🧠 Cache hit (${Math.round(cacheAge / 1000)}s old) — returning cached data, skipping API call`)
        return new Response(
          JSON.stringify({
            success: true,
            cached: true,
            cache_age_seconds: Math.round(cacheAge / 1000),
            cache_updated_at: cached.updated_at,
            message: 'Dados retornados do cache (menos de 5 minutos)',
            sale_summary_id: idResumoVenda,
            sales: cached.sales,
            processing: { forwarded: false, message: 'Cache hit — no external calls made' },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      console.log(`⏰ Cache expired (${Math.round(cacheAge / 1000)}s old) — fetching fresh data`)
    }

    // Call Segsale API with retry and timeout
    const segsaleUrl = `https://ws-sale.segsat.com/segsale/relatorios/produtos-por-veiculo?idResumoVenda=${idResumoVenda}`

    let segsaleResponse: Response
    try {
      segsaleResponse = await fetchWithRetry(
        segsaleUrl,
        {
          method: 'GET',
          headers: {
            Token: segsaleToken,
            'Content-Type': 'application/json',
          },
        },
        1, // no retry - API responds fast
        15000, // 15s timeout
      )
    } catch (fetchError: any) {
      console.error('❌ Segsale fetch failed (timeout/retries exceeded):', fetchError?.message ?? fetchError)

      // Fallback to cached response (last successful import)
      const cached = await readCachedSegsaleResponse(supabase, idResumoVenda)
      if (cached) {
        console.log('🧠 Returning cached Segsale response from integration_state:', cached.updated_at)
        return new Response(
          JSON.stringify({
            success: true,
            cached: true,
            cache_updated_at: cached.updated_at,
            message: 'Segsale indisponível no momento; retornando último resultado em cache',
            sale_summary_id: idResumoVenda,
            sales: cached.sales,
            processing: { forwarded: false, message: 'Skipped processing because response is cached' },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      return new Response(
        JSON.stringify({
          error: 'Segsale API timeout - servidor não respondeu',
          details: fetchError?.message ?? String(fetchError),
          suggestion: 'A API Segsale está lenta ou indisponível. Tente novamente em alguns minutos.',
          url: segsaleUrl,
        }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!segsaleResponse.ok) {
      const errorText = await segsaleResponse.text()
      console.error('Segsale API error - Status:', segsaleResponse.status)
      console.error('Segsale API error - StatusText:', segsaleResponse.statusText)
      console.error('Segsale API error - Response:', errorText)
      console.error('Segsale API URL:', segsaleUrl)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch from Segsale API',
          status: segsaleResponse.status,
          statusText: segsaleResponse.statusText,
          details: errorText,
          url: segsaleUrl
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const salesData: SegsaleSale[] = await segsaleResponse.json()
    console.log(`✅ Received ${salesData.length} sales from Segsale`)
    // Fire-and-forget cache write — don't block the response
    writeCachedSegsaleResponse(supabase, idResumoVenda, salesData).catch(e =>
      console.warn('⚠️ Cache write failed (non-blocking):', e?.message ?? e)
    )

    // Fetch contract items for each sale that has id_contrato_pendente
    const enrichedSalesData = []
    for (const sale of salesData) {
      const enrichedSale = { ...sale }
      
      // Check if sale has pending_contract_id to fetch contract items
      if ((sale as any).pending_contract_id) {
        const pendingContractId = (sale as any).pending_contract_id
        console.log(`📦 Fetching contract items for pending_contract_id: ${pendingContractId}`)
        
        try {
          const contractItemsUrl = `https://ws-sale.segsat.com/segsale/relatorios/itens-produtos?id=${pendingContractId}`
          
          const contractResponse = await fetchWithRetry(
            contractItemsUrl,
            {
              method: 'GET',
              headers: {
                'Token': segsaleToken,
                'Content-Type': 'application/json'
              }
            },
            1, // no retry - skip if slow
            10000 // 10s timeout
          )

          if (contractResponse.ok) {
            const contractItems = await contractResponse.json()
            
            // If API returns null/empty, try to get from database
            if (!contractItems || (Array.isArray(contractItems) && contractItems.length === 0)) {
              console.log(`⚠️ API returned null/empty for contract ${pendingContractId}, skipping DB fallback to avoid timeout`)
            } else {
              console.log(`✅ Contract items fetched from API for contract ${pendingContractId}: ${contractItems.length} items`)
              enrichedSale.contract_items = contractItems
            }
          } else {
            console.error(`Failed to fetch contract items for ${pendingContractId}: ${contractResponse.status}`)
          }
        } catch (err) {
          console.error(`Error fetching contract items for ${pendingContractId}:`, err.message)
        }
      }
      
      enrichedSalesData.push(enrichedSale)
    }

    // NOTE: receive-vehicle is NO LONGER called from here to prevent circular loops.
    // It should be called explicitly by the webhook or manually.

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fetched ${enrichedSalesData.length} sales from Segsale`,
        sale_summary_id: idResumoVenda,
        sales: enrichedSalesData,
        processing: { forwarded: false, message: 'Processing handled separately' },
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
