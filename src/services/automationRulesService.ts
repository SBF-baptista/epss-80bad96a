
import { supabase } from '@/integrations/supabase/client'

export interface AutomationRule {
  id: number
  marca_veiculo: string
  modelo_veiculo: string
  ano_veiculo?: number
  tipo_veiculo?: string
  modelo_rastreador: string
  configuracao: string
  created_at: string
}

export interface CreateAutomationRuleData {
  marca_veiculo: string
  modelo_veiculo: string
  ano_veiculo?: number
  tipo_veiculo?: string
  modelo_rastreador: string
  configuracao: string
}

export const fetchAutomationRules = async (): Promise<AutomationRule[]> => {
  console.log('Fetching automation rules from Supabase...')
  
  const { data, error } = await supabase
    .from('regras_automacao')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching automation rules:', error)
    throw error
  }

  return data || []
}

export const createAutomationRule = async (ruleData: CreateAutomationRuleData): Promise<AutomationRule> => {
  console.log('Creating automation rule:', ruleData)
  
  const { data, error } = await supabase
    .from('regras_automacao')
    .insert(ruleData)
    .select()
    .single()

  if (error) {
    console.error('Error creating automation rule:', error)
    throw error
  }

  return data
}

export const updateAutomationRule = async (id: number, ruleData: Partial<CreateAutomationRuleData>): Promise<AutomationRule> => {
  console.log('Updating automation rule:', id, ruleData)
  
  const { data, error } = await supabase
    .from('regras_automacao')
    .update(ruleData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating automation rule:', error)
    throw error
  }

  return data
}

export const deleteAutomationRule = async (id: number): Promise<void> => {
  console.log('Deleting automation rule:', id)
  
  const { error } = await supabase
    .from('regras_automacao')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting automation rule:', error)
    throw error
  }
}
