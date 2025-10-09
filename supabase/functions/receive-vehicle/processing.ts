import { GroupResult, ProcessingResult, VehicleGroup } from './shared.ts'
import { checkAutomationRuleExists } from './vehicle-services.ts'
import { generateAutoOrderNumber, createAutomaticOrder } from './order-services.ts'
import { createHomologationCard } from './homologation-services.ts'

export async function processVehicleGroups(
  supabase: any, 
  requestBody: VehicleGroup[], 
  timestamp: string,
  requestId: string
): Promise<{ processedGroups: GroupResult[], totalVehiclesProcessed: number }> {
  console.log(`[${timestamp}][${requestId}] ===== PROCESSING START =====`)
  console.log(`[${timestamp}][${requestId}] Processing ${requestBody.length} vehicle groups...`)

  const processedGroups: GroupResult[] = []
  let totalVehiclesProcessed = 0

  // Process each vehicle group
  for (let groupIndex = 0; groupIndex < requestBody.length; groupIndex++) {
    const group = requestBody[groupIndex]
    console.log(`[${timestamp}][${requestId}] ===== GROUP ${groupIndex + 1}/${requestBody.length} START =====`)
    console.log(`[${timestamp}][${requestId}] Group details: ${group.company_name} - ${group.usage_type} (${group.vehicles.length} vehicles)`)
    
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

    // Collect accessories for this group (will be inserted once per group, not per vehicle)
    const groupAccessories = group.accessories || []
    let groupAccessoriesProcessed = false

    // Process each vehicle in the group
    for (let vehicleIndex = 0; vehicleIndex < group.vehicles.length; vehicleIndex++) {
      const vehicleData = group.vehicles[vehicleIndex]
      const { vehicle, brand, year, quantity } = vehicleData
      
      console.log(`[${timestamp}][${requestId}] --- Processing vehicle ${vehicleIndex + 1}/${group.vehicles.length} in group ${groupIndex + 1} ---`)
      console.log(`[${timestamp}][${requestId}] Vehicle: ${brand} ${vehicle} (year: ${year || 'N/A'}, quantity: ${quantity || 1})`)
      
      try {
        // Store incoming vehicle data
        console.log(`[${timestamp}][${requestId}] Storing incoming vehicle data...`)
        
        // Normalize usage_type to database enum format
        let normalizedUsageType = group.usage_type.toLowerCase()
        if (normalizedUsageType === 'telemetria gps') normalizedUsageType = 'telemetria_gps'
        if (normalizedUsageType === 'telemetria can') normalizedUsageType = 'telemetria_can'
        if (normalizedUsageType === 'copiloto 2 cameras') normalizedUsageType = 'copiloto_2_cameras'
        if (normalizedUsageType === 'copiloto 4 cameras') normalizedUsageType = 'copiloto_4_cameras'
        
        const { data: incomingVehicle, error: insertError } = await supabase
          .from('incoming_vehicles')
          .insert({
            vehicle: vehicle.trim(),
            brand: brand.trim(),
            year: year || null,
            usage_type: normalizedUsageType,
            quantity: quantity || 1,
            company_name: group.company_name,
            cpf: group.cpf || null,
            phone: group.phone || null,
            sale_summary_id: group.sale_summary_id || null,
            pending_contract_id: group.pending_contract_id || null,
            address_city: group.address?.city || null,
            address_district: group.address?.district || null,
            address_street: group.address?.street || null,
            address_number: group.address?.number || null,
            address_zip_code: group.address?.zip_code || null,
            address_complement: group.address?.complement || null,
            received_at: timestamp
          })
          .select()
          .single()

        if (insertError) {
          console.error(`[${timestamp}][${requestId}] ERROR - Failed to store incoming vehicle:`, insertError)
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

        console.log(`[${timestamp}][${requestId}] Successfully stored incoming vehicle with ID: ${incomingVehicle.id}`)

        // Process vehicle-specific accessories if they exist
        if (vehicleData.accessories && Array.isArray(vehicleData.accessories) && vehicleData.accessories.length > 0) {
          console.log(`[${timestamp}][${requestId}] Processing ${vehicleData.accessories.length} vehicle-specific accessories...`)
          
          for (const accessory of vehicleData.accessories) {
            try {
              console.log(`[${timestamp}][${requestId}] Storing vehicle accessory: ${accessory.accessory_name} (quantity: ${accessory.quantity || 1})`)
              
              const { error: accessoryError } = await supabase
                .from('accessories')
                .insert({
                  vehicle_id: incomingVehicle.id,
                  company_name: group.company_name,
                  usage_type: normalizedUsageType,
                  accessory_name: accessory.accessory_name.trim(),
                  quantity: accessory.quantity || 1,
                  received_at: timestamp
                })

              if (accessoryError) {
                console.error(`[${timestamp}][${requestId}] ERROR - Failed to store vehicle accessory:`, accessoryError)
              } else {
                console.log(`[${timestamp}][${requestId}] Successfully stored vehicle accessory: ${accessory.accessory_name}`)
              }
            } catch (error) {
              console.error(`[${timestamp}][${requestId}] UNEXPECTED ERROR storing vehicle accessory:`, error)
            }
          }
        }

        // Check if automation rule exists for this vehicle
        console.log(`[${timestamp}][${requestId}] Checking if automation rule exists for vehicle...`)
        const automationRule = await checkAutomationRuleExists(supabase, brand, vehicle, year)
        
        let processingNotes = ''
        let vehicleResult: ProcessingResult = {
          vehicle: `${brand} ${vehicle}`,
          quantity: quantity || 1,
          incoming_vehicle_id: incomingVehicle.id
        }

        if (automationRule) {
          console.log(`[${timestamp}][${requestId}] Automation rule found, creating automatic order...`)
          
          try {
            const orderNumber = await generateAutoOrderNumber(supabase)
            console.log(`[${timestamp}][${requestId}] Generated order number: ${orderNumber}`)
            // Only pass group accessories for the first vehicle in the group to avoid duplicates
            const accessoriesToPass = (!groupAccessoriesProcessed && groupAccessories.length > 0) 
              ? groupAccessories.map(acc => ({ accessory_name: acc.accessory_name, quantity: acc.quantity || 1 }))
              : []
            const orderInfo = await createAutomaticOrder(supabase, { vehicle, brand, year, quantity: quantity || 1 }, orderNumber, group.company_name, accessoriesToPass)
            if (accessoriesToPass.length > 0) {
              groupAccessoriesProcessed = true
              console.log(`[${timestamp}][${requestId}] Processed ${accessoriesToPass.length} group accessories with this order`)
            }
            processingNotes = `Automation rule found. Created automatic order: ${orderNumber} (quantity: ${quantity || 1})`
            
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
            console.log(`[${timestamp}][${requestId}] Successfully created order ${orderNumber}`)
              
          } catch (orderError: any) {
            console.error(`[${timestamp}][${requestId}] ERROR - Failed to create automatic order:`, orderError)
            processingNotes = `Automation rule found but failed to create automatic order: ${orderError.message}`
            
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
          console.log(`[${timestamp}][${requestId}] No automation rule found, creating homologation card...`)
          
          try {
            const homologationInfo = await createHomologationCard(supabase, { vehicle, brand, year }, incomingVehicle.id)
            
            if (homologationInfo.already_homologated) {
              processingNotes = `Vehicle already homologated. Kit schedule created automatically for planning. (quantity: ${quantity || 1})`
            } else if (homologationInfo.created) {
              processingNotes = `No automation rule found. Created new homologation card linked to incoming vehicle. (quantity: ${quantity || 1})`
            } else {
              processingNotes = `No automation rule found. Linked to existing homologation card. (quantity: ${quantity || 1})`
            }
            
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
            console.log(`[${timestamp}][${requestId}] Successfully processed homologation (created: ${homologationInfo.created})`)
              
          } catch (homologationError: any) {
            console.error(`[${timestamp}][${requestId}] ERROR - Failed to create homologation card:`, homologationError)
            processingNotes = `No automation rule found and failed to create homologation card: ${homologationError.message}`
            
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
        console.log(`[${timestamp}][${requestId}] Vehicle processed successfully: ${vehicleResult.status}`)

      } catch (error: any) {
        console.error(`[${timestamp}][${requestId}] UNEXPECTED ERROR processing vehicle:`, error)
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

    // Process accessories for homologation cases (when no automatic orders were created)
    // For automatic orders, accessories are handled within the order creation process
    const hasOrderCreation = groupResult.vehicles_processed.some(v => v.status === 'order_created')
    
    if (!hasOrderCreation && group.accessories && Array.isArray(group.accessories) && group.accessories.length > 0) {
      console.log(`[${timestamp}][${requestId}] Processing ${group.accessories.length} accessories for homologation tracking in group ${groupIndex + 1}...`)
      
      // Find any created homologation IDs to link accessories to
      const homologationIds = groupResult.vehicles_processed
        .filter(v => v.homologation_id)
        .map(v => v.homologation_id)
      
      if (homologationIds.length > 0) {
        // Link accessories to the first homologation card in the group
        const primaryHomologationId = homologationIds[0]
        
        for (let accessoryIndex = 0; accessoryIndex < group.accessories.length; accessoryIndex++) {
          const accessoryData = group.accessories[accessoryIndex]
          const { accessory_name, quantity } = accessoryData
          
          console.log(`[${timestamp}][${requestId}] --- Processing accessory ${accessoryIndex + 1}/${group.accessories.length} for homologation ${primaryHomologationId} ---`)
          console.log(`[${timestamp}][${requestId}] Accessory: ${accessory_name} (quantity: ${quantity || 1})`)
          
          try {
            // Store accessory data linked to homologation ID as incoming_vehicle_group_id
            console.log(`[${timestamp}][${requestId}] Storing accessory data linked to homologation...`)
            
            const { data: accessory, error: accessoryError } = await supabase
              .from('accessories')
              .insert({
                incoming_vehicle_group_id: primaryHomologationId, // Use homologation ID as group identifier
                company_name: group.company_name,
                usage_type: group.usage_type,
                accessory_name: accessory_name.trim(),
                quantity: quantity || 1,
                received_at: timestamp
              })
              .select()
              .single()

            if (accessoryError) {
              console.error(`[${timestamp}][${requestId}] ERROR - Failed to store accessory:`, accessoryError)
              groupResult.processing_summary.errors++
              continue
            }

            console.log(`[${timestamp}][${requestId}] Successfully stored accessory with ID: ${accessory.id}`)
            
          } catch (error: any) {
            console.error(`[${timestamp}][${requestId}] UNEXPECTED ERROR processing accessory:`, error)
            groupResult.processing_summary.errors++
          }
        }
      } else {
        console.log(`[${timestamp}][${requestId}] No homologation IDs found, skipping accessory processing for group ${groupIndex + 1}`)
      }
    } else if (hasOrderCreation) {
      console.log(`[${timestamp}][${requestId}] Accessories already processed with automatic order creation for group ${groupIndex + 1}`)
    }

    processedGroups.push(groupResult)
    console.log(`[${timestamp}][${requestId}] ===== GROUP ${groupIndex + 1} COMPLETED =====`)
    console.log(`[${timestamp}][${requestId}] Group ${groupIndex + 1} summary: ${groupResult.processing_summary.orders_created} orders, ${groupResult.processing_summary.homologations_created} homologations, ${groupResult.processing_summary.errors} errors`)
  }

  console.log(`[${timestamp}][${requestId}] ===== PROCESSING COMPLETED =====`)
  console.log(`[${timestamp}][${requestId}] Total vehicles processed: ${totalVehiclesProcessed}`)
  console.log(`[${timestamp}][${requestId}] Total orders created: ${processedGroups.reduce((sum, group) => sum + group.processing_summary.orders_created, 0)}`)
  console.log(`[${timestamp}][${requestId}] Total homologations created: ${processedGroups.reduce((sum, group) => sum + group.processing_summary.homologations_created, 0)}`)
  console.log(`[${timestamp}][${requestId}] Total errors: ${processedGroups.reduce((sum, group) => sum + group.processing_summary.errors, 0)}`)

  return { processedGroups, totalVehiclesProcessed }
}