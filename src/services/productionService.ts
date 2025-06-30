
import { supabase } from '@/integrations/supabase/client'

export interface ProductionItem {
  id: string
  pedido_id: string
  imei: string
  production_line_code: string
  scanned_at: string
  created_by?: string
}

export const addProductionItem = async (
  pedidoId: string, 
  imei: string, 
  productionLineCode: string
): Promise<ProductionItem> => {
  console.log('Adding production item:', { pedidoId, imei, productionLineCode })
  
  const { data: user } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('production_items')
    .insert({
      pedido_id: pedidoId,
      imei: imei,
      production_line_code: productionLineCode,
      created_by: user.user?.id
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding production item:', error)
    throw error
  }

  return data
}

export const getProductionItems = async (pedidoId: string): Promise<ProductionItem[]> => {
  const { data, error } = await supabase
    .from('production_items')
    .select('*')
    .eq('pedido_id', pedidoId)
    .order('scanned_at', { ascending: false })

  if (error) {
    console.error('Error fetching production items:', error)
    throw error
  }

  return data || []
}

export const updateProductionStatus = async (
  pedidoId: string, 
  status: 'started' | 'completed',
  notes?: string
) => {
  console.log('Updating production status:', { pedidoId, status, notes })
  
  const updates: any = {}
  
  if (status === 'started') {
    updates.production_started_at = new Date().toISOString()
  } else if (status === 'completed') {
    updates.production_completed_at = new Date().toISOString()
  }
  
  if (notes) {
    updates.production_notes = notes
  }

  const { error } = await supabase
    .from('pedidos')
    .update(updates)
    .eq('id', pedidoId)

  if (error) {
    console.error('Error updating production status:', error)
    throw error
  }
}
