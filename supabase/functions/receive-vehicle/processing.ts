import { GroupResult, ProcessingResult, VehicleGroup } from './shared.ts'
import { checkVehicleExists } from './vehicle-services.ts'
import { generateAutoOrderNumber, createAutomaticOrder } from './order-services.ts'
import { createHomologationCard } from './homologation-services.ts'

export async function processVehicleGroups(
  supabase: any, 
  requestBody: VehicleGroup[], 
  timestamp: string
): Promise<{ processedGroups: GroupResult[], totalVehiclesProcessed: number }> {
  console.log(`[${timestamp}] Processing ${requestBody.length} vehicle groups...`)

  const processedGroups: GroupResult[] = []
  let totalVehiclesProcessed = 0

  // Process each vehicle group
  for (let groupIndex = 0; groupIndex < requestBody.length; groupIndex++) {
    const group = requestBody[groupIndex]
    console.log(`[${timestamp}] Processing group ${groupIndex + 1}/${requestBody.length}: ${group.company_name} - ${group.usage_type}`)
    
    const groupResult: GroupResult = {
      group_index: groupIndex,
      company_name: group.company_name,
      usage_type: group.usage_type,
      vehicles_processed: [],
      total_vehicles: group.vehicles.length,
      processing_summary: {
        orders_created: 0,
        homologations_created: 0,
        errors: 0
      }
    }

    // Process each vehicle in the group
    for (let vehicleIndex = 0; vehicleIndex < group.vehicles.length; vehicleIndex++) {
      const vehicleData = group.vehicles[vehicleIndex]
      const { vehicle, brand, year, quantity } = vehicleData
      
      console.log(`[${timestamp}] Processing vehicle ${vehicleIndex + 1}/${group.vehicles.length} in group ${groupIndex + 1}: ${brand} ${vehicle}`)
      
      try {
        // Store incoming vehicle data
        const { data: incomingVehicle, error: insertError } = await supabase
          .from('incoming_vehicles')
          .insert({
            vehicle: vehicle.trim(),
            brand: brand.trim(),
            year: year || null,
            usage_type: group.usage_type,
            quantity: quantity || 1,
            received_at: timestamp
          })
          .select()
          .single()

        if (insertError) {
          console.error(`[${timestamp}] Error storing incoming vehicle:`, insertError)
          groupResult.vehicles_processed.push({
            vehicle: `${brand} ${vehicle}`,
            status: 'error',
            error: 'Failed to store vehicle data',
            quantity: quantity || 1,
            incoming_vehicle_id: ''
          })
          groupResult.processing_summary.errors++
          continue
        }

        console.log(`[${timestamp}] Stored incoming vehicle with ID:`, incomingVehicle.id)

        // Check if vehicle exists
        const existingVehicle = await checkVehicleExists(supabase, brand, vehicle)
        
        let processingNotes = ''
        let vehicleResult: ProcessingResult = {
          vehicle: `${brand} ${vehicle}`,
          quantity: quantity || 1,
          incoming_vehicle_id: incomingVehicle.id
        }

        if (existingVehicle) {
          console.log(`[${timestamp}] Vehicle exists, creating automatic order`)
          
          try {
            const orderNumber = await generateAutoOrderNumber(supabase)
            const orderInfo = await createAutomaticOrder(supabase, { vehicle, brand, year, quantity: quantity || 1 }, orderNumber)
            processingNotes = `Vehicle found. Created automatic order: ${orderNumber} (quantity: ${quantity || 1})`
            
            // Update incoming vehicle record with order info
            await supabase
              .from('incoming_vehicles')
              .update({
                processed: true,
                created_order_id: orderInfo?.order_id,
                processing_notes: processingNotes
              })
              .eq('id', incomingVehicle.id)

            vehicleResult.status = 'order_created'
            vehicleResult.order_number = orderNumber
            vehicleResult.order_id = orderInfo?.order_id
            groupResult.processing_summary.orders_created++
              
          } catch (orderError: any) {
            console.error(`[${timestamp}] Error creating automatic order:`, orderError)
            processingNotes = `Vehicle found but failed to create automatic order: ${orderError.message}`
            
            await supabase
              .from('incoming_vehicles')
              .update({
                processed: true,
                processing_notes: processingNotes
              })
              .eq('id', incomingVehicle.id)

            vehicleResult.status = 'error'
            vehicleResult.error = orderError.message
            groupResult.processing_summary.errors++
          }
        } else {
          console.log(`[${timestamp}] Vehicle not found, creating homologation card`)
          
          try {
            const homologationInfo = await createHomologationCard(supabase, { vehicle, brand, year }, incomingVehicle.id)
            processingNotes = homologationInfo.created 
              ? `Vehicle not found. Created new homologation card linked to incoming vehicle. (quantity: ${quantity || 1})`
              : `Vehicle not found. Linked to existing homologation card. (quantity: ${quantity || 1})`
            
            // Update incoming vehicle record with homologation info
            await supabase
              .from('incoming_vehicles')
              .update({
                processed: true,
                created_homologation_id: homologationInfo.homologation_id,
                processing_notes: processingNotes
              })
              .eq('id', incomingVehicle.id)

            vehicleResult.status = 'homologation_pending'
            vehicleResult.homologation_id = homologationInfo.homologation_id
            vehicleResult.homologation_created = homologationInfo.created
            if (homologationInfo.created) {
              groupResult.processing_summary.homologations_created++
            }
              
          } catch (homologationError: any) {
            console.error(`[${timestamp}] Error creating homologation card:`, homologationError)
            processingNotes = `Vehicle not found and failed to create homologation card: ${homologationError.message}`
            
            await supabase
              .from('incoming_vehicles')
              .update({
                processed: true,
                processing_notes: processingNotes
              })
              .eq('id', incomingVehicle.id)

            vehicleResult.status = 'error'
            vehicleResult.error = homologationError.message
            groupResult.processing_summary.errors++
          }
        }

        vehicleResult.processing_notes = processingNotes
        groupResult.vehicles_processed.push(vehicleResult)
        totalVehiclesProcessed++

      } catch (error: any) {
        console.error(`[${timestamp}] Unexpected error processing vehicle:`, error)
        groupResult.vehicles_processed.push({
          vehicle: `${brand} ${vehicle}`,
          status: 'error',
          error: error.message,
          quantity: quantity || 1,
          incoming_vehicle_id: ''
        })
        groupResult.processing_summary.errors++
      }
    }

    processedGroups.push(groupResult)
    console.log(`[${timestamp}] Completed processing group ${groupIndex + 1}: ${groupResult.processing_summary.orders_created} orders, ${groupResult.processing_summary.homologations_created} homologations, ${groupResult.processing_summary.errors} errors`)
  }

  return { processedGroups, totalVehiclesProcessed }
}