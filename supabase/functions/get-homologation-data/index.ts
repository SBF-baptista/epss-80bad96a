import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HomologationData {
  id: string
  brand: string
  model: string
  year: number | null
  technical_observations: string | null
  configuration: string | null
  status: string
  created_at: string
  updated_at: string
  photos: {
    id: string
    file_name: string
    photo_type: string | null
    url: string
    created_at: string
  }[]
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const brand = url.searchParams.get('brand')
    const model = url.searchParams.get('model')
    const year = url.searchParams.get('year')

    console.log('Get homologation data request:', { brand, model, year })

    // Validate required parameters
    if (!brand || !model) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters',
          message: 'Both "brand" and "model" parameters are required. "year" is optional.'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client with service role for read access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Normalize inputs
    const normalizedBrand = brand.trim().toUpperCase()
    const normalizedModel = model.trim().toUpperCase()
    const yearNumber = year ? parseInt(year) : null

    console.log('Searching for homologation:', { normalizedBrand, normalizedModel, yearNumber })

    // Build query for homologation card
    let query = supabase
      .from('homologation_cards')
      .select('*')
      .eq('brand', normalizedBrand)
      .eq('model', normalizedModel)
      .eq('status', 'homologado')
      .is('deleted_at', null)

    // Add year filter if provided
    if (yearNumber) {
      query = query.eq('year', yearNumber)
    }

    // Get the most recent homologation
    query = query.order('updated_at', { ascending: false }).limit(1)

    const { data: homologationCard, error: cardError } = await query.maybeSingle()

    if (cardError) {
      console.error('Error fetching homologation card:', cardError)
      return new Response(
        JSON.stringify({ 
          error: 'Database error',
          message: cardError.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!homologationCard) {
      console.log('No homologation found for:', { normalizedBrand, normalizedModel, yearNumber })
      return new Response(
        JSON.stringify({ 
          error: 'Not found',
          message: 'No approved homologation found for the specified vehicle.',
          searchCriteria: {
            brand: normalizedBrand,
            model: normalizedModel,
            year: yearNumber
          }
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Found homologation card:', homologationCard.id)

    // Fetch photos for this homologation
    const { data: photos, error: photosError } = await supabase
      .from('homologation_photos')
      .select('id, file_name, file_path, photo_type, created_at')
      .eq('homologation_card_id', homologationCard.id)
      .order('created_at', { ascending: true })

    if (photosError) {
      console.error('Error fetching photos:', photosError)
      return new Response(
        JSON.stringify({ 
          error: 'Database error',
          message: photosError.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Found ${photos?.length || 0} photos for homologation ${homologationCard.id}`)

    // Generate public URLs for photos
    const photosWithUrls = (photos || []).map(photo => {
      const { data } = supabase.storage
        .from('homologation-photos')
        .getPublicUrl(photo.file_path)
      
      return {
        id: photo.id,
        file_name: photo.file_name,
        photo_type: photo.photo_type,
        url: data.publicUrl,
        created_at: photo.created_at
      }
    })

    // Build response data
    const responseData: HomologationData = {
      id: homologationCard.id,
      brand: homologationCard.brand,
      model: homologationCard.model,
      year: homologationCard.year,
      technical_observations: homologationCard.technical_observations,
      configuration: homologationCard.configuration,
      status: homologationCard.status,
      created_at: homologationCard.created_at,
      updated_at: homologationCard.updated_at,
      photos: photosWithUrls
    }

    console.log('Returning homologation data with', photosWithUrls.length, 'photos')

    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error in get-homologation-data:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
