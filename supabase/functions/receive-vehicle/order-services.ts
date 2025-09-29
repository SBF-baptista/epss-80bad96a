import { findAutomationRule } from './automation-services.ts'

// Generate unique order number using PostgreSQL sequence
export async function generateAutoOrderNumber(supabase: any): Promise<string> {
  console.log('Generating automatic order number using sequence...')
  
  try {
    // Use the PostgreSQL sequence for thread-safe number generation
    const { data, error } = await supabase
      .rpc('generate_auto_order_number');

    if (error) {
      console.error('Error calling generate_auto_order_number RPC:', error)
      // Fallback to manual generation with retry logic
      return await generateAutoOrderNumberFallback(supabase)
    }

    if (data) {
      console.log('Generated AUTO order number using sequence:', data)
      return data
    }

    console.log('No data returned from sequence, using fallback')
    return await generateAutoOrderNumberFallback(supabase)
  } catch (error) {
    console.error('Error in generateAutoOrderNumber:', error)
    return await generateAutoOrderNumberFallback(supabase)
  }
}

// Fallback method with retry logic for edge cases
async function generateAutoOrderNumberFallback(supabase: any, maxRetries: number = 3): Promise<string> {
  console.log('Using fallback order number generation with retry logic...')
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Get the highest existing AUTO order number
      const { data: orders, error } = await supabase
        .from('pedidos')
        .select('numero_pedido')
        .like('numero_pedido', 'AUTO-%')
        .order('numero_pedido', { ascending: false })
        .limit(1)

      if (error) {
        console.error(`Fallback attempt ${attempt} - Error fetching orders:`, error)
        if (attempt === maxRetries) return 'AUTO-001'
        continue
      }

      if (!orders || orders.length === 0) {
        console.log(`Fallback attempt ${attempt} - No existing AUTO orders found, starting with AUTO-001`)
        return 'AUTO-001'
      }

      // Extract number and increment
      const lastOrderNumber = orders[0].numero_pedido
      console.log(`Fallback attempt ${attempt} - Last AUTO order number:`, lastOrderNumber)
      
      const match = lastOrderNumber.match(/AUTO-(\d+)/)
      if (match) {
        const nextNumber = parseInt(match[1]) + 1
        const newOrderNumber = `AUTO-${nextNumber.toString().padStart(3, '0')}`
        console.log(`Fallback attempt ${attempt} - Generated new AUTO order number:`, newOrderNumber)
        return newOrderNumber
      }

      console.log(`Fallback attempt ${attempt} - Could not parse last order number, defaulting to AUTO-001`)
      return 'AUTO-001'
    } catch (error) {
      console.error(`Fallback attempt ${attempt} - Error:`, error)
      if (attempt === maxRetries) return 'AUTO-001'
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100))
    }
  }

  return 'AUTO-001'
}

// Function to create automatic order using atomic database function
export async function createAutomaticOrder(supabase: any, vehicleData: any, orderNumber: string, companyName?: string, accessories?: Array<{accessory_name: string, quantity: number}>) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] Creating automatic order for vehicle: ${vehicleData.brand} ${vehicleData.vehicle}`)
  console.log(`[${timestamp}] Vehicle data:`, JSON.stringify(vehicleData, null, 2))
  
  try {
    console.log(`[${timestamp}] Using atomic database function to create order...`)
    
    // Use the atomic database function to create the order
    const { data: result, error } = await supabase
      .rpc('create_automatic_order_atomic', {
        p_vehicle_brand: vehicleData.brand,
        p_vehicle_model: vehicleData.vehicle,
        p_vehicle_year: vehicleData.year || null,
        p_quantity: vehicleData.quantity || 1,
        p_company_name: companyName || null
      })

    if (error) {
      console.error(`[${timestamp}] Error calling atomic order creation function:`, error)
      throw error
    }

    if (!result || result.length === 0) {
      console.error(`[${timestamp}] No result returned from atomic order creation function`)
      throw new Error('No result returned from order creation')
    }

    const orderResult = result[0]
    console.log(`[${timestamp}] Successfully created order atomically:`, JSON.stringify(orderResult, null, 2))

    // Create accessory records if provided
    if (accessories && accessories.length > 0) {
      console.log(`[${timestamp}] Creating ${accessories.length} accessory records for order ${orderResult.order_id}`)
      
      const accessoryInserts = accessories.map(accessory => ({
        pedido_id: orderResult.order_id,
        accessory_name: accessory.accessory_name,
        quantity: accessory.quantity,
        received_at: new Date().toISOString()
      }))

      const { error: accessoryError } = await supabase
        .from('accessories')
        .insert(accessoryInserts)

      if (accessoryError) {
        console.error(`[${timestamp}] Error creating accessory records:`, accessoryError)
        // Don't throw here, as the main order was created successfully
        console.log(`[${timestamp}] Continuing despite accessory error...`)
      } else {
        console.log(`[${timestamp}] Successfully created ${accessories.length} accessory records`)
      }
    }
    
    console.log(`[${timestamp}] ✅ COMPLETE: Successfully created automatic order ${orderResult.order_number} for ${vehicleData.brand} ${vehicleData.vehicle} (quantity: ${vehicleData.quantity || 1})`)
    
    return {
      order_id: orderResult.order_id,
      order_number: orderResult.order_number,
      tracker_model: orderResult.tracker_model,
      configuration: orderResult.configuration,
      quantity: vehicleData.quantity || 1
    }

  } catch (error) {
    console.error(`[${timestamp}] ❌ ERROR in createAutomaticOrder:`, error)
    console.error(`[${timestamp}] Error stack:`, (error as any)?.stack)
    throw error
  }
}