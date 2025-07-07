// Function to find automation rule - standardized logic
export async function findAutomationRule(supabase: any, brand: string, model: string, year?: number) {
  console.log(`Looking for automation rule: ${brand} ${model} ${year || 'no year'}`)
  
  // Normalize inputs to match database format
  const normalizedBrand = brand.trim().toUpperCase()
  const normalizedModel = model.trim().toUpperCase()
  
  // First try to find exact match with year if provided
  if (year) {
    const { data, error } = await supabase
      .from('automation_rules_extended')
      .select('*')
      .eq('brand', normalizedBrand)
      .eq('model', normalizedModel)
      .eq('model_year', year.toString())
      .limit(1)

    if (error) {
      console.error('Error finding automation rule with year:', error)
    } else if (data && data.length > 0) {
      console.log('Found automation rule with year:', data[0])
      return data[0]
    }
  }

  // Try to find match without year constraint
  const { data, error } = await supabase
    .from('automation_rules_extended')
    .select('*')
    .eq('brand', normalizedBrand)
    .eq('model', normalizedModel)
    .limit(1)

  if (error) {
    console.error('Error finding automation rule:', error)
    return null
  }

  if (data && data.length > 0) {
    console.log('Found automation rule without year constraint:', data[0])
    return data[0]
  }

  console.log('No automation rule found')
  return null
}