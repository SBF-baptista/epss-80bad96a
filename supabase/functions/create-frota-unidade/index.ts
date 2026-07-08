// Edge Function: create-frota-unidade
// POST https://frota-auto-aityd.ondigitalocean.app/api/unidade com headers HMAC
// (X-Timestamp, X-Nonce, X-Signature). Acionado após criação de agendamento.
//
// Body: { scheduleId: string }
// Sempre retorna 200 (regra do projeto: erros no corpo).

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

  try {
    const body = await req.json().catch(() => ({}));
    const scheduleId: string | undefined = body?.scheduleId;
    const installationScheduleId: string | undefined = body?.installationScheduleId;

    if ((!scheduleId || typeof scheduleId !== "string") &&
        (!installationScheduleId || typeof installationScheduleId !== "string")) {
      return json({ ok: false, error: "scheduleId ou installationScheduleId obrigatório" });
    }

    const apiKey = Deno.env.get("FROTA_SEGSALE_API_KEY");
    const baseUrl = Deno.env.get("FROTA_SEGSALE_BASE_URL") ||
      "https://frota-auto-aityd.ondigitalocean.app";
    if (!apiKey) return json({ ok: false, error: "FROTA_SEGSALE_API_KEY ausente" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve placa + customer_id a partir de qualquer origem
    let plate = "";
    let customerId: string | null = null;
    let sourceId = "";

    if (scheduleId) {
      const { data: schedule, error: sErr } = await supabase
        .from("kit_schedules")
        .select("id, vehicle_plate, customer_id")
        .eq("id", scheduleId)
        .maybeSingle();
      if (sErr || !schedule) {
        return json({ ok: false, error: `Agendamento (kit) não encontrado: ${sErr?.message ?? "n/a"}` });
      }
      plate = String(schedule.vehicle_plate ?? "").trim().toUpperCase();
      customerId = (schedule.customer_id as string | null) ?? null;
      sourceId = `kit:${scheduleId}`;
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

    if (!plate) return json({ ok: false, error: "Agendamento sem placa" });

    // Descobrir tipoContrato a partir do incoming_vehicles (usage_type vem do Segsale)
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
      // fallback: qualquer incoming_vehicle daquela placa
      const { data: iv2 } = await supabase
        .from("incoming_vehicles")
        .select("usage_type")
        .eq("plate", plate)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      usageType = iv2?.usage_type ?? null;
    }

    const tipoContrato = mapTipoContrato(usageType);

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
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": signature,
      },
      body,
    });

    const respText = await resp.text();
    let respJson: unknown = respText;
    try { respJson = JSON.parse(respText); } catch (_) { /* keep text */ }

    console.log(
      `[create-frota-unidade] source=${sourceId} plate=${plate} tipo=${tipoContrato} status=${resp.status}`,
    );

    if (!resp.ok) {
      return json({
        ok: false,
        status: resp.status,
        error: `Frota API ${resp.status}`,
        response: respJson,
        request: payload,
      });
    }

    return json({ ok: true, status: resp.status, response: respJson, request: payload });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-frota-unidade] ERROR", msg);
    return json({ ok: false, error: msg });
  }
});
