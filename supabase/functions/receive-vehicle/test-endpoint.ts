import { corsHeaders } from './shared.ts'

export function createTestEndpoint(req: Request, timestamp: string, requestId: string): Response | null {
  const url = new URL(req.url)
  
  // Check if this is a test endpoint request
  if (url.pathname.endsWith('/test') || url.searchParams.has('test')) {
    console.log(`[${timestamp}][${requestId}] ===== TEST ENDPOINT ACCESSED =====`)
    console.log(`[${timestamp}][${requestId}] Test endpoint accessed successfully`)
    console.log(`[${timestamp}][${requestId}] Method: ${req.method}`)
    console.log(`[${timestamp}][${requestId}] URL: ${req.url}`)
    console.log(`[${timestamp}][${requestId}] Headers: ${JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2)}`)
    
    // Enhanced authentication debugging
    const apiKey = req.headers.get('x-api-key')
    const expectedApiKey = Deno.env.get('VEHICLE_API_KEY')
    const authStatus = {
      api_key_provided: !!apiKey,
      api_key_length: apiKey?.length || 0,
      expected_key_configured: !!expectedApiKey,
      expected_key_length: expectedApiKey?.length || 0,
      keys_match: apiKey === expectedApiKey,
      api_key_preview: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'none',
      expected_key_preview: expectedApiKey ? `${expectedApiKey.substring(0, 4)}...${expectedApiKey.substring(expectedApiKey.length - 4)}` : 'none'
    }
    
    const testResponse = {
      success: true,
      message: 'Test endpoint is working correctly',
      request_id: requestId,
      timestamp: timestamp,
      method: req.method,
      url: req.url,
      authentication_debug: authStatus,
      environment_check: {
        supabase_url_configured: !!Deno.env.get('SUPABASE_URL'),
        supabase_anon_key_configured: !!Deno.env.get('SUPABASE_ANON_KEY'),
        vehicle_api_key_configured: !!Deno.env.get('VEHICLE_API_KEY'),
      },
      headers_received: Object.fromEntries(req.headers.entries()),
      expected_format: {
        description: 'Expected POST request body format',
        example: [
          {
            company_name: "Example Company",
            usage_type: "particular",
            vehicles: [
              {
                vehicle: "Model Name",
                brand: "Brand Name",
                year: 2024,
                quantity: 1
              }
            ]
          }
        ]
      },
      authentication: {
        required_header: 'x-api-key',
        description: 'Include your API key in the x-api-key header',
        troubleshooting: {
          common_issues: [
            'API key not included in x-api-key header',
            'Incorrect API key value',
            'Extra spaces or characters in API key',
            'Using wrong header name (should be x-api-key, not Authorization)',
            'API key not configured in Supabase secrets'
          ],
          verification_steps: [
            '1. Verify the API key is set in Supabase Edge Functions secrets',
            '2. Check that x-api-key header is being sent with the request',
            '3. Ensure the API key value matches exactly (no extra spaces)',
            '4. Use this test endpoint to verify authentication before sending real data'
          ]
        }
      },
      next_steps: authStatus.keys_match 
        ? 'Authentication successful! You can now send POST requests to the main endpoint.'
        : 'Authentication failed. Please check the troubleshooting section above.'
    }
    
    return new Response(
      JSON.stringify(testResponse, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
  
  return null // Not a test endpoint request
}