import { supabase } from '@/integrations/supabase/client'
import { Database } from '@/integrations/supabase/types'

type OrderRow = Database['public']['Tables']['pedidos']['Row']
type VehicleRow = Database['public']['Tables']['veiculos']['Row']
type TrackerRow = Database['public']['Tables']['rastreadores']['Row']

export interface Order {
  id: string
  number: string
  vehicles: Array<{
    brand: string
    model: string
    quantity: number
  }>
  trackers: Array<{
    model: string
    quantity: number
  }>
  configurationType: string
  status: "novos" | "producao" | "aguardando" | "enviado" | "standby"
  priority?: "high" | "medium" | "low"
  createdAt: string
  estimatedDelivery?: string
}

export const fetchOrders = async (): Promise<Order[]> => {
  console.log('Fetching orders from Supabase...')
  
  try {
    const { data: pedidos, error: pedidosError } = await supabase
      .from('pedidos')
      .select(`
        *,
        veiculos(*),
        rastreadores(*)
      `)
      .order('created_at', { ascending: false })

    if (pedidosError) {
      console.error('Error fetching orders:', pedidosError)
      throw pedidosError
    }

    console.log('Raw orders data:', pedidos)

    if (!pedidos || pedidos.length === 0) {
      console.log('No orders found in database')
      return []
    }

    const transformedOrders = pedidos.map((pedido: any) => ({
      id: pedido.id,
      number: pedido.numero_pedido,
      vehicles: pedido.veiculos?.map((veiculo: VehicleRow) => ({
        brand: veiculo.marca,
        model: veiculo.modelo,
        quantity: veiculo.quantidade
      })) || [],
      trackers: pedido.rastreadores?.map((rastreador: TrackerRow) => ({
        model: rastreador.modelo,
        quantity: rastreador.quantidade
      })) || [],
      configurationType: pedido.configuracao,
      status: pedido.status,
      createdAt: pedido.data || pedido.created_at,
      priority: 'medium' as const // Explicitly cast to literal type
    }))

    console.log('Transformed orders:', transformedOrders)
    return transformedOrders
  } catch (error) {
    console.error('Error in fetchOrders:', error)
    throw error
  }
}

export const applyAutomationRules = async (vehicles: Array<{ brand: string, model: string, quantity: number }>) => {
  console.log('Applying automation rules for vehicles:', vehicles)
  
  const suggestedTrackers: Array<{ model: string, quantity: number }> = []
  let suggestedConfiguration = ''

  for (const vehicle of vehicles) {
    const { data: rules, error } = await supabase
      .from('regras_automacao')
      .select('*')
      .eq('modelo_veiculo', vehicle.model)
      .limit(1)

    if (error) {
      console.error('Error fetching automation rules:', error)
      continue
    }

    if (rules && rules.length > 0) {
      const rule = rules[0]
      
      // Add suggested tracker
      const existingTracker = suggestedTrackers.find(t => t.model === rule.modelo_rastreador)
      if (existingTracker) {
        existingTracker.quantity += rule.quantidade_default * vehicle.quantity
      } else {
        suggestedTrackers.push({
          model: rule.modelo_rastreador,
          quantity: rule.quantidade_default * vehicle.quantity
        })
      }

      // Set configuration (use the first rule's configuration)
      if (!suggestedConfiguration) {
        suggestedConfiguration = rule.configuracao
      }
    }
  }

  return {
    trackers: suggestedTrackers,
    configuration: suggestedConfiguration
  }
}

export const createOrder = async (orderData: {
  numero_pedido: string
  vehicles: Array<{ brand: string, model: string, quantity: number }>
  trackers: Array<{ model: string, quantity: number }>
  configurationType: string
}): Promise<Order> => {
  console.log('Creating order:', orderData)
  
  const { data: user } = await supabase.auth.getUser()
  
  if (!user.user) {
    throw new Error('User not authenticated')
  }

  // Create the order
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      usuario_id: user.user.id,
      numero_pedido: orderData.numero_pedido,
      configuracao: orderData.configurationType,
      status: 'novos',
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
      quantidade: vehicle.quantity
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

  // Return the created order
  return {
    id: pedido.id,
    number: pedido.numero_pedido,
    vehicles: orderData.vehicles,
    trackers: orderData.trackers,
    configurationType: pedido.configuracao,
    status: pedido.status,
    createdAt: pedido.data,
    priority: 'medium'
  }
}

export const updateOrderStatus = async (orderId: string, status: string) => {
  console.log('Updating order status:', orderId, status)
  
  const { error } = await supabase
    .from('pedidos')
    .update({ status: status as any })
    .eq('id', orderId)

  if (error) {
    console.error('Error updating order status:', error)
    throw error
  }
}
