
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
}

// Function to generate automatic order number
async function generateAutoOrderNumber(supabase: any): Promise<string> {
  // Get the count of existing automatic orders
  const { data: orders, error } = await supabase
    .from('pedidos')
    .select('numero_pedido')
    .like('numero_pedido', 'AUTO-%')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Error fetching auto orders:', error)
    return 'AUTO-001'
  }

  if (!orders || orders.length === 0) {
    return 'AUTO-001'
  }

  // Extract the number from the last auto order
  const lastOrder = orders[0].numero_pedido
  const match = lastOrder.match(/AUTO-(\d+)/)
  
  if (match) {
    const nextNumber = parseInt(match[1]) + 1
    return `AUTO-${nextNumber.toString().padStart(3, '0')}`
  }

  return 'AUTO-001'
}

// Function to find automation rule
async function findAutomationRule(supabase: any, brand: string, model: string, year?: string) {
  console.log(`Looking for automation rule: ${brand} ${model} ${year || 'no year'}`)
  
  // First try to find exact match with year if provided
  if (year) {
    const { data, error } = await supabase
      .from('automation_rules_extended')
      .select('*')
      .eq('brand', brand.toUpperCase())
      .eq('model', model.toUpperCase())
      .eq('model_year', year)
      .limit(1)

    if (error) {
      console.error('Error finding automation rule with year:', error)
    } else if (data && data.length > 0) {
      console.log('Found automation rule with year:', data[0])
      return data[0]
    }
  }

  // Try without year
  const { data, error } = await supabase
    .from('automation_rules_extended')
    .select('*')
    .eq('brand', brand.toUpperCase())
    .eq('model', model.toUpperCase())
    .limit(1)

  if (error) {
    console.error('Error finding automation rule:', error)
    return null
  }

  if (data && data.length > 0) {
    console.log('Found automation rule without year:', data[0])
    return data[0]
  }

  console.log('No automation rule found')
  return null
}

// Function to create automatic order
async function createAutomaticOrder(supabase: any, vehicle: any, orderNumber: string) {
  console.log(`Creating automatic order for vehicle: ${vehicle.marca} ${vehicle.modelo}`)
  
  try {
    // Extract year from vehicle data if available (could be in 'tipo' field)
    const vehicleYear = vehicle.tipo ? vehicle.tipo.toString() : undefined
    
    // Find automation rule for the vehicle
    const automationRule = await findAutomationRule(supabase, vehicle.marca, vehicle.modelo, vehicleYear)
    
    if (!automationRule) {
      console.log('No automation rule found, skipping automatic order creation')
      return null
    }

    // Create the order
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        numero_pedido: orderNumber,
        configuracao: automationRule.configuration,
        status: 'novos',
        data: new Date().toISOString(),
        usuario_id: Deno.env.get('SYSTEM_USER_ID') || 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf', // sergio.filho@segsat.com for system orders
        company_name: null // verify-vehicle doesn't have company_name context
      })
      .select()
      .single()

    if (pedidoError) {
      console.error('Error creating automatic order:', pedidoError)
      throw pedidoError
    }

    console.log('Created automatic order:', pedido)

    // Create vehicle entry for the order
    const { error: vehicleError } = await supabase
      .from('veiculos')
      .insert({
        pedido_id: pedido.id,
        marca: vehicle.marca,
        modelo: vehicle.modelo,
        quantidade: vehicle.quantidade || 1,
        tipo: vehicleYear || null
      })

    if (vehicleError) {
      console.error('Error creating vehicle for automatic order:', vehicleError)
      throw vehicleError
    }

    // Create tracker entry for the order
    const { error: trackerError } = await supabase
      .from('rastreadores')
      .insert({
        pedido_id: pedido.id,
        modelo: automationRule.tracker_model,
        quantidade: vehicle.quantidade || 1
      })

    if (trackerError) {
      console.error('Error creating tracker for automatic order:', trackerError)
      throw trackerError
    }

    console.log(`Successfully created automatic order ${orderNumber} for ${vehicle.marca} ${vehicle.modelo}`)
    
    return {
      order_number: orderNumber,
      tracker_model: automationRule.tracker_model,
      configuration: automationRule.configuration
    }

  } catch (error) {
    console.error('Error in createAutomaticOrder:', error)
    throw error
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'GET') return json({ success: false, error: 'Method not allowed' }, 405)

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Auth: x-api-key (OPM) OR valid user JWT
    const apiKey = req.headers.get('x-api-key')
    const expectedKey = Deno.env.get('OPM_API_KEY')
    let authorized = !!(apiKey && expectedKey && apiKey === expectedKey)
    if (!authorized) {
      const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
      if (token) {
        const { data: { user } } = await supabase.auth.getUser(token)
        authorized = !!user
      }
    }
    if (!authorized) return json({ success: false, error: 'Unauthorized' }, 401)

    const url = new URL(req.url)
    const plateRaw = url.searchParams.get('plate') || url.searchParams.get('placa')
    const brand = url.searchParams.get('brand')
    const model = url.searchParams.get('model')
    const createOrder = url.searchParams.get('create_order') === 'true'
    const createHomologation = url.searchParams.get('create_homologation') === 'true'

    // ---- Plate lookup ----
    if (plateRaw) {
      const plate = plateRaw.toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (plate.length !== 7) return json({ success: false, plate, error: 'Placa inválida (7 caracteres)' })
      const { data: schedules, error } = await supabase
        .from('kit_schedules')
        .select('id, status, customer_name, configuration, vehicle_brand, vehicle_model, vehicle_year, scheduled_date, updated_at')
        .eq('vehicle_plate', plate)
        .order('updated_at', { ascending: false })
        .limit(5)
      if (error) { console.error(error); return json({ success: false, plate, error: 'Erro ao consultar' }) }
      const { data: incoming } = await supabase
        .from('incoming_vehicles')
        .select('id, brand, vehicle, year, company_name, sale_summary_id, received_at')
        .eq('plate', plate)
        .order('received_at', { ascending: false })
        .limit(1)
      const s = schedules?.[0]
      const iv = incoming?.[0]
      return json({
        success: true,
        plate,
        found: !!(s || iv),
        status: s?.status ?? (iv ? 'recebido' : null),
        vehicle: s ? { brand: s.vehicle_brand, model: s.vehicle_model, year: s.vehicle_year }
          : iv ? { brand: iv.brand, model: iv.vehicle, year: iv.year } : null,
        customer: s?.customer_name ?? iv?.company_name ?? null,
        configuration: s?.configuration ?? null,
        kit_schedule_id: s?.id ?? null,
        sale_summary_id: iv?.sale_summary_id ?? null,
        history: schedules ?? [],
      })
    }

    if (!brand || !model) {
      return json({ success: false, error: 'Missing required parameters', message: 'Informe plate, ou brand e model' }, 400)
    }

    // ---- Brand/model lookup (legacy) ----
    const { data: vehicles, error } = await supabase
      .from('veiculos')
      .select('id, marca, modelo, quantidade, tipo, created_at')
      .ilike('marca', brand.trim())
      .ilike('modelo', model.trim())
      .limit(1)
    if (error) { console.error(error); return json({ success: false, error: 'Database error' }) }

    if (!vehicles || vehicles.length === 0) {
      let homologation_created = false
      if (createHomologation) {
        const { data: existing } = await supabase.from('homologation_cards').select('id')
          .eq('brand', brand.trim()).eq('model', model.trim()).limit(1)
        if (!existing || existing.length === 0) {
          const { error: cardError } = await supabase.from('homologation_cards').insert({
            brand: brand.trim(), model: model.trim(), status: 'homologar',
            notes: `Criado via verify-vehicle em ${new Date().toISOString()}`,
          })
          homologation_created = !cardError
          if (cardError) console.error(cardError)
        }
      }
      return json({ success: false, found: false, error: 'Vehicle not found',
        message: `No vehicle found with brand "${brand}" and model "${model}"`, homologation_created })
    }

    const vehicle = vehicles[0]
    let automaticOrderInfo: any = null
    if (createOrder) {
      try {
        automaticOrderInfo = await createAutomaticOrder(supabase, vehicle, await generateAutoOrderNumber(supabase))
      } catch (e) { console.error(e); automaticOrderInfo = { error: 'Failed to create automatic order' } }
    }
    return json({
      success: true, found: true,
      vehicle: { id: vehicle.id, brand: vehicle.marca, model: vehicle.modelo, quantity: vehicle.quantidade, type: vehicle.tipo, created_at: vehicle.created_at },
      ...(automaticOrderInfo && { automatic_order: automaticOrderInfo }),
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return json({ success: false, error: 'Internal server error' })
  }
})
