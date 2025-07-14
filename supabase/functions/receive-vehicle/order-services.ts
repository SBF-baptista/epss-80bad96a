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

// Function to create automatic order with retry logic
export async function createAutomaticOrder(supabase: any, vehicleData: any, orderNumber: string, companyName?: string, accessories?: Array<{accessory_name: string, quantity: number}>) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] Creating automatic order for vehicle: ${vehicleData.brand} ${vehicleData.vehicle}`)
  console.log(`[${timestamp}] Vehicle data:`, JSON.stringify(vehicleData, null, 2))
  console.log(`[${timestamp}] Order number: ${orderNumber}`)
  
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[${timestamp}] Attempt ${attempt}/${maxRetries} - Looking for automation rule...`)
      const automationRule = await findAutomationRule(supabase, vehicleData.brand, vehicleData.vehicle, vehicleData.year)
      
      if (!automationRule) {
        console.log(`[${timestamp}] No automation rule found for ${vehicleData.brand} ${vehicleData.vehicle}, skipping automatic order creation`)
        return null
      }

      console.log(`[${timestamp}] Found automation rule:`, JSON.stringify(automationRule, null, 2))

      console.log(`[${timestamp}] Attempt ${attempt} - Creating order in pedidos table...`)
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          numero_pedido: orderNumber,
          configuracao: automationRule.configuration,
          status: 'novos',
          data: new Date().toISOString(),
          usuario_id: 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf', // sergio.filho@segsat.com
          company_name: companyName
        })
        .select()
        .single()

      if (pedidoError) {
        console.error(`[${timestamp}] Attempt ${attempt} - Error creating automatic order:`, pedidoError)
        console.error(`[${timestamp}] Error details - code: ${pedidoError.code}, message: ${pedidoError.message}`)
        
        // If it's a duplicate key error and not the last attempt, regenerate order number and retry
        if (pedidoError.code === '23505' && pedidoError.message?.includes('pedidos_numero_pedido_key') && attempt < maxRetries) {
          console.log(`[${timestamp}] Duplicate order number detected on attempt ${attempt}, regenerating...`)
          orderNumber = await generateAutoOrderNumber(supabase)
          console.log(`[${timestamp}] New order number for retry: ${orderNumber}`)
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100))
          continue
        }
        
        if (pedidoError.details) {
          console.error(`[${timestamp}] Error details: ${pedidoError.details}`)
        }
        if (pedidoError.hint) {
          console.error(`[${timestamp}] Error hint: ${pedidoError.hint}`)
        }
        
        if (attempt === maxRetries) {
          throw pedidoError
        }
        continue
      }

      console.log(`[${timestamp}] Successfully created order with ID: ${pedido.id}`)
      console.log(`[${timestamp}] Order details:`, JSON.stringify(pedido, null, 2))

      console.log(`[${timestamp}] Creating vehicle record...`)
      const { error: vehicleError } = await supabase
        .from('veiculos')
        .insert({
          pedido_id: pedido.id,
          marca: vehicleData.brand,
          modelo: vehicleData.vehicle,
          quantidade: vehicleData.quantity || 1,
          tipo: vehicleData.year ? vehicleData.year.toString() : null
        })

      if (vehicleError) {
        console.error(`[${timestamp}] Error creating vehicle for automatic order:`, vehicleError)
        throw vehicleError
      }

      console.log(`[${timestamp}] Successfully created vehicle record`)

      console.log(`[${timestamp}] Creating tracker record...`)
      const { error: trackerError } = await supabase
        .from('rastreadores')
        .insert({
          pedido_id: pedido.id,
          modelo: automationRule.tracker_model,
          quantidade: vehicleData.quantity || 1
        })

      if (trackerError) {
        console.error(`[${timestamp}] Error creating tracker for automatic order:`, trackerError)
        throw trackerError
      }

      console.log(`[${timestamp}] Successfully created tracker record`)

      // Create accessory records if provided
      if (accessories && accessories.length > 0) {
        console.log(`[${timestamp}] Creating ${accessories.length} accessory records for order ${pedido.id}`)
        
        const accessoryInserts = accessories.map(accessory => ({
          pedido_id: pedido.id,
          accessory_name: accessory.accessory_name,
          quantity: accessory.quantity,
          received_at: new Date().toISOString()
        }))

        const { error: accessoryError } = await supabase
          .from('accessories')
          .insert(accessoryInserts)

        if (accessoryError) {
          console.error(`[${timestamp}] Error creating accessory records:`, accessoryError)
          throw accessoryError
        }

        console.log(`[${timestamp}] Successfully created ${accessories.length} accessory records`)
      }
      
      console.log(`[${timestamp}] ✅ COMPLETE: Successfully created automatic order ${orderNumber} for ${vehicleData.brand} ${vehicleData.vehicle} (quantity: ${vehicleData.quantity || 1})`)
      
      return {
        order_id: pedido.id,
        order_number: orderNumber,
        tracker_model: automationRule.tracker_model,
        configuration: automationRule.configuration,
        quantity: vehicleData.quantity || 1
      }

    } catch (error) {
      console.error(`[${timestamp}] ❌ ERROR in createAutomaticOrder attempt ${attempt}:`, error)
      console.error(`[${timestamp}] Error stack:`, error.stack)
      
      if (attempt === maxRetries) {
        throw error
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100))
    }
  }
}