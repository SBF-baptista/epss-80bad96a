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
        'Token': segsaleToken,
        'Content-Type': 'application/json'
      }
    })

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
    console.log(`Received ${salesData.length} sales from Segsale`)

    // Fetch contract items for each sale that has id_contrato_pendente
    const enrichedSalesData = []
    for (const sale of salesData) {
      const enrichedSale = { ...sale }
      
      // Check if sale has pending_contract_id to fetch contract items
      if ((sale as any).pending_contract_id) {
        const pendingContractId = (sale as any).pending_contract_id
        console.log(`Fetching contract items for pending_contract_id: ${pendingContractId}`)
        
        try {
          const contractItemsUrl = `https://ws-sale-teste.segsat.com/segsale/relatorios/itens-produtos?id=${pendingContractId}`
          const contractResponse = await fetch(contractItemsUrl, {
            method: 'GET',
            headers: {
              'Token': segsaleToken,
              'Content-Type': 'application/json'
            }
          })

          if (contractResponse.ok) {
            const contractItems = await contractResponse.json()
            
            // If API returns null/empty, try to get from database
            if (!contractItems || (Array.isArray(contractItems) && contractItems.length === 0)) {
              console.log(`⚠️ API returned null/empty for contract ${pendingContractId}, fetching from database...`)
              
              const saleSummaryId = (sale as any).sale_summary_id || parseInt(idResumoVenda)
              const { data: dbAccessories, error: dbError } = await supabase
                .from('accessories')
                .select('name, quantity')
                .eq('company_name', sale.company_name)
                .order('created_at', { ascending: false })
              
              if (dbError) {
                console.error(`Error fetching accessories from DB for ${sale.company_name}:`, dbError)
              } else if (dbAccessories && dbAccessories.length > 0) {
                console.log(`✅ Found ${dbAccessories.length} accessories in DB for ${sale.company_name}`)
                enrichedSale.contract_items = dbAccessories
              } else {
                console.log(`ℹ️ No accessories found in DB for ${sale.company_name}`)
              }
            } else {
              console.log(`✅ Contract items fetched from API for contract ${pendingContractId}:`, JSON.stringify(contractItems, null, 2))
              enrichedSale.contract_items = contractItems
            }
          } else {
            console.error(`Failed to fetch contract items for ${pendingContractId}: ${contractResponse.status}`)
          }
        } catch (err) {
          console.error(`Error fetching contract items for ${pendingContractId}:`, err)
        }
      }
      
      enrichedSalesData.push(enrichedSale)
    }

    // Forward all contract_items to receive-vehicle for centralized vehicle_id linking
    console.log(`Forwarding ${enrichedSalesData.length} sales to receive-vehicle...`)
    console.log(`Contract items will be processed by receive-vehicle with proper vehicle_id linking`)

    // After storing, forward data to receive-vehicle for processing
    const vehicleGroups = (enrichedSalesData as any[]).map((sale) => ({
      company_name: sale.company_name,
      cpf: sale.cpf ?? null,
      phone: sale.phone ?? null,
      usage_type: sale.usage_type,
      // Use the English field names from the API
      sale_summary_id: sale.sale_summary_id ?? parseInt(idResumoVenda),
      pending_contract_id: sale.pending_contract_id ?? null,
      vehicles: sale.vehicles.map((v: SegsaleVehicle) => {
        // Ensure contract_items is always an array
        const contractItems = Array.isArray(sale.contract_items) ? sale.contract_items : [];
        
        return {
          plate: v.plate,
          brand: v.brand,
          vehicle: v.vehicle,
          year: v.year,
          // Distribute contract_items into modules and accessories based on categories
          modules: contractItems
            .filter((item: any) => item.categories === 'Módulos')
            .map((item: any) => item.name),
          accessories: contractItems
            .filter((item: any) => item.categories === 'Acessórios')
            .map((item: any) => ({ accessory_name: item.name, quantity: item.quantity || 1 }))
        };
      }),
      accessories: sale.accessories ?? [],
      contract_items: sale.contract_items ?? null,
      address: sale.address ?? undefined,
    }))

    const apiKey = Deno.env.get('VEHICLE_API_KEY')
    let processing: any = { forwarded: false }

    // Only forward if we have groups with vehicles
    if (!apiKey) {
      console.log('Skipping forwarding to receive-vehicle (missing API key)')
    } else if (vehicleGroups.length === 0) {
      console.log('Skipping forwarding to receive-vehicle (no vehicle groups to process)')
      processing = { forwarded: false, message: 'No vehicle groups to process' }
    } else {
      console.log(`Forwarding ${vehicleGroups.length} group(s) to receive-vehicle...`)
      console.log('Payload being sent:', JSON.stringify(vehicleGroups, null, 2))
      
      // Use direct fetch instead of supabase.functions.invoke to properly send body
      const receiveVehicleUrl = `${supabaseUrl}/functions/v1/receive-vehicle`
      const receiveVehicleResponse = await fetch(receiveVehicleUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(vehicleGroups),
      })

      if (!receiveVehicleResponse.ok) {
        const errorText = await receiveVehicleResponse.text()
        console.error('Error calling receive-vehicle:', receiveVehicleResponse.status, errorText)
        processing = { 
          forwarded: true, 
          success: false, 
          error: `HTTP ${receiveVehicleResponse.status}: ${errorText}` 
        }
      } else {
        const rvData = await receiveVehicleResponse.json()
        console.log('receive-vehicle processed successfully:', rvData)
        processing = { forwarded: true, success: true, result: rvData }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fetched ${enrichedSalesData.length} sales from Segsale`,
        sale_summary_id: idResumoVenda,
        sales: enrichedSalesData,
        processing,
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