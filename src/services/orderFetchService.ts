
import { supabase } from '@/integrations/supabase/client'
import { Database } from '@/integrations/supabase/types'
import { Order } from './orderTypes'

type OrderRow = Database['public']['Tables']['pedidos']['Row']
type VehicleRow = Database['public']['Tables']['veiculos']['Row']
type TrackerRow = Database['public']['Tables']['rastreadores']['Row']

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
        quantity: veiculo.quantidade,
        year: veiculo.tipo // Using tipo field to store year temporarily
      })) || [],
      trackers: pedido.rastreadores?.map((rastreador: TrackerRow) => ({
        model: rastreador.modelo,
        quantity: rastreador.quantidade
      })) || [],
      configurationType: pedido.configuracao,
      status: pedido.status,
      createdAt: pedido.data || pedido.created_at,
      priority: 'medium' as const,
      isAutomatic: pedido.numero_pedido.startsWith('AUTO-'),
      shipment_recipient_id: pedido.shipment_recipient_id,
      shipment_address_street: pedido.shipment_address_street,
      shipment_address_number: pedido.shipment_address_number,
      shipment_address_neighborhood: pedido.shipment_address_neighborhood,
      shipment_address_city: pedido.shipment_address_city,
      shipment_address_state: pedido.shipment_address_state,
      shipment_address_postal_code: pedido.shipment_address_postal_code,
      shipment_address_complement: pedido.shipment_address_complement,
      shipment_prepared_at: pedido.shipment_prepared_at
    }))

    console.log('Transformed orders:', transformedOrders)
    return transformedOrders
  } catch (error) {
    console.error('Error in fetchOrders:', error)
    throw error
  }
}
