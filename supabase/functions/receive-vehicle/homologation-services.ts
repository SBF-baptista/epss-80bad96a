// Function to create homologation card
export async function createHomologationCard(supabase: any, vehicleData: any, incomingVehicleId: string) {
  console.log(`Creating homologation card for vehicle: ${vehicleData.brand} ${vehicleData.vehicle}`)
  
  try {
    const { data: existingCard } = await supabase
      .from('homologation_cards')
      .select('id')
      .eq('brand', vehicleData.brand)
      .eq('model', vehicleData.vehicle)
      .limit(1)

    if (existingCard && existingCard.length > 0) {
      console.log(`Homologation card already exists for ${vehicleData.brand} ${vehicleData.vehicle}`)
      
      // Link existing card to incoming vehicle if not already linked
      const { error: updateError } = await supabase
        .from('homologation_cards')
        .update({ incoming_vehicle_id: incomingVehicleId })
        .eq('id', existingCard[0].id)
        .is('incoming_vehicle_id', null)

      if (updateError) {
        console.error('Error linking existing homologation card:', updateError)
      }

      return { homologation_id: existingCard[0].id, created: false }
    }

    const { data: newCard, error: cardError } = await supabase
      .from('homologation_cards')
      .insert({
        brand: vehicleData.brand,
        model: vehicleData.vehicle,
        year: vehicleData.year || null,
        status: 'homologar',
        incoming_vehicle_id: incomingVehicleId,
        notes: `Automatically created from vehicle data received on ${new Date().toISOString()}`
      })
      .select()
      .single()

    if (cardError) {
      console.error('Error creating homologation card:', cardError)
      throw cardError
    }

    console.log(`Created homologation card for ${vehicleData.brand} ${vehicleData.vehicle}`)
    return { homologation_id: newCard.id, created: true }

  } catch (error) {
    console.error('Error in createHomologationCard:', error)
    throw error
  }
}