// Helper function to create kit schedule for homologated vehicles
async function createKitScheduleForHomologation(supabase: any, homologationCard: any, incomingVehicleId: string) {
  console.log(`Creating kit schedule for homologated vehicle: ${homologationCard.brand} ${homologationCard.model}`)
  
  try {
    // Get incoming vehicle data
    const { data: incomingVehicle } = await supabase
      .from('incoming_vehicles')
      .select('*')
      .eq('id', incomingVehicleId)
      .single()

    if (!incomingVehicle || !incomingVehicle.sale_summary_id) {
      console.log('No Segsale data found, skipping kit schedule creation')
      return
    }

    // Get accessories for this vehicle
    const { data: accessoriesData } = await supabase
      .from('accessories')
      .select('accessory_name, quantity')
      .eq('company_name', incomingVehicle.company_name)
      .gte('received_at', new Date(new Date(incomingVehicle.received_at).getTime() - 24*60*60*1000).toISOString())
      .lte('received_at', new Date(new Date(incomingVehicle.received_at).getTime() + 24*60*60*1000).toISOString())

    const accessoriesList = accessoriesData?.map(a => `${a.accessory_name} (qty: ${a.quantity})`) || []

    // Get default kit
    let kitId = null
    const { data: cardKits } = await supabase
      .from('homologation_kits')
      .select('id')
      .eq('homologation_card_id', homologationCard.id)
      .limit(1)

    if (cardKits && cardKits.length > 0) {
      kitId = cardKits[0].id
    } else {
      const { data: defaultKit } = await supabase
        .from('homologation_kits')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (defaultKit && defaultKit.length > 0) {
        kitId = defaultKit[0].id
      }
    }

    // Get default technician
    const { data: defaultTechnician } = await supabase
      .from('technicians')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)

    if (!kitId || !defaultTechnician || defaultTechnician.length === 0) {
      console.log('Missing kit or technician for schedule creation')
      return
    }

    // Check or create customer
    let customerId = null
    const docNumber = incomingVehicle.cpf?.replace(/[.\-\/]/g, '') || `NO_CPF_${incomingVehicle.company_name?.toUpperCase().replace(/\s+/g, '_')}_${homologationCard.id}`
    
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('document_number', docNumber)
      .limit(1)

    if (existingCustomer && existingCustomer.length > 0) {
      customerId = existingCustomer[0].id
    } else {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          name: incomingVehicle.company_name || 'Cliente não identificado',
          document_number: docNumber,
          document_type: docNumber.length === 14 && !docNumber.startsWith('NO_CPF_') ? 'cnpj' : 'cpf',
          phone: incomingVehicle.phone || 'Não informado',
          email: `${(incomingVehicle.company_name || 'cliente').toLowerCase().replace(/\s+/g, '')}@email.com`,
          address_street: incomingVehicle.address_street || 'Não informado',
          address_number: incomingVehicle.address_number || 'S/N',
          address_neighborhood: incomingVehicle.address_district || 'Não informado',
          address_city: incomingVehicle.address_city || 'Não informado',
          address_state: 'SP',
          address_postal_code: incomingVehicle.address_zip_code || '00000-000',
          address_complement: incomingVehicle.address_complement,
          company_name: incomingVehicle.company_name,
          sale_summary_id: incomingVehicle.sale_summary_id,
          vehicles: [{
            brand: homologationCard.brand,
            model: homologationCard.model,
            year: incomingVehicle.year || homologationCard.year || 2024,
            plate: 'Placa pendente',
            scheduled: false
          }]
        })
        .select('id')
        .single()

      if (newCustomer) {
        customerId = newCustomer.id
      }
    }

    if (!customerId) {
      console.log('Failed to get or create customer')
      return
    }

    // Create kit schedule
    const scheduledDate = new Date()
    scheduledDate.setDate(scheduledDate.getDate() + 7)

    const { error: scheduleError } = await supabase
      .from('kit_schedules')
      .insert({
        kit_id: kitId,
        technician_id: defaultTechnician[0].id,
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        status: 'scheduled',
        customer_id: customerId,
        customer_name: incomingVehicle.company_name || 'Cliente não identificado',
        customer_document_number: incomingVehicle.cpf || 'Não informado',
        customer_phone: incomingVehicle.phone || 'Não informado',
        customer_email: `${(incomingVehicle.company_name || 'cliente').toLowerCase().replace(/\s+/g, '')}@email.com`,
        installation_address_street: incomingVehicle.address_street || 'Não informado',
        installation_address_number: incomingVehicle.address_number || 'S/N',
        installation_address_neighborhood: incomingVehicle.address_district || 'Não informado',
        installation_address_city: incomingVehicle.address_city || 'Não informado',
        installation_address_state: 'SP',
        installation_address_postal_code: incomingVehicle.address_zip_code || '00000-000',
        installation_address_complement: incomingVehicle.address_complement,
        vehicle_brand: homologationCard.brand,
        vehicle_model: homologationCard.model,
        vehicle_year: incomingVehicle.year || homologationCard.year,
        vehicle_plate: 'Placa pendente',
        accessories: accessoriesList,
        notes: `Agendamento automático Segsale #${incomingVehicle.sale_summary_id} - ${homologationCard.brand} ${homologationCard.model}`
      })

    if (scheduleError) {
      console.error('Error creating kit schedule:', scheduleError)
    } else {
      console.log('Successfully created kit schedule for homologated vehicle')
    }
  } catch (error) {
    console.error('Error in createKitScheduleForHomologation:', error)
  }
}

// Function to create homologation card
export async function createHomologationCard(supabase: any, vehicleData: any, incomingVehicleId: string) {
  console.log(`Creating homologation card for vehicle: ${vehicleData.brand} ${vehicleData.vehicle}`)
  
  try {
    // Normalize brand and model to uppercase for consistent comparison
    const BRAND = vehicleData.brand?.trim().toUpperCase()
    const MODEL = vehicleData.vehicle?.trim().toUpperCase()
    
    const { data: existingCard } = await supabase
      .from('homologation_cards')
      .select('id, status, brand, model, year')
      .eq('brand', BRAND)
      .eq('model', MODEL)
      .limit(1)
      .single()

    // Always create a new card per incoming_vehicle
    // If an existing card is found, inherit its status
    const inheritedStatus = existingCard ? existingCard.status : 'homologar'
    const notes = existingCard 
      ? `Status inherited from existing homologation (${inheritedStatus}). Original card: ${existingCard.id}. Created on ${new Date().toISOString()}`
      : `Automatically created from vehicle data received on ${new Date().toISOString()}`

    console.log(existingCard 
      ? `Found existing homologation for ${vehicleData.brand} ${vehicleData.vehicle} with status: ${existingCard.status}. Creating NEW card with inherited status.`
      : `No existing homologation found for ${vehicleData.brand} ${vehicleData.vehicle}. Creating new card with status 'homologar'.`)

    const { data: newCard, error: cardError } = await supabase
      .from('homologation_cards')
      .insert({
        brand: BRAND,
        model: MODEL,
        year: vehicleData.year || existingCard?.year || null,
        status: inheritedStatus,
        incoming_vehicle_id: incomingVehicleId,
        notes: notes
      })
      .select()
      .single()

    if (cardError) {
      console.error('Error creating homologation card:', cardError)
      throw cardError
    }

    console.log(`Created new homologation card with status '${inheritedStatus}' for ${vehicleData.brand} ${vehicleData.vehicle}`)
    
    // If the inherited status is 'homologado', the trigger will automatically create customer + kit_schedule
    return { 
      homologation_id: newCard.id, 
      created: true, 
      already_homologated: inheritedStatus === 'homologado',
      inherited_status: existingCard ? inheritedStatus : undefined
    }

  } catch (error) {
    console.error('Error in createHomologationCard:', error)
    throw error
  }
}