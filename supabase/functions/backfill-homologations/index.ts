import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const expectedApiKey = Deno.env.get('VEHICLE_API_KEY')

    // Validate API key
    const providedApiKey = req.headers.get('x-api-key')
    if (expectedApiKey && providedApiKey !== expectedApiKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting homologation backfill process...')

    // Find incoming_vehicles with sale_summary_id but no created_homologation_id
    const { data: unprocessedVehicles, error: fetchError } = await supabase
      .from('incoming_vehicles')
      .select('*')
      .not('sale_summary_id', 'is', null)
      .is('created_homologation_id', null)
      .order('received_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching unprocessed vehicles:', fetchError)
      throw fetchError
    }

    console.log(`Found ${unprocessedVehicles?.length || 0} vehicles to backfill`)

    let processed = 0
    let linked = 0
    let created = 0
    let errors = 0

    for (const vehicle of unprocessedVehicles || []) {
      try {
        console.log(`Processing vehicle: ${vehicle.brand} ${vehicle.vehicle} (sale_summary_id: ${vehicle.sale_summary_id})`)
        
        // Normalize brand and model
        const BRAND = vehicle.brand?.trim().toUpperCase()
        const MODEL = vehicle.vehicle?.trim().toUpperCase()

        // Check for existing homologation card
        const { data: existingCard } = await supabase
          .from('homologation_cards')
          .select('id, status')
          .eq('brand', BRAND)
          .eq('model', MODEL)
          .limit(1)
          .single()

        let homologationId: string

        if (existingCard) {
          console.log(`Found existing card ${existingCard.id} for ${BRAND} ${MODEL}`)
          
          // Link to existing card if not already linked
          const { error: updateCardError } = await supabase
            .from('homologation_cards')
            .update({ incoming_vehicle_id: vehicle.id })
            .eq('id', existingCard.id)
            .is('incoming_vehicle_id', null)

          if (updateCardError) {
            console.log(`Card ${existingCard.id} already linked to another vehicle`)
          }

          homologationId = existingCard.id
          linked++
        } else {
          console.log(`Creating new homologation card for ${BRAND} ${MODEL}`)
          
          // Create new homologation card
          const { data: newCard, error: createError } = await supabase
            .from('homologation_cards')
            .insert({
              brand: BRAND,
              model: MODEL,
              year: vehicle.year || null,
              status: 'homologar',
              incoming_vehicle_id: vehicle.id,
              notes: `Backfilled from sale_summary_id ${vehicle.sale_summary_id} on ${new Date().toISOString()}`
            })
            .select('id')
            .single()

          if (createError) {
            console.error(`Error creating card for ${BRAND} ${MODEL}:`, createError)
            errors++
            continue
          }

          homologationId = newCard.id
          created++
        }

        // Update incoming_vehicle with homologation link
        const { error: updateVehicleError } = await supabase
          .from('incoming_vehicles')
          .update({
            created_homologation_id: homologationId,
            processed: true,
            processing_notes: `Backfilled: linked to homologation card ${homologationId}`
          })
          .eq('id', vehicle.id)

        if (updateVehicleError) {
          console.error(`Error updating vehicle ${vehicle.id}:`, updateVehicleError)
          errors++
        } else {
          processed++
          console.log(`Successfully processed vehicle ${vehicle.id}`)
        }

      } catch (err) {
        console.error(`Error processing vehicle ${vehicle.id}:`, err)
        errors++
      }
    }

    console.log('Backfill complete')
    console.log(`Processed: ${processed}, Created: ${created}, Linked: ${linked}, Errors: ${errors}`)

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_found: unprocessedVehicles?.length || 0,
          processed,
          cards_created: created,
          cards_linked: linked,
          errors
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})