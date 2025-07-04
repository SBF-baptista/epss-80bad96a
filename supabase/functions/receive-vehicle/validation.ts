import { corsHeaders, VehicleGroup } from './shared.ts'

export function validateRequestBody(requestBody: any, timestamp: string): Response | null {
  // Validate if request body is an array of vehicle groups
  if (!Array.isArray(requestBody)) {
    console.log(`[${timestamp}] Request body must be an array of vehicle groups`)
    return new Response(
      JSON.stringify({ 
        error: 'Invalid request format', 
        message: 'Request body must be an array of vehicle groups' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  if (requestBody.length === 0) {
    console.log(`[${timestamp}] Empty vehicle groups array`)
    return new Response(
      JSON.stringify({ 
        error: 'Empty request', 
        message: 'At least one vehicle group is required' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Validate each vehicle group
  for (let i = 0; i < requestBody.length; i++) {
    const group = requestBody[i]
    
    if (!group.company_name || !group.usage_type || !Array.isArray(group.vehicles)) {
      console.log(`[${timestamp}] Invalid group structure at index ${i}:`, group)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid group structure', 
          message: `Group at index ${i} must have company_name, usage_type, and vehicles array` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (group.vehicles.length === 0) {
      console.log(`[${timestamp}] Empty vehicles array in group ${i}`)
      return new Response(
        JSON.stringify({ 
          error: 'Empty vehicles array', 
          message: `Group at index ${i} must have at least one vehicle` 
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
      
      if (!vehicle.vehicle || !vehicle.brand) {
        console.log(`[${timestamp}] Invalid vehicle structure in group ${i}, vehicle ${j}:`, vehicle)
        return new Response(
          JSON.stringify({ 
            error: 'Invalid vehicle structure', 
            message: `Vehicle at group ${i}, position ${j} must have vehicle and brand fields` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      if (vehicle.quantity !== undefined && (typeof vehicle.quantity !== 'number' || vehicle.quantity < 1)) {
        console.log(`[${timestamp}] Invalid quantity in group ${i}, vehicle ${j}:`, vehicle.quantity)
        return new Response(
          JSON.stringify({ 
            error: 'Invalid quantity', 
            message: `Vehicle at group ${i}, position ${j} has invalid quantity. Must be a positive integer` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }
  }

  return null // No validation error
}