// Function to check if vehicle exists
export async function checkVehicleExists(supabase: any, brand: string, model: string) {
  console.log(`Checking if vehicle exists: ${brand} ${model}`)
  
  const { data: vehicles, error } = await supabase
    .from('veiculos')
    .select('id, marca, modelo, quantidade, tipo, created_at')
    .ilike('marca', brand.trim())
    .ilike('modelo', model.trim())
    .limit(1)

  if (error) {
    console.error('Database error checking vehicle:', error)
    throw error
  }

  const exists = vehicles && vehicles.length > 0
  console.log(`Vehicle exists check result: ${exists}`)
  return exists ? vehicles[0] : null
}