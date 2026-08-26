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
    const limit = Math.min(Number(p("limit") ?? 100) || 100, 1000);
    const page = Math.max(Number(p("page") ?? 1) || 1, 1);
    const from = (page - 1) * limit;

    let query = supabase
      .from("installation_schedules")
      .select("*", { count: "exact" })
      .order("scheduled_date", { ascending: false })
      .order("scheduled_time", { ascending: true })
      .range(from, from + limit - 1);

    if (placa) query = query.ilike("plate", `%${String(placa).toUpperCase().trim()}%`);
    if (dataInicio) query = query.gte("scheduled_date", String(dataInicio));
    if (dataFim) query = query.lte("scheduled_date", String(dataFim));
    if (tecnico) query = query.ilike("technician_name", `%${tecnico}%`);
    if (cliente) query = query.ilike("customer", `%${cliente}%`);
    if (contrato) query = query.eq("tipo_contrato", String(contrato));

    const { data, error, count } = await query;
    if (error) return json({ ok: false, error: error.message }, 200);

    const agendamentos = (data ?? []).map((s: Record<string, unknown>) => ({
      data: s.scheduled_date,
      hora: s.scheduled_time,
      servico: s.service,
      cliente: s.customer,
      placa: s.plate,
      modelo_rastreador: s.tracker_model,
      tipo_contrato: s.tipo_contrato,
      tecnico: s.technician_name,
    }));

    return json({ agendamentos });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 200);
  }
});
