import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-key, token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = new URL(req.url);
  const origin = req.headers.get('origin') || 'Not provided';
  const userAgent = req.headers.get('user-agent') || 'Not provided';
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')
    || 'unknown';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Block GET requests entirely — only POST is allowed
  if (method !== 'POST') {
    console.warn(`🚫 [${timestamp}] Rejected ${method} from IP=${clientIp} UA=${userAgent}`);
    return new Response(
      JSON.stringify({ error: 'Method not allowed', message: 'Only POST requests are accepted' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[${timestamp}] 🔔 Segsale webhook called`);
  console.log(`   Method: ${method}, IP: ${clientIp}, UA: ${userAgent}`);

  try {
    let idResumoVenda: number | null = null;

    const body = await req.json();
    idResumoVenda = body.idResumoVenda;
    console.log(`📥 POST request - idResumoVenda from body: ${idResumoVenda}`);

    // Validate idResumoVenda
    if (!idResumoVenda || isNaN(idResumoVenda)) {
      console.error(`❌ Invalid or missing idResumoVenda: ${idResumoVenda}`);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid idResumoVenda',
          message: 'idResumoVenda must be a valid number in the JSON body'
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

    if (webhookKey && expectedWebhookKey && webhookKey === expectedWebhookKey) {
      authMethod = 'x-webhook-key';
      isAuthenticated = true;
    } else if (tokenHeader && expectedToken && tokenHeader === expectedToken) {
      authMethod = 'Token header';
      isAuthenticated = true;
    }

    if (!isAuthenticated) {
      console.error(`❌ Authentication failed from IP=${clientIp}`);
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

    // Call fetch-segsale-products with Service Role Key for internal authentication
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fetchUrl = `https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/fetch-segsale-products?idResumoVenda=${idResumoVenda}`;
    console.log(`📞 Calling fetch-segsale-products (authenticated): ${fetchUrl}`);

    const fetchResponse = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
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
