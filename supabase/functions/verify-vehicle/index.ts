
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
        usuario_id: 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf', // sergio.filho@segsat.com for system orders
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    // Initialize Supabase client with service role for system operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get JWT token from Authorization header
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      console.log('Missing Authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify JWT token
    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.log('Invalid JWT token:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse query parameters
    const url = new URL(req.url)
    const brand = url.searchParams.get('brand')
    const model = url.searchParams.get('model')
    const createOrder = url.searchParams.get('create_order') === 'true'

    // Validate required parameters
    if (!brand || !model) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters', 
          message: 'Both brand and model parameters are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Searching for vehicle: ${brand} ${model}`)

    // Search for vehicle in database
    const { data: vehicles, error } = await supabase
      .from('veiculos')
      .select('id, marca, modelo, quantidade, tipo, created_at')
      .ilike('marca', brand.trim())
      .ilike('modelo', model.trim())
      .limit(1)

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if vehicle was found
    if (!vehicles || vehicles.length === 0) {
      console.log(`Vehicle not found: ${brand} ${model}`)
      
      // Create homologation card for the missing vehicle
      try {
        // First check if a homologation card already exists for this brand/model
        const { data: existingCard } = await supabase
          .from('homologation_cards')
          .select('id')
          .eq('brand', brand.trim())
          .eq('model', model.trim())
          .limit(1)

        if (!existingCard || existingCard.length === 0) {
          // Create new homologation card
          const { data: newCard, error: cardError } = await supabase
            .from('homologation_cards')
            .insert({
              brand: brand.trim(),
              model: model.trim(),
              status: 'homologar',
              notes: `Automatically created from vehicle verification request on ${new Date().toISOString()}`
            })
            .select()

          if (cardError) {
            console.error('Error creating homologation card:', cardError)
          } else {
            console.log(`Created homologation card for ${brand} ${model}`)
          }
        } else {
          console.log(`Homologation card already exists for ${brand} ${model}`)
        }
      } catch (cardCreationError) {
        console.error('Error in homologation card creation process:', cardCreationError)
      }

      return new Response(
        JSON.stringify({ 
          error: 'Vehicle not found',
          message: `No vehicle found with brand "${brand}" and model "${model}"`
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const vehicle = vehicles[0]
    console.log(`Vehicle found: ${vehicle.marca} ${vehicle.modelo}`)

    let automaticOrderInfo = null

    // If createOrder is true, create an automatic order
    if (createOrder) {
      try {
        const orderNumber = await generateAutoOrderNumber(supabase)
        automaticOrderInfo = await createAutomaticOrder(supabase, vehicle, orderNumber)
        console.log('Automatic order created:', automaticOrderInfo)
      } catch (orderError) {
        console.error('Error creating automatic order:', orderError)
        // Don't fail the whole request if order creation fails
        automaticOrderInfo = { error: 'Failed to create automatic order' }
      }
    }

    // Return vehicle details with optional order information
    const response = {
      success: true,
      vehicle: {
        id: vehicle.id,
        brand: vehicle.marca,
        model: vehicle.modelo,
        quantity: vehicle.quantidade,
        type: vehicle.tipo,
        created_at: vehicle.created_at
      },
      ...(automaticOrderInfo && { automatic_order: automaticOrderInfo })
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
