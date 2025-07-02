
import { supabase } from '@/integrations/supabase/client'

export interface AutomationRule {
  id: number
  category: string
  brand: string
  model: string
  model_year?: string
  tracker_model: string
  configuration: string
  notes?: string
  created_at: string
}

export interface CreateAutomationRuleData {
  category: string
  brand: string
  model: string
  model_year?: string
  tracker_model: string
  configuration: string
  notes?: string
}

export const fetchAutomationRules = async (): Promise<AutomationRule[]> => {
  console.log('Fetching automation rules from Supabase...')
  
  const { data, error } = await supabase
    .from('automation_rules_extended')
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
    .from('automation_rules_extended')
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
    .from('automation_rules_extended')
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
    .from('automation_rules_extended')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting automation rule:', error)
    throw error
  }
}

export const findAutomationRule = async (brand: string, model: string, modelYear?: string): Promise<AutomationRule | null> => {
  console.log('Finding automation rule for:', { brand, model, modelYear })
  
  // First try to find exact match with year
  if (modelYear) {
    const { data, error } = await supabase
      .from('automation_rules_extended')
      .select('*')
      .eq('brand', brand.toUpperCase())
      .eq('model', model.toUpperCase())
      .eq('model_year', modelYear)
      .limit(1)

    if (error) {
      console.error('Error finding automation rule:', error)
      return null
    }

    if (data && data.length > 0) {
      return data[0]
    }
  }

  // If no exact match, try without year
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

  return data && data.length > 0 ? data[0] : null
}
