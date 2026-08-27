import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Apenas POST é permitido" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ ok: false, error: "Corpo da requisição deve ser JSON válido" }, 400);
    }

    const {
      data,        // YYYY-MM-DD
      hora,        // HH:MM
      cliente,
      placa,
      servico,
      tecnico,
      tecnico_whatsapp,
      endereco,
      modelo_veiculo,
      modelo_rastreador,
      tipo_contrato,
      telefone,
      contato_local,
      ponto_referencia,
      observacao,
      ano_veiculo,
      modelo_equipamento,
      agendado_por,
    } = body as Record<string, unknown>;

    // Validação dos obrigatórios
    const missing: string[] = [];
    if (!data) missing.push("data");
    if (!hora) missing.push("hora");
    if (!cliente) missing.push("cliente");
    if (!placa) missing.push("placa");
    if (!servico) missing.push("servico");
    if (!tecnico) missing.push("tecnico");
    if (missing.length > 0) {
      return json({ ok: false, error: "Campos obrigatórios ausentes", missing }, 400);
    }

    // Normalizações
    const plate = String(placa).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
    if (plate.length !== 7) {
      return json({ ok: false, error: "Placa deve ter 7 dígitos (formato Mercosul)" }, 400);
    }

    const dateStr = String(data);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return json({ ok: false, error: "data deve estar no formato YYYY-MM-DD" }, 400);
    }

    const timeStr = String(hora).slice(0, 5);
    if (!/^\d{2}:\d{2}$/.test(timeStr)) {
      return json({ ok: false, error: "hora deve estar no formato HH:MM" }, 400);
    }

    const insert = {
      scheduled_date: dateStr,
      scheduled_time: timeStr,
      technician_name: String(tecnico),
      technician_whatsapp: tecnico_whatsapp ? String(tecnico_whatsapp) : "",
      customer: String(cliente),
      address: endereco ? String(endereco) : "",
      plate,
      service: String(servico),
      vehicle_model: modelo_veiculo ? String(modelo_veiculo) : "",
      tracker_model: modelo_rastreador ? String(modelo_rastreador) : "",
      scheduled_by: agendado_por ? String(agendado_por) : "api_externa",
      phone: telefone ? String(telefone) : null,
      local_contact: contato_local ? String(contato_local) : null,
      reference_point: ponto_referencia ? String(ponto_referencia) : null,
      observation: observacao ? String(observacao) : null,
      tipo_contrato: tipo_contrato ? String(tipo_contrato) : null,
      vehicle_year: ano_veiculo ? String(ano_veiculo) : null,
      equipment_model: modelo_equipamento ? String(modelo_equipamento) : null,
    };

    const { data: inserted, error } = await supabase
      .from("installation_schedules")
      .insert(insert)
      .select("id, scheduled_date, scheduled_time, plate, customer")
      .single();

    if (error) return json({ ok: false, error: error.message }, 200);

    return json({
      ok: true,
      agendamento: {
        id: inserted.id,
        data: inserted.scheduled_date,
        hora: inserted.scheduled_time,
        placa: inserted.plate,
        cliente: inserted.customer,
      },
    }, 201);
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 200);
  }
});
