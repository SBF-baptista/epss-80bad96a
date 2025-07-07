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
        usuario_id: null // System-generated order
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