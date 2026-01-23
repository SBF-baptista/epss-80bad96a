import { supabase } from '@/integrations/supabase/client'

export type UserRole = 
  | 'admin' 
  | 'gestor' 
  | 'operador' 
  | 'visualizador'

export const assignUserRole = async (userId: string, role: UserRole) => {
  const { data, error } = await supabase
    .from('user_roles')
    .upsert(
      { user_id: userId, role },
      { onConflict: 'user_id,role' }
    )
    .select()

  if (error) {
    throw new Error(`Failed to assign role: ${error.message}`)
  }

  return data
}

export const getUserRole = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to get user role: ${error.message}`)
  }

  return data?.role || null
}

export const removeUserRole = async (userId: string, role: UserRole) => {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role)

  if (error) {
    throw new Error(`Failed to remove role: ${error.message}`)
  }
}
