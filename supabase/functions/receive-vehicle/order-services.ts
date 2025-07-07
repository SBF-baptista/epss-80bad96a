import { findAutomationRule } from './automation-services.ts'

// Function to generate automatic order number
export async function generateAutoOrderNumber(supabase: any): Promise<string> {
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

// Function to create automatic order
export async function createAutomaticOrder(supabase: any, vehicleData: any, orderNumber: string) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] Creating automatic order for vehicle: ${vehicleData.brand} ${vehicleData.vehicle}`)
  console.log(`[${timestamp}] Vehicle data:`, JSON.stringify(vehicleData, null, 2))
  console.log(`[${timestamp}] Order number: ${orderNumber}`)
  
  try {
    console.log(`[${timestamp}] Looking for automation rule...`)
    const automationRule = await findAutomationRule(supabase, vehicleData.brand, vehicleData.vehicle, vehicleData.year)
    
    if (!automationRule) {
      console.log(`[${timestamp}] No automation rule found for ${vehicleData.brand} ${vehicleData.vehicle}, skipping automatic order creation`)
      return null
    }

    console.log(`[${timestamp}] Found automation rule:`, JSON.stringify(automationRule, null, 2))

    console.log(`[${timestamp}] Creating order in pedidos table...`)
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        numero_pedido: orderNumber,
        configuracao: automationRule.configuration,
        status: 'novos',
        data: new Date().toISOString(),
        usuario_id: 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf' // sergio.filho@segsat.com
      })
      .select()
      .single()

    if (pedidoError) {
      console.error(`[${timestamp}] Error creating automatic order:`, pedidoError)
      console.error(`[${timestamp}] Error details - code: ${pedidoError.code}, message: ${pedidoError.message}`)
      if (pedidoError.details) {
        console.error(`[${timestamp}] Error details: ${pedidoError.details}`)
      }
      if (pedidoError.hint) {
        console.error(`[${timestamp}] Error hint: ${pedidoError.hint}`)
      }
      throw pedidoError
    }

    console.log(`[${timestamp}] Successfully created order with ID: ${pedido.id}`)
    console.log(`[${timestamp}] Order details:`, JSON.stringify(pedido, null, 2))

    console.log(`[${timestamp}] Creating vehicle record...`)
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
      console.error(`[${timestamp}] Error creating vehicle for automatic order:`, vehicleError)
      throw vehicleError
    }

    console.log(`[${timestamp}] Successfully created vehicle record`)

    console.log(`[${timestamp}] Creating tracker record...`)
    const { error: trackerError } = await supabase
      .from('rastreadores')
      .insert({
        pedido_id: pedido.id,
        modelo: automationRule.tracker_model,
        quantidade: vehicleData.quantity || 1
      })

    if (trackerError) {
      console.error(`[${timestamp}] Error creating tracker for automatic order:`, trackerError)
      throw trackerError
    }

    console.log(`[${timestamp}] Successfully created tracker record`)
    console.log(`[${timestamp}] ✅ COMPLETE: Successfully created automatic order ${orderNumber} for ${vehicleData.brand} ${vehicleData.vehicle} (quantity: ${vehicleData.quantity || 1})`)
    
    return {
      order_id: pedido.id,
      order_number: orderNumber,
      tracker_model: automationRule.tracker_model,
      configuration: automationRule.configuration,
      quantity: vehicleData.quantity || 1
    }

  } catch (error) {
    console.error(`[${timestamp}] ❌ ERROR in createAutomaticOrder:`, error)
    console.error(`[${timestamp}] Error stack:`, error.stack)
    throw error
  }
}