import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

serve(async (req) => {
  const timestamp = new Date().toISOString();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`[${timestamp}] 🔄 Poll Segsale triggered`);

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get integration state
    const { data: integrationState, error: stateError } = await supabase
      .from('integration_state')
      .select('*')
      .eq('integration_name', 'segsale')
      .eq('status', 'active')
      .single();

    if (stateError) {
      console.error('❌ Error fetching integration state:', stateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch integration state',
          details: stateError 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Last processed ID: ${integrationState.last_processed_id || 0}`);

    // Get the SEGSALE_API_TOKEN
    const segsaleToken = Deno.env.get('SEGSALE_API_TOKEN');
    if (!segsaleToken) {
      console.error('❌ SEGSALE_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'SEGSALE_API_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch recent sales from Segsale API
    // Note: This endpoint needs to be confirmed with Segsale API documentation
    const segsaleApiUrl = `https://ws-sale-teste.segsat.com/segsale/relatorios/resumo-vendas-recentes`;
    
    console.log(`📞 Fetching recent sales from Segsale API...`);
    
    const segsaleResponse = await fetch(segsaleApiUrl, {
      method: 'GET',
      headers: {
        'Token': segsaleToken,
        'Content-Type': 'application/json'
      }
    });

    if (!segsaleResponse.ok) {
      const errorText = await segsaleResponse.text();
      console.error(`❌ Segsale API error: ${segsaleResponse.status} ${segsaleResponse.statusText}`);
      console.error(`   Response: ${errorText}`);
      
      // Update error count
      await supabase
        .from('integration_state')
        .update({
          error_count: (integrationState.error_count || 0) + 1,
          last_error: `API ${segsaleResponse.status}: ${errorText}`,
          updated_at: new Date().toISOString()
        })
        .eq('integration_name', 'segsale');

      return new Response(
        JSON.stringify({
          error: 'Failed to fetch from Segsale API',
          status: segsaleResponse.status,
          details: errorText
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sales = await segsaleResponse.json();
    console.log(`✅ Fetched ${sales.length || 0} recent sales from Segsale`);

    let processedCount = 0;
    let newMaxId = integrationState.last_processed_id || 0;
    const errors = [];

    // Process each new sale
    for (const sale of (sales || [])) {
      const saleId = sale.idResumoVenda || sale.id;
      
      if (!saleId || saleId <= (integrationState.last_processed_id || 0)) {
        continue; // Skip already processed
      }

      console.log(`🔄 Processing sale ID ${saleId}...`);

      try {
        // Call fetch-segsale-products for this sale
        const fetchUrl = `${supabaseUrl}/functions/v1/fetch-segsale-products?idResumoVenda=${saleId}`;
        
        const fetchResponse = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (fetchResponse.ok) {
          console.log(`✅ Successfully processed sale ${saleId}`);
          processedCount++;
          
          if (saleId > newMaxId) {
            newMaxId = saleId;
          }
        } else {
          const errorData = await fetchResponse.json();
          console.error(`❌ Failed to process sale ${saleId}:`, errorData);
          errors.push({ saleId, error: errorData });
        }
      } catch (err) {
        console.error(`❌ Exception processing sale ${saleId}:`, err);
        errors.push({ saleId, error: err.message });
      }
    }

    // Update integration state
    await supabase
      .from('integration_state')
      .update({
        last_processed_id: newMaxId,
        last_poll_at: new Date().toISOString(),
        error_count: errors.length > 0 ? (integrationState.error_count || 0) + 1 : 0,
        last_error: errors.length > 0 ? JSON.stringify(errors) : null,
        metadata: {
          ...integrationState.metadata,
          last_successful_poll: new Date().toISOString(),
          total_sales_fetched: (sales || []).length,
          new_sales_processed: processedCount
        },
        updated_at: new Date().toISOString()
      })
      .eq('integration_name', 'segsale');

    console.log(`✅ Poll completed: ${processedCount} new sales processed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedCount} new sales`,
        last_processed_id: newMaxId,
        total_fetched: (sales || []).length,
        errors: errors.length > 0 ? errors : undefined,
        timestamp
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`❌ Unexpected error in poll-segsale:`, error);
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
