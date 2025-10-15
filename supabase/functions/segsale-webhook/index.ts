import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-key, token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

serve(async (req) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = new URL(req.url);
  const origin = req.headers.get('origin') || 'Not provided';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`[${timestamp}] 🔔 Segsale webhook called`);
  console.log(`   Method: ${method}`);
  console.log(`   Origin: ${origin}`);
  console.log(`   URL: ${url.toString()}`);

  try {
    // Extract idResumoVenda from query params (GET) or body (POST)
    let idResumoVenda: number | null = null;

    if (method === 'GET') {
      const queryParam = url.searchParams.get('idResumoVenda');
      if (queryParam) {
        idResumoVenda = parseInt(queryParam, 10);
        console.log(`📥 GET request - idResumoVenda from query: ${idResumoVenda}`);
      }
    } else if (method === 'POST') {
      const body = await req.json();
      idResumoVenda = body.idResumoVenda;
      console.log(`📥 POST request - idResumoVenda from body: ${idResumoVenda}`);
    }

    // Validate idResumoVenda
    if (!idResumoVenda || isNaN(idResumoVenda)) {
      console.error(`❌ Invalid or missing idResumoVenda: ${idResumoVenda}`);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid idResumoVenda',
          message: 'idResumoVenda must be a valid number (query param for GET, JSON body for POST)'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Flexible authentication: x-webhook-key OR Token
    const webhookKey = req.headers.get('x-webhook-key');
    const tokenHeader = req.headers.get('token');
    const expectedWebhookKey = Deno.env.get('SEGSALE_WEBHOOK_KEY');
    const expectedToken = Deno.env.get('SEGSALE_API_TOKEN');

    let authMethod = 'none';
    let isAuthenticated = false;

    // Check x-webhook-key first
    if (webhookKey && expectedWebhookKey && webhookKey === expectedWebhookKey) {
      authMethod = 'x-webhook-key';
      isAuthenticated = true;
    }
    // Check Token header
    else if (tokenHeader && expectedToken && tokenHeader === expectedToken) {
      authMethod = 'Token header';
      isAuthenticated = true;
    }
    // For GET requests without authentication headers, allow if configured to be open
    else if (method === 'GET' && !webhookKey && !tokenHeader) {
      authMethod = 'open (no auth required for GET)';
      isAuthenticated = true;
      console.log(`⚠️  GET request without authentication - allowing (configure SEGSALE_WEBHOOK_KEY or SEGSALE_API_TOKEN for security)`);
    }

    if (!isAuthenticated) {
      console.error(`❌ Authentication failed`);
      console.error(`   x-webhook-key provided: ${!!webhookKey}`);
      console.error(`   Token provided: ${!!tokenHeader}`);
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          message: 'Provide x-webhook-key or Token header for authentication'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Authentication successful via: ${authMethod}`);
    console.log(`🔄 Processing idResumoVenda: ${idResumoVenda}`);

    // Call fetch-segsale-products endpoint (which fetches contract_items and forwards to receive-vehicle)
    const fetchUrl = `https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/fetch-segsale-products?idResumoVenda=${idResumoVenda}`;
    console.log(`📞 Calling fetch-segsale-products (includes contract items): ${fetchUrl}`);

    const fetchResponse = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const fetchData = await fetchResponse.json();

    if (!fetchResponse.ok) {
      console.error(`❌ fetch-segsale-products failed with status ${fetchResponse.status}`);
      console.error(`   Response:`, JSON.stringify(fetchData, null, 2));
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch Segsale data',
          status: fetchResponse.status,
          details: fetchData
        }),
        { status: fetchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Successfully processed idResumoVenda ${idResumoVenda}`);
    console.log(`📊 Summary:`, JSON.stringify({
      method,
      authMethod,
      idResumoVenda,
      fetchStatus: fetchResponse.status,
      storedCount: fetchData.stored_count || 0
    }, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed Segsale sale ${idResumoVenda}`,
        metadata: {
          method,
          authMethod,
          idResumoVenda,
          timestamp
        },
        data: fetchData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`❌ Unexpected error in segsale-webhook:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
