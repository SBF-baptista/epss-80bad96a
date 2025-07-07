import { corsHeaders } from './shared.ts'

export function createConfigDiagnosticsEndpoint(req: Request, timestamp: string, requestId: string): Response | null {
  const url = new URL(req.url)
  
  // Check if this is a config diagnostics request
  if (url.pathname.endsWith('/config-debug') || url.searchParams.has('config-debug')) {
    console.log(`[${timestamp}][${requestId}] ===== CONFIG DIAGNOSTICS ENDPOINT =====`)
    
    // Get all environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const vehicleApiKey = Deno.env.get('VEHICLE_API_KEY')
    
    console.log(`[${timestamp}][${requestId}] Environment Variables Check:`)
    console.log(`[${timestamp}][${requestId}] SUPABASE_URL: ${!!supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'NOT SET'}`)
    console.log(`[${timestamp}][${requestId}] SUPABASE_ANON_KEY: ${!!supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}... (Length: ${supabaseAnonKey.length})` : 'NOT SET'}`)
    console.log(`[${timestamp}][${requestId}] SUPABASE_SERVICE_ROLE_KEY: ${!!supabaseServiceRoleKey ? `${supabaseServiceRoleKey.substring(0, 10)}... (Length: ${supabaseServiceRoleKey.length})` : 'NOT SET'}`)
    console.log(`[${timestamp}][${requestId}] VEHICLE_API_KEY: ${!!vehicleApiKey ? `${vehicleApiKey.substring(0, 10)}... (Length: ${vehicleApiKey.length})` : 'NOT SET'}`)
    
    const configAnalysis = {
      timestamp: timestamp,
      request_id: requestId,
      environment_configuration: {
        supabase_url: {
          configured: !!supabaseUrl,
          value_preview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'Not configured',
          length: supabaseUrl?.length || 0
        },
        supabase_anon_key: {
          configured: !!supabaseAnonKey,
          value_preview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'Not configured',
          length: supabaseAnonKey?.length || 0
        },
        supabase_service_role_key: {
          configured: !!supabaseServiceRoleKey,
          value_preview: supabaseServiceRoleKey ? `${supabaseServiceRoleKey.substring(0, 10)}...` : 'Not configured',
          length: supabaseServiceRoleKey?.length || 0
        },
        vehicle_api_key: {
          configured: !!vehicleApiKey,
          value_preview: vehicleApiKey ? `${vehicleApiKey.substring(0, 10)}...` : 'Not configured',
          length: vehicleApiKey?.length || 0,
          full_preview: vehicleApiKey ? `${vehicleApiKey.substring(0, 15)}...${vehicleApiKey.substring(vehicleApiKey.length - 15)}` : 'Not configured'
        }
      },
      configuration_issues: [],
      recommendations: []
    }
    
    // Check for configuration issues
    if (!supabaseUrl) {
      configAnalysis.configuration_issues.push('SUPABASE_URL is not configured')
      configAnalysis.recommendations.push('Set SUPABASE_URL in Supabase Edge Functions secrets')
    }
    
    if (!supabaseAnonKey) {
      configAnalysis.configuration_issues.push('SUPABASE_ANON_KEY is not configured')
      configAnalysis.recommendations.push('Set SUPABASE_ANON_KEY in Supabase Edge Functions secrets')
    }
    
    if (!vehicleApiKey) {
      configAnalysis.configuration_issues.push('VEHICLE_API_KEY is not configured - this is critical for authentication')
      configAnalysis.recommendations.push('❌ Set VEHICLE_API_KEY in Supabase Edge Functions secrets - this is the most critical missing configuration')
    } else {
      // Detailed analysis of the vehicle API key
      configAnalysis.recommendations.push('✅ VEHICLE_API_KEY is configured')
      
      // Check for common issues with the key
      const trimmedKey = vehicleApiKey.trim()
      if (vehicleApiKey !== trimmedKey) {
        configAnalysis.configuration_issues.push('VEHICLE_API_KEY has leading/trailing whitespace')
        configAnalysis.recommendations.push('⚠️ Remove leading/trailing whitespace from VEHICLE_API_KEY')
      }
      
      if (vehicleApiKey.length < 10) {
        configAnalysis.configuration_issues.push('VEHICLE_API_KEY appears to be too short')
        configAnalysis.recommendations.push('⚠️ Verify VEHICLE_API_KEY is complete - seems unusually short')
      }
      
      if (vehicleApiKey.length > 100) {
        configAnalysis.configuration_issues.push('VEHICLE_API_KEY appears to be unusually long')
        configAnalysis.recommendations.push('⚠️ Verify VEHICLE_API_KEY is correct - seems unusually long')
      }
    }
    
    // Add general recommendations
    if (configAnalysis.configuration_issues.length === 0) {
      configAnalysis.recommendations.push('✅ All required environment variables are configured')
    }
    
    return new Response(
      JSON.stringify(configAnalysis, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
  
  return null
}