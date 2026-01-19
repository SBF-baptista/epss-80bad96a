
import { supabase } from '@/integrations/supabase/client'
import { logCreate, logUpdate, logDelete } from './logService'

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

  // Registrar log
  await logCreate(
    "Regras de Automação",
    `regra "${ruleData.brand} ${ruleData.model}" (${ruleData.configuration})`,
    data.id.toString()
  )

  return data
}

export const updateAutomationRule = async (id: number, ruleData: Partial<CreateAutomationRuleData>): Promise<AutomationRule> => {
  console.log('Updating automation rule:', id, ruleData)
  
  const { data, error } = await supabase
    .from('automation_rules_extended')
    .update(ruleData)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) {
    console.error('Error updating automation rule:', error)
    throw error
  }

  if (!data) {
    throw new Error(`Automation rule with id ${id} not found`)
  }

  // Registrar log
  await logUpdate(
    "Regras de Automação",
    "regra de automação",
    id.toString(),
    Object.keys(ruleData).join(", ")
  )

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

  // Registrar log
  await logDelete(
    "Regras de Automação",
    "regra de automação",
    id.toString()
  )
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

// Photo management functions
export interface AutomationRulePhoto {
  id: string
  automation_rule_id: number
  file_name: string
  file_path: string
  file_size?: number
  content_type?: string
  uploaded_by?: string
  created_at: string
}

export const fetchAutomationRulePhotos = async (ruleId: number): Promise<AutomationRulePhoto[]> => {
  console.log('Fetching photos for automation rule:', ruleId)
  
  const { data, error } = await supabase
    .from('automation_rule_photos')
    .select('*')
    .eq('automation_rule_id', ruleId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching automation rule photos:', error)
    throw error
  }

  return data || []
}

export const uploadAutomationRulePhoto = async (
  ruleId: number,
  file: File
): Promise<AutomationRulePhoto> => {
  console.log('Uploading photo for automation rule:', ruleId)
  
  const fileExt = file.name.split('.').pop()
  const fileName = `${ruleId}_${Date.now()}.${fileExt}`
  const filePath = `${ruleId}/${fileName}`

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from('automation-rule-photos')
    .upload(filePath, file)

  if (uploadError) {
    console.error('Error uploading file:', uploadError)
    throw uploadError
  }

  // Create database record
  const { data, error } = await supabase
    .from('automation_rule_photos')
    .insert({
      automation_rule_id: ruleId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      content_type: file.type,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating photo record:', error)
    throw error
  }

  return data
}

export const deleteAutomationRulePhoto = async (photoId: string, filePath: string): Promise<void> => {
  console.log('Deleting automation rule photo:', photoId)
  
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('automation-rule-photos')
    .remove([filePath])

  if (storageError) {
    console.error('Error deleting file from storage:', storageError)
  }

  // Delete from database
  const { error } = await supabase
    .from('automation_rule_photos')
    .delete()
    .eq('id', photoId)

  if (error) {
    console.error('Error deleting photo record:', error)
    throw error
  }
}

export const getAutomationRulePhotoUrl = (filePath: string): string => {
  const { data } = supabase.storage
    .from('automation-rule-photos')
    .getPublicUrl(filePath)
  
  return data.publicUrl
}
