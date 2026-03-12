import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate JWT token (same pattern as create-homologation)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { plate, imei } = body;

    if (!plate || !imei) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: plate, imei" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert confirmation record
    const normalizedPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const { data: confirmation, error: insertError } = await supabase
      .from("installation_confirmations")
      .insert({
        plate: normalizedPlate,
        imei: imei.trim(),
        source: "instala",
        raw_payload: body,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save confirmation", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to match with kit_schedules by vehicle_plate
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
    } else {
      console.log(`No matching schedule found for plate ${normalizedPlate}`);
    }

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
