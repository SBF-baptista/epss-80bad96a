// Function to check if automation rule exists for vehicle
export async function checkAutomationRuleExists(supabase: any, brand: string, model: string, year?: number) {
  console.log(`Checking if automation rule exists: ${brand} ${model} ${year || 'no year'}`)
  
  // First try to find exact match with year if provided
  if (year) {
    const { data: rules, error } = await supabase
      .from('automation_rules_extended')
      .select('*')
      .eq('brand', brand.trim().toUpperCase())
      .eq('model', model.trim().toUpperCase())
      .eq('model_year', year.toString())
      .limit(1)

    if (error) {
      console.error('Database error checking automation rule with year:', error)
      throw error
    }

    if (rules && rules.length > 0) {
      console.log(`Automation rule exists with year: ${rules[0].id}`)
      return rules[0]
    }
  }

  // Try to find match without year
  const { data: rules, error } = await supabase
    .from('automation_rules_extended')
    .select('*')
    .eq('brand', brand.trim().toUpperCase())
    .eq('model', model.trim().toUpperCase())
    .limit(1)

  if (error) {
    console.error('Database error checking automation rule:', error)
    throw error
  }

  const exists = rules && rules.length > 0
  console.log(`Automation rule exists check result: ${exists}`)
  return exists ? rules[0] : null
}