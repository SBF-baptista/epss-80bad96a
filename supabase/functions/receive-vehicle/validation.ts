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
    }
  }

  console.log(`[${timestamp}][${requestId}] ===== VALIDATION PASSED =====`)
  return null // No validation error
}