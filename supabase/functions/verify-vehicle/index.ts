
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Simple API key authentication
    const apiKey = req.headers.get('x-api-key')
    const expectedApiKey = Deno.env.get('VEHICLE_API_KEY')
    
    if (!apiKey || apiKey !== expectedApiKey) {
      console.log('Unauthorized access attempt - invalid or missing API key')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse query parameters
    const url = new URL(req.url)
    const brand = url.searchParams.get('brand')
    const model = url.searchParams.get('model')

    // Validate required parameters
    if (!brand || !model) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters', 
          message: 'Both brand and model parameters are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Searching for vehicle: ${brand} ${model}`)

    // Search for vehicle in database
    const { data: vehicles, error } = await supabase
      .from('veiculos')
      .select('id, marca, modelo, quantidade, tipo, created_at')
      .ilike('marca', brand.trim())
      .ilike('modelo', model.trim())
      .limit(1)

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if vehicle was found
    if (!vehicles || vehicles.length === 0) {
      console.log(`Vehicle not found: ${brand} ${model}`)
      return new Response(
        JSON.stringify({ 
          error: 'Vehicle not found',
          message: `No vehicle found with brand "${brand}" and model "${model}"`
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const vehicle = vehicles[0]
    console.log(`Vehicle found: ${vehicle.marca} ${vehicle.modelo}`)

    // Return vehicle details
    return new Response(
      JSON.stringify({
        success: true,
        vehicle: {
          id: vehicle.id,
          brand: vehicle.marca,
          model: vehicle.modelo,
          quantity: vehicle.quantidade,
          type: vehicle.tipo,
          created_at: vehicle.created_at
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
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
