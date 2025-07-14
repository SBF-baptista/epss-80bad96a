
import { supabase } from '@/integrations/supabase/client'
import { Order } from './orderTypes'
import { generateOrderNumber } from './orderUtils'
import { applyAutomationRules } from './orderAutomationService'

export const createOrder = async (orderData: {
  numero_pedido?: string
  vehicles: Array<{ brand: string, model: string, quantity: number, year?: string }>
  trackers: Array<{ model: string, quantity: number }>
  accessories?: Array<{ name: string, quantity: number }>
  configurationType: string
}): Promise<Order> => {
  console.log('Creating order:', orderData)
  
  const { data: user } = await supabase.auth.getUser()
  
  if (!user.user) {
    throw new Error('User not authenticated')
  }

  // Generate order number if not provided
  const orderNumber = orderData.numero_pedido || await generateOrderNumber()

  // Create the order
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      usuario_id: user.user.id,
      numero_pedido: orderNumber,
      configuracao: orderData.configurationType,
      status: 'novos', // Changed default status to match original flow
      data: new Date().toISOString()
    })
    .select()
    .single()

  if (pedidoError) {
    console.error('Error creating order:', pedidoError)
    throw pedidoError
  }

  // Create vehicles
  if (orderData.vehicles.length > 0) {
    const vehicleInserts = orderData.vehicles.map(vehicle => ({
      pedido_id: pedido.id,
      marca: vehicle.brand,
      modelo: vehicle.model,
      quantidade: vehicle.quantity,
      tipo: vehicle.year || null // Store year in tipo field temporarily
    }))

    const { error: vehicleError } = await supabase
      .from('veiculos')
      .insert(vehicleInserts)

    if (vehicleError) {
      console.error('Error creating vehicles:', vehicleError)
      throw vehicleError
    }
  }

  // Create trackers
  if (orderData.trackers.length > 0) {
    const trackerInserts = orderData.trackers.map(tracker => ({
      pedido_id: pedido.id,
      modelo: tracker.model,
      quantidade: tracker.quantity
    }))

    const { error: trackerError } = await supabase
      .from('rastreadores')
      .insert(trackerInserts)

    if (trackerError) {
      console.error('Error creating trackers:', trackerError)
      throw trackerError
    }
  }

  // Create accessories
  if (orderData.accessories && orderData.accessories.length > 0) {
    const accessoryInserts = orderData.accessories.map(accessory => ({
      pedido_id: pedido.id,
      accessory_name: accessory.name,
      quantity: accessory.quantity,
      received_at: new Date().toISOString()
    }))

    const { error: accessoryError } = await supabase
      .from('accessories')
      .insert(accessoryInserts)

    if (accessoryError) {
      console.error('Error creating accessories:', accessoryError)
      throw accessoryError
    }
  }

  return {
    id: pedido.id,
    number: pedido.numero_pedido,
    vehicles: orderData.vehicles,
    trackers: orderData.trackers,
    accessories: orderData.accessories || [],
    configurationType: pedido.configuracao,
    status: pedido.status,
    createdAt: pedido.data,
    priority: 'medium',
    isAutomatic: pedido.numero_pedido.startsWith('AUTO-')
  }
}
