import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-key, token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Map Segsale usage types to receive-vehicle valid usage types
// Map Segsale usage types to database enum values
function mapUsageType(usageType: string): string {
  const normalized = usageType.toUpperCase().trim();
  const mapping: Record<string, string> = {
    'TELEMETRIA GPS': 'telemetria_gps',
    'TELEMETRIA CAN': 'telemetria_can',
    'COPILOTO 2 CAMERAS': 'copiloto_2_cameras',
    'COPILOTO 4 CAMERAS': 'copiloto_4_cameras',
    'PARTICULAR': 'particular',
    'COMERCIAL': 'comercial',
    'FROTA': 'frota',
  };
  return mapping[normalized] || usageType.toLowerCase().replace(/\s+/g, '_');
}

// Transform Segsale API response into receive-vehicle format
function transformSalesToVehicleGroups(sales: any[], idResumoVenda: number): any[] {
  const vehicleGroups: any[] = [];

  for (const sale of sales) {
    const vehicles = sale.vehicles || [];
    if (vehicles.length === 0) continue;

    const transformedVehicles = vehicles.map((v: any) => {
      const vehicle: any = {
        vehicle: v.vehicle || v.modelo || '',
        brand: v.brand || v.marca || '',
        year: v.year || v.ano || null,
        quantity: v.quantity || 1,
      };

      // Map accessories from Segsale format
      const accessories: any[] = [];
      if (Array.isArray(v.accessories)) {
        v.accessories.forEach((acc: string) => {
          accessories.push({ accessory_name: acc, quantity: 1 });
        });
      }
      if (Array.isArray(v.modules)) {
        v.modules.forEach((mod: string) => {
          accessories.push({ accessory_name: mod, quantity: 1 });
        });
      }
      if (accessories.length > 0) {
        vehicle.accessories = accessories;
      }

      return vehicle;
    });

    const usageType = mapUsageType(sale.usage_type || 'TELEMETRIA GPS');

    vehicleGroups.push({
      company_name: sale.company_name || 'Não identificado',
      usage_type: usageType,
      sale_summary_id: idResumoVenda,
      pending_contract_id: sale.pending_contract_id || null,
      cpf: sale.cpf || null,
      phone: sale.phone || null,
      vehicles: transformedVehicles,
      address: sale.address || undefined,
    });
  }

  return vehicleGroups;
}

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

    // Step 1: Fetch data from Segsale API via fetch-segsale-products
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://eeidevcyxpnorbgcskdf.supabase.co';
    const fetchUrl = `${supabaseUrl}/functions/v1/fetch-segsale-products?idResumoVenda=${idResumoVenda}`;
    console.log(`📞 Step 1: Calling fetch-segsale-products: ${fetchUrl}`);

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

    const sales = fetchData.sales || [];
    console.log(`✅ Step 1 complete: Got ${sales.length} sales from Segsale`);

    if (sales.length === 0) {
      console.log(`⚠️ No sales data to process for idResumoVenda ${idResumoVenda}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: `No sales data found for idResumoVenda ${idResumoVenda}`,
          metadata: { method, authMethod, idResumoVenda, timestamp },
          data: fetchData
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Transform sales into receive-vehicle format and store
    const vehicleGroups = transformSalesToVehicleGroups(sales, idResumoVenda);
    console.log(`🔄 Step 2: Sending ${vehicleGroups.length} vehicle groups to receive-vehicle`);

    if (vehicleGroups.length > 0) {
      const receiveUrl = `${supabaseUrl}/functions/v1/receive-vehicle`;
      console.log(`📞 Calling receive-vehicle: ${receiveUrl}`);

      const vehicleApiKey = Deno.env.get('VEHICLE_API_KEY');
      if (!vehicleApiKey) {
        console.error(`❌ VEHICLE_API_KEY not configured`);
        return new Response(
          JSON.stringify({ success: false, error: 'VEHICLE_API_KEY not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const receiveResponse = await fetch(receiveUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': vehicleApiKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        },
        body: JSON.stringify(vehicleGroups)
      });

      const receiveData = await receiveResponse.json();

      if (!receiveResponse.ok) {
        console.error(`❌ receive-vehicle failed with status ${receiveResponse.status}:`, JSON.stringify(receiveData));
        // Don't fail the entire webhook — the fetch was successful
        console.log(`⚠️ Data was fetched but storage failed. Returning partial success.`);
        return new Response(
          JSON.stringify({
            success: true,
            message: `Fetched ${sales.length} sales but storage had issues`,
            metadata: { method, authMethod, idResumoVenda, timestamp },
            fetch_data: fetchData,
            storage_error: { status: receiveResponse.status, details: receiveData }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`✅ Step 2 complete: Vehicles stored successfully`);
      console.log(`   receive-vehicle response:`, JSON.stringify(receiveData).substring(0, 500));

      return new Response(
        JSON.stringify({
          success: true,
          message: `Successfully processed and stored Segsale sale ${idResumoVenda}`,
          metadata: { method, authMethod, idResumoVenda, timestamp },
          fetch_result: { sales_count: sales.length },
          storage_result: receiveData
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fetched data but no vehicle groups to store for ${idResumoVenda}`,
        metadata: { method, authMethod, idResumoVenda, timestamp },
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
