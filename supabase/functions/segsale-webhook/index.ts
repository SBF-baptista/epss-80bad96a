import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`[${new Date().toISOString()}] Segsale webhook called`);

  try {
    // Validate webhook key
    const webhookKey = req.headers.get('x-webhook-key');
    const expectedKey = Deno.env.get('SEGSALE_WEBHOOK_KEY');

    if (!webhookKey || !expectedKey) {
      console.error('❌ Missing webhook key configuration');
      return new Response(
        JSON.stringify({ error: 'Webhook key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (webhookKey !== expectedKey) {
      console.error('❌ Invalid webhook key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { idResumoVenda } = await req.json();

    if (!idResumoVenda || typeof idResumoVenda !== 'number') {
      console.error('❌ Invalid idResumoVenda:', idResumoVenda);
      return new Response(
        JSON.stringify({ error: 'Invalid idResumoVenda - must be a number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Webhook authenticated, processing idResumoVenda: ${idResumoVenda}`);

    // Call fetch-segsale-products endpoint
    const fetchUrl = `https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/fetch-segsale-products?idResumoVenda=${idResumoVenda}`;
    console.log(`📞 Calling fetch-segsale-products: ${fetchUrl}`);

    const fetchResponse = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const fetchData = await fetchResponse.json();

    if (!fetchResponse.ok) {
      console.error('❌ fetch-segsale-products failed:', fetchResponse.status, fetchData);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch Segsale data',
          details: fetchData
        }),
        { status: fetchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Successfully processed idResumoVenda ${idResumoVenda}`);
    console.log('Response from fetch-segsale-products:', JSON.stringify(fetchData, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed Segsale sale ${idResumoVenda}`,
        idResumoVenda,
        data: fetchData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error in segsale-webhook:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
