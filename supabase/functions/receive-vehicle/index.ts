
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from './shared.ts'
import { validateRequestBody } from './validation.ts'
import { processVehicleGroups } from './processing.ts'
import { createTestEndpoint } from './test-endpoint.ts'
import { createAuthDiagnosticsEndpoint, createEnhancedAuthError } from './auth-diagnostics.ts'
import { createConfigDiagnosticsEndpoint } from './config-diagnostics.ts'

serve(async (req) => {
  const timestamp = new Date().toISOString()
  const requestId = Math.random().toString(36).substring(2, 15)
  
  console.log(`[${timestamp}][${requestId}] ===== NEW REQUEST START =====`)
  console.log(`[${timestamp}][${requestId}] Method: ${req.method}`)
  console.log(`[${timestamp}][${requestId}] URL: ${req.url}`)
  console.log(`[${timestamp}][${requestId}] User-Agent: ${req.headers.get('user-agent') || 'Not provided'}`)
  console.log(`[${timestamp}][${requestId}] Origin: ${req.headers.get('origin') || 'Not provided'}`)
  console.log(`[${timestamp}][${requestId}] Content-Type: ${req.headers.get('content-type') || 'Not provided'}`)
  console.log(`[${timestamp}][${requestId}] Content-Length: ${req.headers.get('content-length') || 'Not provided'}`)
  console.log(`[${timestamp}][${requestId}] Headers count: ${Array.from(req.headers.entries()).length}`)
  
  // Log all headers for debug (excluding sensitive ones)
  const headers = Object.fromEntries(req.headers.entries())
  const filteredHeaders = Object.keys(headers).reduce((acc, key) => {
    if (key.toLowerCase() === 'x-api-key') {
      acc[key] = headers[key] ? `${headers[key].substring(0, 8)}...` : 'null'
    } else if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('token')) {
      acc[key] = headers[key] ? '[REDACTED]' : 'null'
    } else {
      acc[key] = headers[key]
    }
    return acc
  }, {} as Record<string, string>)
  console.log(`[${timestamp}][${requestId}] Filtered Headers:`, filteredHeaders)

  // Handle CORS preflight requests first
  if (req.method === 'OPTIONS') {
    console.log(`[${timestamp}][${requestId}] CORS preflight request handled`)
    return new Response(null, { headers: corsHeaders })
  }

  // Check for diagnostic endpoints (can handle GET requests)
  const testResponse = createTestEndpoint(req, timestamp, requestId)
  if (testResponse) {
    return testResponse
  }

  const authDiagResponse = createAuthDiagnosticsEndpoint(req, timestamp, requestId)
  if (authDiagResponse) {
    return authDiagResponse
  }

  const configDiagResponse = createConfigDiagnosticsEndpoint(req, timestamp, requestId)
  if (configDiagResponse) {
    return configDiagResponse
  }

  // Only allow POST requests for main functionality
  if (req.method !== 'POST') {
    console.log(`[${timestamp}][${requestId}] ERROR - Method not allowed: ${req.method}`)
    return new Response(
      JSON.stringify({ 
        error: 'Method not allowed',
        message: `Only POST requests are allowed for vehicle processing. Received: ${req.method}`,
        request_id: requestId
      }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    console.log(`[${timestamp}][${requestId}] Initializing Supabase client...`)
    // Initialize Supabase client with service role key for system operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${timestamp}][${requestId}] ERROR - Missing Supabase environment variables`)
      console.error(`[${timestamp}][${requestId}] SUPABASE_URL present: ${!!supabaseUrl}`)
      console.error(`[${timestamp}][${requestId}] SUPABASE_SERVICE_ROLE_KEY present: ${!!supabaseServiceKey}`)
      throw new Error('Missing Supabase configuration')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    console.log(`[${timestamp}][${requestId}] Supabase client initialized successfully`)

    // API key authentication with detailed debug
    const apiKey = req.headers.get('x-api-key')
    const expectedApiKey = Deno.env.get('VEHICLE_API_KEY')
    
    console.log(`[${timestamp}][${requestId}] ===== AUTHENTICATION DEBUG =====`)
    console.log(`[${timestamp}][${requestId}] API Key provided: ${!!apiKey}`)
    console.log(`[${timestamp}][${requestId}] Expected API Key configured: ${!!expectedApiKey}`)
    
    if (apiKey) {
      console.log(`[${timestamp}][${requestId}] Provided API Key preview: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`)
    }
    if (expectedApiKey) {
      console.log(`[${timestamp}][${requestId}] Expected API Key preview: ${expectedApiKey.substring(0, 8)}...${expectedApiKey.substring(expectedApiKey.length - 4)}`)
    }
    
    console.log(`[${timestamp}][${requestId}] Keys match: ${apiKey === expectedApiKey}`)
    
    if (!apiKey || !expectedApiKey || apiKey !== expectedApiKey) {
      console.log(`[${timestamp}][${requestId}] ERROR - Authentication failed`)
      if (!expectedApiKey) {
        console.log(`[${timestamp}][${requestId}] ERROR - No expected API key configured in environment`)
        return new Response(
          JSON.stringify({ 
            error: 'Server configuration error',
            message: 'API key not configured on server',
            request_id: requestId
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      return createEnhancedAuthError(apiKey, expectedApiKey, requestId)
    }
    
    console.log(`[${timestamp}][${requestId}] Authentication successful`)
    console.log(`[${timestamp}][${requestId}] ===== END AUTHENTICATION DEBUG =====`)

    // Parse request body
    let requestBody
    console.log(`[${timestamp}][${requestId}] ===== REQUEST BODY PARSING =====`)
    try {
      const bodyText = await req.text()
      console.log(`[${timestamp}][${requestId}] Body text length: ${bodyText.length}`)
      console.log(`[${timestamp}][${requestId}] Body text preview: ${bodyText.substring(0, 200)}${bodyText.length > 200 ? '...' : ''}`)
      
      if (!bodyText.trim()) {
        console.log(`[${timestamp}][${requestId}] ERROR - Empty request body`)
        return new Response(
          JSON.stringify({ 
            error: 'Empty request body', 
            message: 'Request body cannot be empty',
            request_id: requestId
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      requestBody = JSON.parse(bodyText)
      console.log(`[${timestamp}][${requestId}] Successfully parsed JSON`)
      console.log(`[${timestamp}][${requestId}] Request body type: ${typeof requestBody}`)
      console.log(`[${timestamp}][${requestId}] Is array: ${Array.isArray(requestBody)}`)
      if (Array.isArray(requestBody)) {
        console.log(`[${timestamp}][${requestId}] Array length: ${requestBody.length}`)
      }
      console.log(`[${timestamp}][${requestId}] Request body structure:`, JSON.stringify(requestBody, null, 2))
    } catch (error) {
      console.log(`[${timestamp}][${requestId}] ERROR - Invalid JSON in request body:`, (error as any)?.message)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON', 
          message: `Request body must be valid JSON. Error: ${(error as any)?.message}`,
          request_id: requestId
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    console.log(`[${timestamp}][${requestId}] ===== END REQUEST BODY PARSING =====`)

    // Validate request body
    console.log(`[${timestamp}][${requestId}] Starting request body validation...`)
    const validationError = validateRequestBody(requestBody, timestamp, requestId)
    if (validationError) {
      console.log(`[${timestamp}][${requestId}] Validation failed, returning error response`)
      return validationError
    }
    console.log(`[${timestamp}][${requestId}] Request body validation passed`)

    // Process vehicle groups
    console.log(`[${timestamp}][${requestId}] Starting vehicle groups processing...`)
    const { processedGroups, totalVehiclesProcessed } = await processVehicleGroups(supabase, requestBody, timestamp, requestId)

    // Prepare final response
    const response = {
      success: true,
      message: `Successfully processed ${requestBody.length} vehicle groups with ${totalVehiclesProcessed} total vehicles`,
      request_id: requestId,
      total_groups: requestBody.length,
      total_vehicles: totalVehiclesProcessed,
      processing_summary: {
        total_orders_created: processedGroups.reduce((sum, group) => sum + group.processing_summary.orders_created, 0),
        total_homologations_created: processedGroups.reduce((sum, group) => sum + group.processing_summary.homologations_created, 0),
        total_errors: processedGroups.reduce((sum, group) => sum + group.processing_summary.errors, 0)
      },
      processed_groups: processedGroups
    }

    console.log(`[${timestamp}][${requestId}] ===== SUCCESS RESPONSE =====`)
    console.log(`[${timestamp}][${requestId}] Processing completed successfully`)
    console.log(`[${timestamp}][${requestId}] Total groups processed: ${requestBody.length}`)
    console.log(`[${timestamp}][${requestId}] Total vehicles processed: ${totalVehiclesProcessed}`)
    console.log(`[${timestamp}][${requestId}] Orders created: ${response.processing_summary.total_orders_created}`)
    console.log(`[${timestamp}][${requestId}] Homologations created: ${response.processing_summary.total_homologations_created}`)
    console.log(`[${timestamp}][${requestId}] Errors: ${response.processing_summary.total_errors}`)
    console.log(`[${timestamp}][${requestId}] ===== END SUCCESS RESPONSE =====`)

    return new Response(
      JSON.stringify(response),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error(`[${timestamp}][${requestId}] ===== UNEXPECTED ERROR =====`)
    console.error(`[${timestamp}][${requestId}] Error message:`, (error as any)?.message)
    console.error(`[${timestamp}][${requestId}] Error stack:`, (error as any)?.stack)
    console.error(`[${timestamp}][${requestId}] Error name:`, (error as any)?.name)
    console.error(`[${timestamp}][${requestId}] ===== END UNEXPECTED ERROR =====`)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred during processing',
        request_id: requestId,
        timestamp: timestamp
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
