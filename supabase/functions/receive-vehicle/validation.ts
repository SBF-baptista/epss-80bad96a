import { corsHeaders, VehicleGroup } from './shared.ts'

export function validateRequestBody(requestBody: any, timestamp: string, requestId: string): Response | null {
  console.log(`[${timestamp}][${requestId}] ===== VALIDATION START =====`)
  // Validate if request body is an array of vehicle groups
  if (!Array.isArray(requestBody)) {
    console.log(`[${timestamp}][${requestId}] VALIDATION ERROR - Request body must be an array of vehicle groups`)
    console.log(`[${timestamp}][${requestId}] Received type: ${typeof requestBody}`)
    return new Response(
      JSON.stringify({ 
        error: 'Invalid request format', 
        message: 'Request body must be an array of vehicle groups',
        request_id: requestId,
        received_type: typeof requestBody
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  if (requestBody.length === 0) {
    console.log(`[${timestamp}][${requestId}] VALIDATION ERROR - Empty vehicle groups array`)
    return new Response(
      JSON.stringify({ 
        error: 'Empty request', 
        message: 'At least one vehicle group is required',
        request_id: requestId
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  console.log(`[${timestamp}][${requestId}] Validating ${requestBody.length} vehicle groups...`)

  // Validate each vehicle group
  for (let i = 0; i < requestBody.length; i++) {
    const group = requestBody[i]
    console.log(`[${timestamp}][${requestId}] Validating group ${i + 1}/${requestBody.length}:`, {
      company_name: group?.company_name,
      usage_type: group?.usage_type,
      vehicles_count: Array.isArray(group?.vehicles) ? group.vehicles.length : 'not_array'
    })
    
    if (!group.company_name || !group.usage_type || !Array.isArray(group.vehicles)) {
      console.log(`[${timestamp}][${requestId}] VALIDATION ERROR - Invalid group structure at index ${i}:`, group)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid group structure', 
          message: `Group at index ${i} must have company_name, usage_type, and vehicles array`,
          request_id: requestId,
          group_index: i,
          missing_fields: {
            company_name: !group.company_name,
            usage_type: !group.usage_type,
            vehicles: !Array.isArray(group.vehicles)
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate usage_type with new accepted values
    const validUsageTypes = [
      'particular', 
      'comercial', 
      'frota', 
      'telemetria_gps', 
      'telemetria_can', 
      'copiloto_2_cameras', 
      'copiloto_4_cameras',
      'TELEMETRIA GPS',
      'TELEMETRIA CAN', 
      'COPILOTO 2 CAMERAS', 
      'COPILOTO 4 CAMERAS'
    ]
    
    if (!validUsageTypes.includes(group.usage_type)) {
      console.log(`[${timestamp}][${requestId}] VALIDATION ERROR - Invalid usage_type at index ${i}:`, group.usage_type)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid usage_type', 
          message: `Group at index ${i} has invalid usage_type. Valid values are: ${validUsageTypes.join(', ')}`,
          request_id: requestId,
          group_index: i,
          provided_usage_type: group.usage_type,
          valid_usage_types: validUsageTypes
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (group.vehicles.length === 0) {
      console.log(`[${timestamp}][${requestId}] VALIDATION ERROR - Empty vehicles array in group ${i}`)
      return new Response(
        JSON.stringify({ 
          error: 'Empty vehicles array', 
          message: `Group at index ${i} must have at least one vehicle`,
          request_id: requestId,
          group_index: i
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate each vehicle in the group
    for (let j = 0; j < group.vehicles.length; j++) {
      const vehicle = group.vehicles[j]
      console.log(`[${timestamp}][${requestId}] Validating vehicle ${j + 1}/${group.vehicles.length} in group ${i + 1}:`, {
        vehicle: vehicle?.vehicle,
        brand: vehicle?.brand,
        year: vehicle?.year,
        quantity: vehicle?.quantity
      })
      
      if (!vehicle.vehicle || !vehicle.brand) {
        console.log(`[${timestamp}][${requestId}] VALIDATION ERROR - Invalid vehicle structure in group ${i}, vehicle ${j}:`, vehicle)
        return new Response(
          JSON.stringify({ 
            error: 'Invalid vehicle structure', 
            message: `Vehicle at group ${i}, position ${j} must have vehicle and brand fields`,
            request_id: requestId,
            group_index: i,
            vehicle_index: j,
            missing_fields: {
              vehicle: !vehicle.vehicle,
              brand: !vehicle.brand
            }
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      if (vehicle.quantity !== undefined && (typeof vehicle.quantity !== 'number' || vehicle.quantity < 1)) {
        console.log(`[${timestamp}][${requestId}] VALIDATION ERROR - Invalid quantity in group ${i}, vehicle ${j}:`, vehicle.quantity)
        return new Response(
          JSON.stringify({ 
            error: 'Invalid quantity', 
            message: `Vehicle at group ${i}, position ${j} has invalid quantity. Must be a positive integer`,
            request_id: requestId,
            group_index: i,
            vehicle_index: j,
            provided_quantity: vehicle.quantity,
            quantity_type: typeof vehicle.quantity
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Validate vehicle-level accessories if present
      if (vehicle.accessories !== undefined) {
        console.log(`[${timestamp}][${requestId}] Validating vehicle accessories in group ${i + 1}, vehicle ${j + 1}:`, {
          accessories_count: Array.isArray(vehicle.accessories) ? vehicle.accessories.length : 'not_array'
        })
        
        if (!Array.isArray(vehicle.accessories)) {
          console.log(`[${timestamp}][${requestId}] VALIDATION ERROR - Invalid vehicle accessories structure in group ${i}, vehicle ${j}:`, vehicle.accessories)
          return new Response(
            JSON.stringify({ 
              error: 'Invalid vehicle accessories structure', 
              message: `Accessories for vehicle at group ${i}, position ${j} must be an array`,
              request_id: requestId,
              group_index: i,
              vehicle_index: j,
              accessories_type: typeof vehicle.accessories
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        // Validate each vehicle accessory
        for (let l = 0; l < vehicle.accessories.length; l++) {
          const vehicleAccessory = vehicle.accessories[l]
          console.log(`[${timestamp}][${requestId}] Validating vehicle accessory ${l + 1}/${vehicle.accessories.length} in group ${i + 1}, vehicle ${j + 1}:`, {
            accessory_name: vehicleAccessory?.accessory_name,
            quantity: vehicleAccessory?.quantity
          })
          
          if (!vehicleAccessory.accessory_name) {
            console.log(`[${timestamp}][${requestId}] VALIDATION ERROR - Invalid vehicle accessory structure in group ${i}, vehicle ${j}, accessory ${l}:`, vehicleAccessory)
            return new Response(
              JSON.stringify({ 
                error: 'Invalid vehicle accessory structure', 
                message: `Accessory at group ${i}, vehicle ${j}, position ${l} must have accessory_name field`,
                request_id: requestId,
                group_index: i,
                vehicle_index: j,
                accessory_index: l,
                missing_fields: {
                  accessory_name: !vehicleAccessory.accessory_name
                }
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }

          if (vehicleAccessory.quantity !== undefined && (typeof vehicleAccessory.quantity !== 'number' || vehicleAccessory.quantity < 1)) {
            console.log(`[${timestamp}][${requestId}] VALIDATION ERROR - Invalid quantity in group ${i}, vehicle ${j}, accessory ${l}:`, vehicleAccessory.quantity)
            return new Response(
              JSON.stringify({ 
                error: 'Invalid vehicle accessory quantity', 
                message: `Accessory at group ${i}, vehicle ${j}, position ${l} has invalid quantity. Must be a positive integer`,
                request_id: requestId,
                group_index: i,
                vehicle_index: j,
                accessory_index: l,
                provided_quantity: vehicleAccessory.quantity,
                quantity_type: typeof vehicleAccessory.quantity
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
        }
      }
    }

    // Validate accessories if present (optional field)
    if (group.accessories !== undefined) {
      console.log(`[${timestamp}][${requestId}] Validating accessories in group ${i + 1}:`, {
        accessories_count: Array.isArray(group.accessories) ? group.accessories.length : 'not_array'
      })
      
      if (!Array.isArray(group.accessories)) {
        console.log(`[${timestamp}][${requestId}] VALIDATION ERROR - Invalid accessories structure in group ${i}:`, group.accessories)
        return new Response(
          JSON.stringify({ 
            error: 'Invalid accessories structure', 
            message: `Accessories in group ${i} must be an array`,
            request_id: requestId,
            group_index: i,
            accessories_type: typeof group.accessories
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Validate each accessory in the group
      for (let k = 0; k < group.accessories.length; k++) {
        const accessory = group.accessories[k]
        console.log(`[${timestamp}][${requestId}] Validating accessory ${k + 1}/${group.accessories.length} in group ${i + 1}:`, {
          accessory_name: accessory?.accessory_name,
          quantity: accessory?.quantity
        })
        
        if (!accessory.accessory_name) {
          console.log(`[${timestamp}][${requestId}] VALIDATION ERROR - Invalid accessory structure in group ${i}, accessory ${k}:`, accessory)
          return new Response(
            JSON.stringify({ 
              error: 'Invalid accessory structure', 
              message: `Accessory at group ${i}, position ${k} must have accessory_name field`,
              request_id: requestId,
              group_index: i,
              accessory_index: k,
              missing_fields: {
                accessory_name: !accessory.accessory_name
              }
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        if (accessory.quantity !== undefined && (typeof accessory.quantity !== 'number' || accessory.quantity < 1)) {
          console.log(`[${timestamp}][${requestId}] VALIDATION ERROR - Invalid quantity in group ${i}, accessory ${k}:`, accessory.quantity)
          return new Response(
            JSON.stringify({ 
              error: 'Invalid accessory quantity', 
              message: `Accessory at group ${i}, position ${k} has invalid quantity. Must be a positive integer`,
              request_id: requestId,
              group_index: i,
              accessory_index: k,
              provided_quantity: accessory.quantity,
              quantity_type: typeof accessory.quantity
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
      }
    }
  }

  console.log(`[${timestamp}][${requestId}] ===== VALIDATION PASSED =====`)
  return null // No validation error
}