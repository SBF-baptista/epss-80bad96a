// Edge Function: create-frota-unidade
// POST https://frota-auto-aityd.ondigitalocean.app/api/unidade com headers HMAC
// (X-Timestamp, X-Nonce, X-Signature). Acionado após criação de agendamento.
//
// Body: { scheduleId?: string, installationScheduleId?: string, tipoContrato?: 'TELEMETRIA'|'MENSALISTA', force?: boolean }
// Sempre retorna 200 (regra do projeto: erros no corpo).
//
// Rastreia o status em kit_schedules.frota_unit_status/error/attempts/created_at/last_attempt_at.
// Idempotente: se já foi criado (status='created'), não recria, a menos que body.force === true.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const CRIAR_VEICULO_PATH = "/api/unidade";

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return toHex(buf);
}

async function hmacSha256Hex(secret: string, content: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(content));
  return toHex(sig);
}

function mapTipoContrato(usage?: string | null): "TELEMETRIA" | "MENSALISTA" {
  const u = String(usage ?? "").toLowerCase();
  if (u.includes("telemetr")) return "TELEMETRIA";
  return "MENSALISTA";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Marca falha em kit_schedules (best-effort)
  const markFailure = async (id: string | undefined, message: string) => {
    if (!id) return;
    try {
      await supabase
        .from("kit_schedules")
        .update({
          frota_unit_status: "failed",
          frota_unit_error: message?.slice(0, 2000) ?? "erro desconhecido",
          frota_unit_last_attempt_at: new Date().toISOString(),
        })
        .eq("id", id);
    } catch (e) {
      console.error("[create-frota-unidade] markFailure error", e);
    }
  };

  let scheduleId: string | undefined;

  try {
    const reqBody = await req.json().catch(() => ({}));
    scheduleId = reqBody?.scheduleId;
    const installationScheduleId: string | undefined = reqBody?.installationScheduleId;
    const force: boolean = reqBody?.force === true;

    if ((!scheduleId || typeof scheduleId !== "string") &&
        (!installationScheduleId || typeof installationScheduleId !== "string")) {
      return json({ ok: false, error: "scheduleId ou installationScheduleId obrigatório" });
    }

    const apiKey = Deno.env.get("FROTA_SEGSALE_API_KEY");
    const baseUrl = Deno.env.get("FROTA_SEGSALE_BASE_URL") ||
      "https://frota-auto-aityd.ondigitalocean.app";
    if (!apiKey) {
      const msg = "FROTA_SEGSALE_API_KEY ausente";
      await markFailure(scheduleId, msg);
      return json({ ok: false, error: msg });
    }

    // Resolve placa + customer_id a partir de qualquer origem
    let plate = "";
    let customerId: string | null = null;
    let sourceId = "";
    let currentStatus: string | null = null;
    let currentAttempts = 0;

    if (scheduleId) {
      const { data: schedule, error: sErr } = await supabase
        .from("kit_schedules")
        .select("id, vehicle_plate, customer_id, frota_unit_status, frota_unit_attempts")
        .eq("id", scheduleId)
        .maybeSingle();
      if (sErr || !schedule) {
        return json({ ok: false, error: `Agendamento (kit) não encontrado: ${sErr?.message ?? "n/a"}` });
      }
      plate = String(schedule.vehicle_plate ?? "").trim().toUpperCase();
      customerId = (schedule.customer_id as string | null) ?? null;
      currentStatus = (schedule as any).frota_unit_status ?? null;
      currentAttempts = Number((schedule as any).frota_unit_attempts ?? 0);
      sourceId = `kit:${scheduleId}`;

      // Idempotência: se já criado com sucesso, não recriar (a menos que force)
      if (currentStatus === "created" && !force) {
        return json({
          ok: true,
          skipped: true,
          reason: "Unidade já criada previamente para este agendamento",
        });
      }
    } else {
      const { data: inst, error: iErr } = await supabase
        .from("installation_schedules")
        .select("id, plate, customer")
        .eq("id", installationScheduleId!)
        .maybeSingle();
      if (iErr || !inst) {
        return json({ ok: false, error: `Agendamento (installation) não encontrado: ${iErr?.message ?? "n/a"}` });
      }
      plate = String(inst.plate ?? "").trim().toUpperCase();
      sourceId = `installation:${installationScheduleId}`;
    }

    if (!plate) {
      const msg = "Agendamento sem placa";
      await markFailure(scheduleId, msg);
      return json({ ok: false, error: msg });
    }

    // Marcar tentativa (best-effort) antes da chamada
    if (scheduleId) {
      try {
        await supabase
          .from("kit_schedules")
          .update({
            frota_unit_attempts: currentAttempts + 1,
            frota_unit_last_attempt_at: new Date().toISOString(),
          })
          .eq("id", scheduleId);
      } catch (e) {
        console.error("[create-frota-unidade] pre-update attempts error", e);
      }
    }

    // Descobrir tipoContrato
    let usageType: string | null = null;
    let saleSummaryId: number | null = null;

    if (customerId) {
      const { data: c } = await supabase
        .from("customers")
        .select("sale_summary_id")
        .eq("id", customerId)
        .maybeSingle();
      saleSummaryId = (c?.sale_summary_id as number | undefined) ?? null;
    }

    if (saleSummaryId) {
      const { data: iv } = await supabase
        .from("incoming_vehicles")
        .select("usage_type")
        .eq("sale_summary_id", saleSummaryId)
        .eq("plate", plate)
        .maybeSingle();
      usageType = iv?.usage_type ?? null;
    }

    if (!usageType) {
      const { data: iv2 } = await supabase
        .from("incoming_vehicles")
        .select("usage_type")
        .eq("plate", plate)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      usageType = iv2?.usage_type ?? null;
    }

    const overrideTipo = String(reqBody?.tipoContrato ?? "").toUpperCase();
    const tipoContrato =
      overrideTipo === "TELEMETRIA" || overrideTipo === "MENSALISTA"
        ? (overrideTipo as "TELEMETRIA" | "MENSALISTA")
        : mapTipoContrato(usageType);

    const payload = {
      placa: plate,
      dispositivo: "NT20",
      tipoContrato,
    };

    const body = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = crypto.randomUUID();
    const bodyHash = await sha256Hex(body);
    const canonical = `POST\n${CRIAR_VEICULO_PATH}\n${timestamp}\n${nonce}\n${bodyHash}`;
    const signature = await hmacSha256Hex(apiKey, canonical);

    const url = `${baseUrl}${CRIAR_VEICULO_PATH}`;

    let resp: Response;
    try {
      resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Timestamp": timestamp,
          "X-Nonce": nonce,
          "X-Signature": signature,
        },
        body,
      });
    } catch (netErr) {
      const msg = `Erro de rede ao chamar Frota API: ${netErr instanceof Error ? netErr.message : String(netErr)}`;
      await markFailure(scheduleId, msg);
      return json({ ok: false, error: msg });
    }

    const respText = await resp.text();
    let respJson: unknown = respText;
    try { respJson = JSON.parse(respText); } catch (_) { /* keep text */ }

    console.log(
      `[create-frota-unidade] source=${sourceId} plate=${plate} tipo=${tipoContrato} status=${resp.status}`,
    );

    if (!resp.ok) {
      const errMsg = `Frota API ${resp.status}: ${typeof respJson === "string" ? respJson : JSON.stringify(respJson)}`;
      await markFailure(scheduleId, errMsg);
      return json({
        ok: false,
        status: resp.status,
        error: errMsg,
        response: respJson,
        request: payload,
      });
    }

    // Sucesso
    if (scheduleId) {
      try {
        await supabase
          .from("kit_schedules")
          .update({
            frota_unit_status: "created",
            frota_unit_created_at: new Date().toISOString(),
            frota_unit_error: null,
          })
          .eq("id", scheduleId);
      } catch (e) {
        console.error("[create-frota-unidade] success-update error", e);
      }
    }

    return json({ ok: true, status: resp.status, response: respJson, request: payload });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-frota-unidade] ERROR", msg);
    await markFailure(scheduleId, msg);
    return json({ ok: false, error: msg });
  }
});
