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

    console.log(`Fetching Segsale products for idResumoVenda: ${idResumoVenda}`)

    // Call Segsale API
    const segsaleUrl = `https://ws-sale-teste.segsat.com/segsale/relatorios/produtos-por-veiculo?idResumoVenda=${idResumoVenda}`
    
    const segsaleResponse = await fetch(segsaleUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${segsaleToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!segsaleResponse.ok) {
      const errorText = await segsaleResponse.text()
      console.error('Segsale API error:', errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch from Segsale API',
          status: segsaleResponse.status,
          details: errorText
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const salesData: SegsaleSale[] = await segsaleResponse.json()
    console.log(`Received ${salesData.length} sales from Segsale`)

    // Store each sale in the database
    const storedSales = []
    for (const sale of salesData) {
      const { data, error } = await supabase
        .from('segsale_sales')
        .insert({
          id_resumo_venda: parseInt(idResumoVenda),
          company_name: sale.company_name,
          usage_type: sale.usage_type,
          vehicles: sale.vehicles
        })
        .select()
        .single()

      if (error) {
        console.error('Error storing sale:', error)
      } else {
        storedSales.push(data)
        console.log(`Stored sale for ${sale.company_name} - ${sale.usage_type}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fetched and stored ${storedSales.length} sales from Segsale`,
        id_resumo_venda: idResumoVenda,
        sales: salesData,
        stored_count: storedSales.length
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})