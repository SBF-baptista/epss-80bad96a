import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface TestChecklist {
  rpm: boolean
  odometro: boolean
  nivel_combustivel: boolean
  combustivel_consumido: boolean
}

interface VehicleData {
  brand: string
  model: string
  year: number
}

interface CreateHomologationRequest {
  vehicle: VehicleData
  test_checklist: TestChecklist
  technical_observations: string
  photos: Array<{
    file_name: string
    content_type: string
    base64_data: string
    photo_type?: string
  }>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestData: CreateHomologationRequest = await req.json()

    // Validate required fields
    if (!requestData.vehicle?.brand || !requestData.vehicle?.model || !requestData.vehicle?.year) {
      return new Response(
        JSON.stringify({ error: 'Missing required vehicle fields (brand, model, year)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!requestData.test_checklist) {
      return new Response(
        JSON.stringify({ error: 'Missing test_checklist' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Creating homologation card for:', requestData.vehicle)

    // Create homologation card with test results
    const { data: homologationCard, error: cardError } = await supabase
      .from('homologation_cards')
      .insert({
        brand: requestData.vehicle.brand.trim().toUpperCase(),
        model: requestData.vehicle.model.trim().toUpperCase(),
        year: requestData.vehicle.year,
        status: 'homologado',
        test_checklist: requestData.test_checklist,
        technical_observations: requestData.technical_observations || null,
        requested_by: user.id
      })
      .select()
      .single()

    if (cardError) {
      console.error('Error creating homologation card:', cardError)
      return new Response(
        JSON.stringify({ error: 'Failed to create homologation card', details: cardError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Homologation card created:', homologationCard.id)

    // Upload photos if provided
    const uploadedPhotos = []
    if (requestData.photos && requestData.photos.length > 0) {
      console.log(`Uploading ${requestData.photos.length} photos...`)

      for (const photo of requestData.photos) {
        try {
          // Decode base64 data
          const photoData = Uint8Array.from(atob(photo.base64_data), c => c.charCodeAt(0))
          
          // Generate unique file path
          const timestamp = Date.now()
          const filePath = `homologation_photos/${homologationCard.id}/${timestamp}_${photo.file_name}`

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('homologation_photos')
            .upload(filePath, photoData, {
              contentType: photo.content_type,
              upsert: false
            })

          if (uploadError) {
            console.error('Error uploading photo:', uploadError)
            continue
          }

          // Create photo record in database
          const { data: photoRecord, error: photoError } = await supabase
            .from('homologation_photos')
            .insert({
              homologation_card_id: homologationCard.id,
              file_name: photo.file_name,
              file_path: filePath,
              content_type: photo.content_type,
              photo_type: photo.photo_type || 'installation',
              uploaded_by: user.id
            })
            .select()
            .single()

          if (photoError) {
            console.error('Error creating photo record:', photoError)
            continue
          }

          uploadedPhotos.push(photoRecord)
          console.log(`Photo uploaded: ${photo.file_name}`)
        } catch (photoErr) {
          console.error('Error processing photo:', photoErr)
        }
      }
    }

    console.log(`Successfully created homologation with ${uploadedPhotos.length} photos`)

    return new Response(
      JSON.stringify({
        success: true,
        homologation_card: homologationCard,
        photos_uploaded: uploadedPhotos.length,
        photos: uploadedPhotos
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
