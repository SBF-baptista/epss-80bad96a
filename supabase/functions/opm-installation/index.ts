import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Validate API Key
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("OPM_API_KEY");

    if (!expectedKey) {
      console.error("OPM_API_KEY not configured in secrets");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!apiKey || apiKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { customer_name, plate, imei, model, product } = body;

    // Validate required fields
    const missingFields: string[] = [];
    if (!customer_name) missingFields.push("customer_name");
    if (!plate) missingFields.push("plate");
    if (!imei) missingFields.push("imei");
    if (!model) missingFields.push("model");
    if (!product) missingFields.push("product");

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          missing: missingFields,
          expected_format: {
            customer_name: "Nome do cliente",
            plate: "ABC1D23",
            imei: "123456789012345",
            model: "Modelo do veículo",
            product: "rastreamento / bloqueio / camera / etc",
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const trimmedImei = imei.trim();

    // Verify plate exists in OPM system
    const { data: incomingVehicle } = await supabase
      .from("incoming_vehicles")
      .select("id")
      .eq("plate", normalizedPlate)
      .limit(1)
      .maybeSingle();

    const { data: kitSchedule } = await supabase
      .from("kit_schedules")
      .select("id")
      .eq("vehicle_plate", normalizedPlate)
      .limit(1)
      .maybeSingle();

    if (!incomingVehicle && !kitSchedule) {
      return new Response(
        JSON.stringify({ error: "Placa não encontrada no sistema OPM", plate: normalizedPlate }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert into installation_confirmations
    const { data: confirmation, error: insertError } = await supabase
      .from("installation_confirmations")
      .insert({
        plate: normalizedPlate,
        imei: trimmedImei,
        source: "opm",
        raw_payload: {
          customer_name,
          plate: normalizedPlate,
          imei: trimmedImei,
          model,
          product,
          received_at: new Date().toISOString(),
        },
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save installation data", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to match with kit_schedules
    const { data: schedules } = await supabase
      .from("kit_schedules")
      .select("id, status")
      .eq("vehicle_plate", normalizedPlate)
      .in("status", ["scheduled", "in_progress", "confirmed"])
      .order("scheduled_date", { ascending: false })
      .limit(1);

    let matchedSchedule = false;
    let scheduleId: string | null = null;

    if (schedules && schedules.length > 0) {
      scheduleId = schedules[0].id;
      matchedSchedule = true;

      await supabase
        .from("installation_confirmations")
        .update({ matched_schedule_id: scheduleId })
        .eq("id", confirmation.id);

      await supabase
        .from("kit_schedules")
        .update({ status: "completed" })
        .eq("id", scheduleId);

      console.log(`Matched schedule ${scheduleId} for plate ${normalizedPlate}`);
    }

    console.log(`OPM installation saved: plate=${normalizedPlate}, imei=${trimmedImei}, customer=${customer_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        confirmation_id: confirmation.id,
        matched_schedule: matchedSchedule,
        schedule_id: scheduleId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
