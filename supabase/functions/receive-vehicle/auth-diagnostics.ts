import { corsHeaders } from './shared.ts'

export function createAuthDiagnosticsEndpoint(req: Request, timestamp: string, requestId: string): Response | null {
  const url = new URL(req.url)
  
  // Check if this is an auth diagnostics request
  if (url.pathname.endsWith('/auth-debug') || url.searchParams.has('auth-debug')) {
    console.log(`[${timestamp}][${requestId}] ===== AUTH DIAGNOSTICS ENDPOINT =====`)
    
    const apiKey = req.headers.get('x-api-key')
    const expectedApiKey = Deno.env.get('VEHICLE_API_KEY')
    
    // Enhanced logging for key analysis
    console.log(`[${timestamp}][${requestId}] ALL HEADERS:`, JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2))
    console.log(`[${timestamp}][${requestId}] API KEY PROVIDED:`, !!apiKey, apiKey ? `Length: ${apiKey.length}` : 'None')
    console.log(`[${timestamp}][${requestId}] EXPECTED KEY CONFIGURED:`, !!expectedApiKey, expectedApiKey ? `Length: ${expectedApiKey.length}` : 'None')
    console.log(`[${timestamp}][${requestId}] KEYS MATCH:`, apiKey === expectedApiKey)
    
    // Character-by-character comparison for detailed analysis
    if (apiKey && expectedApiKey) {
      console.log(`[${timestamp}][${requestId}] DETAILED KEY COMPARISON:`)
      console.log(`[${timestamp}][${requestId}] Provided key preview: "${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 10)}"`)
      console.log(`[${timestamp}][${requestId}] Expected key preview: "${expectedApiKey.substring(0, 10)}...${expectedApiKey.substring(expectedApiKey.length - 10)}"`)
      
      // Check for common issues
      const trimmedProvidedKey = apiKey.trim()
      const trimmedExpectedKey = expectedApiKey.trim()
      console.log(`[${timestamp}][${requestId}] Keys match after trim:`, trimmedProvidedKey === trimmedExpectedKey)
      console.log(`[${timestamp}][${requestId}] Provided key has whitespace:`, apiKey !== trimmedProvidedKey)
      console.log(`[${timestamp}][${requestId}] Expected key has whitespace:`, expectedApiKey !== trimmedExpectedKey)
    }
    
    // Detailed authentication analysis
    const authAnalysis = {
      timestamp: timestamp,
      request_id: requestId,
      client_info: {
        user_agent: req.headers.get('user-agent') || 'Not provided',
        origin: req.headers.get('origin') || 'Not provided',
        content_type: req.headers.get('content-type') || 'Not provided',
        method: req.method
      },
      api_key_analysis: {
        header_present: req.headers.has('x-api-key'),
        header_value_provided: !!apiKey,
        header_value_length: apiKey?.length || 0,
        header_value_trimmed_length: apiKey?.trim().length || 0,
        has_leading_whitespace: apiKey ? apiKey !== apiKey.trimStart() : false,
        has_trailing_whitespace: apiKey ? apiKey !== apiKey.trimEnd() : false,
        preview: apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 6)}` : 'none'
      },
      server_config: {
        expected_key_configured: !!expectedApiKey,
        expected_key_length: expectedApiKey?.length || 0,
        expected_key_preview: expectedApiKey ? `${expectedApiKey.substring(0, 6)}...${expectedApiKey.substring(expectedApiKey.length - 6)}` : 'none'
      },
      authentication_result: {
        keys_match_exact: apiKey === expectedApiKey,
        keys_match_trimmed: apiKey?.trim() === expectedApiKey?.trim(),
        case_sensitive_match: apiKey === expectedApiKey,
        length_comparison: {
          provided: apiKey?.length || 0,
          expected: expectedApiKey?.length || 0,
          difference: (apiKey?.length || 0) - (expectedApiKey?.length || 0)
        }
      },
      all_headers: Object.fromEntries(req.headers.entries()),
      recommendations: [] as string[]
    }
    
    // Generate specific recommendations based on analysis
    const recommendations = authAnalysis.recommendations as string[]
    if (!authAnalysis.api_key_analysis.header_present) {
      recommendations.push('❌ The x-api-key header is missing. Add it to your request.')
    } else if (!authAnalysis.api_key_analysis.header_value_provided) {
      recommendations.push('❌ The x-api-key header is present but empty. Provide a valid API key.')
    } else if (!authAnalysis.server_config.expected_key_configured) {
      recommendations.push('❌ Server misconfiguration: VEHICLE_API_KEY not set in environment.')
    } else if (authAnalysis.api_key_analysis.has_leading_whitespace || authAnalysis.api_key_analysis.has_trailing_whitespace) {
      recommendations.push('⚠️ API key has leading/trailing whitespace. Trim the key.')
    } else if (authAnalysis.authentication_result.length_comparison.difference !== 0) {
      recommendations.push(`❌ API key length mismatch. Provided: ${authAnalysis.authentication_result.length_comparison.provided}, Expected: ${authAnalysis.authentication_result.length_comparison.expected}`)
    } else if (!authAnalysis.authentication_result.keys_match_exact) {
      recommendations.push('❌ API key value does not match. Verify the correct key is being used.')
    } else {
      recommendations.push('✅ Authentication should work correctly.')
    }
    
    return new Response(
      JSON.stringify(authAnalysis, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
  
  return null
}

export function createEnhancedAuthError(apiKey: string | null, expectedApiKey: string | null, requestId: string): Response {
  const errorDetails: any = {
    error: 'Unauthorized',
    message: 'Authentication failed',
    request_id: requestId,
    debug_info: {
      api_key_provided: !!apiKey,
      api_key_header_present: apiKey !== null,
      expected_key_configured: !!expectedApiKey,
      common_solutions: [
        'Ensure x-api-key header is included in the request',
        'Verify the API key value is correct',
        'Check for extra spaces or characters in the API key',
        'Confirm the API key is set in Supabase Edge Functions secrets'
      ],
      test_endpoints: {
        basic_test: 'Add ?test=true to URL for basic connectivity test',
        auth_debug: 'Add ?auth-debug=true to URL for detailed authentication analysis'
      }
    }
  }
  
  if (!apiKey) {
    errorDetails.debug_info['specific_issue'] = 'x-api-key header is missing or empty'
  } else if (!expectedApiKey) {
    errorDetails.debug_info['specific_issue'] = 'Server configuration error: VEHICLE_API_KEY not configured'
  } else {
    errorDetails.debug_info['specific_issue'] = 'API key value does not match expected value'
    errorDetails.debug_info['key_length_provided'] = apiKey.length
    errorDetails.debug_info['key_length_expected'] = expectedApiKey.length
  }
  
  return new Response(
    JSON.stringify(errorDetails, null, 2),
    { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}