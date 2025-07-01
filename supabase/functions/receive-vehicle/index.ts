
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Function to generate automatic order number
async function generateAutoOrderNumber(supabase: any): Promise<string> {
  console.log('Generating automatic order number...')
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
    console.log('No existing auto orders found, starting with AUTO-001')
    return 'AUTO-001'
  }

  const lastOrder = orders[0].numero_pedido
  const match = lastOrder.match(/AUTO-(\d+)/)
  
  if (match) {
    const nextNumber = parseInt(match[1]) + 1
    const newOrderNumber = `AUTO-${nextNumber.toString().padStart(3, '0')}`
    console.log(`Generated new order number: ${newOrderNumber}`)
    return newOrderNumber
  }

  console.log('Could not parse last order number, defaulting to AUTO-001')
  return 'AUTO-001'
}

// Function to find automation rule
async function findAutomationRule(supabase: any, brand: string, model: string, year?: number) {
  console.log(`Looking for automation rule: ${brand} ${model} ${year || 'no year'}`)
  
  if (year) {
    const { data, error } = await supabase
      .from('automation_rules_extended')
      .select('*')
      .eq('brand', brand.toUpperCase())
      .eq('model', model.toUpperCase())
      .eq('model_year', year.toString())
      .limit(1)

    if (error) {
      console.error('Error finding automation rule with year:', error)
    } else if (data && data.length > 0) {
      console.log('Found automation rule with year:', data[0])
      return data[0]
    }
  }

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
async function createAutomaticOrder(supabase: any, vehicleData: any, orderNumber: string) {
  console.log(`Creating automatic order for vehicle: ${vehicleData.brand} ${vehicleData.vehicle}`)
  
  try {
    const automationRule = await findAutomationRule(supabase, vehicleData.brand, vehicleData.vehicle, vehicleData.year)
    
    if (!automationRule) {
      console.log('No automation rule found, skipping automatic order creation')
      return null
    }

    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        numero_pedido: orderNumber,
        configuracao: automationRule.configuration,
        status: 'novos',
        data: new Date().toISOString(),
        usuario_id: '00000000-0000-0000-0000-000000000000'
      })
      .select()
      .single()

    if (pedidoError) {
      console.error('Error creating automatic order:', pedidoError)
      throw pedidoError
    }

    console.log('Created automatic order:', pedido)

    const { error: vehicleError } = await supabase
      .from('veiculos')
      .insert({
        pedido_id: pedido.id,
        marca: vehicleData.brand,
        modelo: vehicleData.vehicle,
        quantidade: vehicleData.quantity || 1,
        tipo: vehicleData.year ? vehicleData.year.toString() : null
      })

    if (vehicleError) {
      console.error('Error creating vehicle for automatic order:', vehicleError)
      throw vehicleError
    }

    const { error: trackerError } = await supabase
      .from('rastreadores')
      .insert({
        pedido_id: pedido.id,
        modelo: automationRule.tracker_model,
        quantidade: vehicleData.quantity || 1
      })

    if (trackerError) {
      console.error('Error creating tracker for automatic order:', trackerError)
      throw trackerError
    }

    console.log(`Successfully created automatic order ${orderNumber} for ${vehicleData.brand} ${vehicleData.vehicle} (quantity: ${vehicleData.quantity || 1})`)
    
    return {
      order_id: pedido.id,
      order_number: orderNumber,
      tracker_model: automationRule.tracker_model,
      configuration: automationRule.configuration,
      quantity: vehicleData.quantity || 1
    }

  } catch (error) {
    console.error('Error in createAutomaticOrder:', error)
    throw error
  }
}

// Function to create homologation card
async function createHomologationCard(supabase: any, vehicleData: any, incomingVehicleId: string) {
  console.log(`Creating homologation card for vehicle: ${vehicleData.brand} ${vehicleData.vehicle}`)
  
  try {
    const { data: existingCard } = await supabase
      .from('homologation_cards')
      .select('id')
      .eq('brand', vehicleData.brand)
      .eq('model', vehicleData.vehicle)
      .limit(1)

    if (existingCard && existingCard.length > 0) {
      console.log(`Homologation card already exists for ${vehicleData.brand} ${vehicleData.vehicle}`)
      
      // Link existing card to incoming vehicle if not already linked
      const { error: updateError } = await supabase
        .from('homologation_cards')
        .update({ incoming_vehicle_id: incomingVehicleId })
        .eq('id', existingCard[0].id)
        .is('incoming_vehicle_id', null)

      if (updateError) {
        console.error('Error linking existing homologation card:', updateError)
      }

      return { homologation_id: existingCard[0].id, created: false }
    }

    const { data: newCard, error: cardError } = await supabase
      .from('homologation_cards')
      .insert({
        brand: vehicleData.brand,
        model: vehicleData.vehicle,
        year: vehicleData.year || null,
        status: 'homologar',
        incoming_vehicle_id: incomingVehicleId,
        notes: `Automatically created from vehicle data received on ${new Date().toISOString()}`
      })
      .select()
      .single()

    if (cardError) {
      console.error('Error creating homologation card:', cardError)
      throw cardError
    }

    console.log(`Created homologation card for ${vehicleData.brand} ${vehicleData.vehicle}`)
    return { homologation_id: newCard.id, created: true }

  } catch (error) {
    console.error('Error in createHomologationCard:', error)
    throw error
  }
}

// Function to check if vehicle exists
async function checkVehicleExists(supabase: any, brand: string, model: string) {
  console.log(`Checking if vehicle exists: ${brand} ${model}`)
  
  const { data: vehicles, error } = await supabase
    .from('veiculos')
    .select('id, marca, modelo, quantidade, tipo, created_at')
    .ilike('marca', brand.trim())
    .ilike('modelo', model.trim())
    .limit(1)

  if (error) {
    console.error('Database error checking vehicle:', error)
    throw error
  }

  const exists = vehicles && vehicles.length > 0
  console.log(`Vehicle exists check result: ${exists}`)
  return exists ? vehicles[0] : null
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] NEW REQUEST: ${req.method} ${req.url}`)
  console.log(`[${timestamp}] Headers:`, Object.fromEntries(req.headers.entries()))

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${timestamp}] CORS preflight request`)
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`[${timestamp}] Method not allowed: ${req.method}`)
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    console.log(`[${timestamp}] Initializing Supabase client...`)
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log(`[${timestamp}] Supabase client initialized`)

    // API key authentication
    const apiKey = req.headers.get('x-api-key')
    const expectedApiKey = Deno.env.get('VEHICLE_API_KEY')
    
    console.log(`[${timestamp}] API Key present: ${!!apiKey}`)
    console.log(`[${timestamp}] Expected API Key present: ${!!expectedApiKey}`)
    
    if (!apiKey || apiKey !== expectedApiKey) {
      console.log(`[${timestamp}] Unauthorized access attempt - invalid or missing API key`)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    let requestBody
    try {
      const bodyText = await req.text()
      console.log(`[${timestamp}] Raw request body:`, bodyText)
      requestBody = JSON.parse(bodyText)
      console.log(`[${timestamp}] Parsed request body:`, requestBody)
    } catch (error) {
      console.log(`[${timestamp}] Invalid JSON in request body:`, error)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON', 
          message: 'Request body must be valid JSON' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate required fields
    const { vehicle, brand, year, usage_type, quantity } = requestBody
    
    if (!vehicle || !brand || !usage_type) {
      console.log(`[${timestamp}] Missing required fields:`, { vehicle, brand, usage_type })
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          message: 'vehicle, brand, and usage_type are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate usage_type enum
    const validUsageTypes = ['particular', 'comercial', 'frota']
    if (!validUsageTypes.includes(usage_type)) {
      console.log(`[${timestamp}] Invalid usage_type:`, usage_type)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid usage_type', 
          message: 'usage_type must be one of: particular, comercial, frota' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate quantity if provided
    if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 1)) {
      console.log(`[${timestamp}] Invalid quantity:`, quantity)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid quantity', 
          message: 'quantity must be a positive integer' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`[${timestamp}] Processing vehicle data:`, { vehicle, brand, year, usage_type, quantity })

    // Store incoming vehicle data
    console.log(`[${timestamp}] Storing incoming vehicle data...`)
    const { data: incomingVehicle, error: insertError } = await supabase
      .from('incoming_vehicles')
      .insert({
        vehicle: vehicle.trim(),
        brand: brand.trim(),
        year: year || null,
        usage_type,
        quantity: quantity || 1,
        received_at: timestamp
      })
      .select()
      .single()

    if (insertError) {
      console.error(`[${timestamp}] Error storing incoming vehicle:`, insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to store vehicle data' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`[${timestamp}] Stored incoming vehicle with ID:`, incomingVehicle.id)

    // Check if vehicle exists
    const existingVehicle = await checkVehicleExists(supabase, brand, vehicle)
    
    let orderInfo = null
    let homologationInfo = null
    let processingNotes = ''

    if (existingVehicle) {
      console.log(`[${timestamp}] Vehicle exists, creating automatic order`)
      
      try {
        const orderNumber = await generateAutoOrderNumber(supabase)
        orderInfo = await createAutomaticOrder(supabase, { vehicle, brand, year, quantity: quantity || 1 }, orderNumber)
        processingNotes = `Vehicle found. Created automatic order: ${orderNumber} (quantity: ${quantity || 1})`
        
        // Update incoming vehicle record with order info
        await supabase
          .from('incoming_vehicles')
          .update({
            processed: true,
            created_order_id: orderInfo?.order_id,
            processing_notes: processingNotes
          })
          .eq('id', incomingVehicle.id)
          
      } catch (orderError) {
        console.error(`[${timestamp}] Error creating automatic order:`, orderError)
        processingNotes = `Vehicle found but failed to create automatic order: ${orderError.message}`
        
        await supabase
          .from('incoming_vehicles')
          .update({
            processed: true,
            processing_notes: processingNotes
          })
          .eq('id', incomingVehicle.id)
      }
    } else {
      console.log(`[${timestamp}] Vehicle not found, creating homologation card`)
      
      try {
        homologationInfo = await createHomologationCard(supabase, { vehicle, brand, year }, incomingVehicle.id)
        processingNotes = homologationInfo.created 
          ? `Vehicle not found. Created new homologation card linked to incoming vehicle. (quantity: ${quantity || 1})`
          : `Vehicle not found. Linked to existing homologation card. (quantity: ${quantity || 1})`
        
        // Update incoming vehicle record with homologation info
        await supabase
          .from('incoming_vehicles')
          .update({
            processed: true,
            created_homologation_id: homologationInfo.homologation_id,
            processing_notes: processingNotes
          })
          .eq('id', incomingVehicle.id)
          
      } catch (homologationError) {
        console.error(`[${timestamp}] Error creating homologation card:`, homologationError)
        processingNotes = `Vehicle not found and failed to create homologation card: ${homologationError.message}`
        
        await supabase
          .from('incoming_vehicles')
          .update({
            processed: true,
            processing_notes: processingNotes
          })
          .eq('id', incomingVehicle.id)
      }
    }

    // Prepare response
    const response = {
      success: true,
      message: 'Vehicle data received and processed successfully',
      incoming_vehicle_id: incomingVehicle.id,
      processing_notes: processingNotes,
      quantity: quantity || 1,
      workflow_status: existingVehicle ? 'order_created' : 'homologation_pending',
      ...(orderInfo && { automatic_order: orderInfo }),
      ...(homologationInfo && { homologation: homologationInfo })
    }

    console.log(`[${timestamp}] SUCCESS - Sending response:`, response)

    return new Response(
      JSON.stringify(response),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error(`[${timestamp}] UNEXPECTED ERROR:`, error)
    console.error(`[${timestamp}] Error stack:`, error.stack)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
