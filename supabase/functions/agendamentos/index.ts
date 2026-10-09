import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const p = (k: string) => url.searchParams.get(k) ?? (body as Record<string, unknown>)[k] ?? null;

    const placa = p("placa");
    const dataInicio = p("data_inicio");
    const dataFim = p("data_fim");
    const tecnico = p("tecnico");
    const cliente = p("cliente");
    const contrato = p("tipo_contrato");
    const limit = Math.min(Number(p("limit") ?? 100000) || 100000, 100000);
    const page = Math.max(Number(p("page") ?? 1) || 1, 1);
    const from = (page - 1) * limit;

    let query = supabase
      .from("installation_schedules")
      .select("*")
      .order("scheduled_date", { ascending: false })
      .order("scheduled_time", { ascending: true })
      .range(from, from + limit - 1);

    if (placa) query = query.ilike("plate", `%${String(placa).toUpperCase().trim()}%`);
    if (dataInicio) query = query.gte("scheduled_date", String(dataInicio));
    if (dataFim) query = query.lte("scheduled_date", String(dataFim));
    if (tecnico) query = query.ilike("technician_name", `%${tecnico}%`);
    if (cliente) query = query.ilike("customer", `%${cliente}%`);
    if (contrato) query = query.eq("tipo_contrato", String(contrato));

    const { data, error } = await query;
    if (error) return json({ ok: false, error: error.message }, 200);

    const rows = (data ?? []) as Array<Record<string, unknown>>;

    // ===== contractcode (incoming_vehicles.pending_contract_id) =====
    // 1) Fluxo normal: installation_schedules.kit_schedule_id -> kit_schedules.incoming_vehicle_id
    // 2) Externos (sem kit_schedule_id): fallback por placa exata
    const kitScheduleIds = Array.from(
      new Set(rows.map((r) => r.kit_schedule_id).filter(Boolean) as string[]),
    );

    const incomingByVehicleId = new Map<string, string>();
    const incomingByPlate = new Map<string, string>();

    if (kitScheduleIds.length > 0) {
      const { data: kits } = await supabase
        .from("kit_schedules")
        .select("id, incoming_vehicle_id")
        .in("id", kitScheduleIds)
        .not("incoming_vehicle_id", "is", null);

      const vehicleIds = Array.from(
        new Set((kits ?? []).map((k: any) => k.incoming_vehicle_id) as string[]),
      );
      if (vehicleIds.length > 0) {
        const { data: vehicles } = await supabase
          .from("incoming_vehicles")
          .select("id, pending_contract_id")
          .in("id", vehicleIds)
          .not("pending_contract_id", "is", null);
        for (const v of vehicles ?? []) incomingByVehicleId.set(v.id, String(v.pending_contract_id));
      }
    }

    const plates = Array.from(
      new Set(
        rows
          .filter((r) => !r.kit_schedule_id)
          .map((r) => String(r.plate ?? "").toUpperCase().trim())
          .filter(Boolean),
      ),
    );
    if (plates.length > 0) {
      const { data: vehiclesByPlate } = await supabase
        .from("incoming_vehicles")
        .select("id, plate, pending_contract_id, created_at")
        .in("plate", plates)
        .not("pending_contract_id", "is", null)
        .order("created_at", { ascending: false });
      for (const v of vehiclesByPlate ?? []) {
        const key = String(v.plate ?? "").toUpperCase().trim();
        if (!incomingByPlate.has(key)) incomingByPlate.set(key, String(v.pending_contract_id));
      }
    }

    const resolveContractCode = (r: Record<string, unknown>): string | null => {
      const plate = String(r.plate ?? "").toUpperCase().trim();
      return (
        (r.kit_schedule_id ? incomingByVehicleId.get(String(r.kit_schedule_id)) : undefined) ??
        incomingByPlate.get(plate) ??
        null
      );
    };

    const agendamentos = rows.map((s) => ({
      data: s.scheduled_date,
      hora: s.scheduled_time,
      servico: s.service,
      cliente: s.customer,
      placa: s.plate,
      modelo_rastreador: s.tracker_model,
      tipo_contrato: s.tipo_contrato,
      tecnico: s.technician_name,
      contractcode: resolveContractCode(s),
    }));

    return json({ agendamentos });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 200);
  }
});
