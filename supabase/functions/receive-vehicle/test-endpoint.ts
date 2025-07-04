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
    
    const testResponse = {
      success: true,
      message: 'Test endpoint is working correctly',
      request_id: requestId,
      timestamp: timestamp,
      method: req.method,
      url: req.url,
      environment_check: {
        supabase_url_configured: !!Deno.env.get('SUPABASE_URL'),
        supabase_anon_key_configured: !!Deno.env.get('SUPABASE_ANON_KEY'),
        vehicle_api_key_configured: !!Deno.env.get('VEHICLE_API_KEY'),
      },
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
        description: 'Include your API key in the x-api-key header'
      }
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