
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from './shared.ts'
import { validateRequestBody } from './validation.ts'
import { processVehicleGroups } from './processing.ts'

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] NEW REQUEST: ${req.method} ${req.url}`)
  console.log(`[${timestamp}] Headers:`, Object.fromEntries(req.headers.entries()))

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${timestamp}] CORS preflight request`)
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`[${timestamp}] Method not allowed: ${req.method}`)
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    console.log(`[${timestamp}] Initializing Supabase client...`)
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log(`[${timestamp}] Supabase client initialized`)

    // API key authentication
    const apiKey = req.headers.get('x-api-key')
    const expectedApiKey = Deno.env.get('VEHICLE_API_KEY')
    
    console.log(`[${timestamp}] API Key present: ${!!apiKey}`)
    console.log(`[${timestamp}] Expected API Key present: ${!!expectedApiKey}`)
    
    if (!apiKey || apiKey !== expectedApiKey) {
      console.log(`[${timestamp}] Unauthorized access attempt - invalid or missing API key`)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    let requestBody
    try {
      const bodyText = await req.text()
      console.log(`[${timestamp}] Raw request body:`, bodyText)
      requestBody = JSON.parse(bodyText)
      console.log(`[${timestamp}] Parsed request body:`, requestBody)
    } catch (error) {
      console.log(`[${timestamp}] Invalid JSON in request body:`, error)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON', 
          message: 'Request body must be valid JSON' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate request body
    const validationError = validateRequestBody(requestBody, timestamp)
    if (validationError) {
      return validationError
    }

    // Process vehicle groups
    const { processedGroups, totalVehiclesProcessed } = await processVehicleGroups(supabase, requestBody, timestamp)

    // Prepare final response
    const response = {
      success: true,
      message: `Successfully processed ${requestBody.length} vehicle groups with ${totalVehiclesProcessed} total vehicles`,
      total_groups: requestBody.length,
      total_vehicles: totalVehiclesProcessed,
      processing_summary: {
        total_orders_created: processedGroups.reduce((sum, group) => sum + group.processing_summary.orders_created, 0),
        total_homologations_created: processedGroups.reduce((sum, group) => sum + group.processing_summary.homologations_created, 0),
        total_errors: processedGroups.reduce((sum, group) => sum + group.processing_summary.errors, 0)
      },
      processed_groups: processedGroups
    }

    console.log(`[${timestamp}] SUCCESS - Sending response:`, response)

    return new Response(
      JSON.stringify(response),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error(`[${timestamp}] UNEXPECTED ERROR:`, error)
    console.error(`[${timestamp}] Error stack:`, error.stack)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
