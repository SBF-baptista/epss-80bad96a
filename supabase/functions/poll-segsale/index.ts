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

    const lastProcessedId = integrationState.last_processed_id || 0;
    console.log(`📊 Last processed ID: ${lastProcessedId}`);

    // Get the SEGSALE_API_TOKEN
    const segsaleToken = Deno.env.get('SEGSALE_API_TOKEN');
    if (!segsaleToken) {
      console.error('❌ SEGSALE_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'SEGSALE_API_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Poll incrementally - try next 20 IDs from last processed
    const startId = lastProcessedId + 1;
    const endId = startId + 19; // Check 20 IDs per poll
    
    console.log(`🔍 Checking sale IDs from ${startId} to ${endId}...`);

    let processedCount = 0;
    let newMaxId = lastProcessedId;
    const errors = [];
    let consecutiveNotFound = 0;

    // Try each ID incrementally
    for (let saleId = startId; saleId <= endId; saleId++) {
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
          consecutiveNotFound = 0;
          
          if (saleId > newMaxId) {
            newMaxId = saleId;
          }
        } else {
          const errorData = await fetchResponse.json();
          
          // If 404, the sale doesn't exist - this is expected
          if (fetchResponse.status === 404) {
            consecutiveNotFound++;
            console.log(`ℹ️ Sale ${saleId} not found (${consecutiveNotFound} consecutive)`);
            
            // If we find 5 consecutive non-existent sales, stop polling
            if (consecutiveNotFound >= 5) {
              console.log(`⏹️ Stopping poll after ${consecutiveNotFound} consecutive not found`);
              // Still update the max ID to the last one we checked
              if (saleId > newMaxId) {
                newMaxId = saleId - consecutiveNotFound;
              }
              break;
            }
          } else {
            // Other errors are real problems
            console.error(`❌ Failed to process sale ${saleId}: ${fetchResponse.status}`, errorData);
            errors.push({ saleId, error: errorData });
          }
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
          ids_checked: endId - startId + 1,
          new_sales_processed: processedCount
        },
        updated_at: new Date().toISOString()
      })
      .eq('integration_name', 'segsale');

    console.log(`✅ Poll completed: ${processedCount} new sales processed (checked IDs ${startId}-${endId})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedCount} new sales`,
        last_processed_id: newMaxId,
        checked_range: `${startId}-${endId}`,
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
