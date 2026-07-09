// Edge Function: check-plate-dispatch (admin)
// Recebe { placa } e retorna:
//  - Registros locais (installation_schedules, kit_schedules, incoming_vehicles)
//  - Resultado de tentativa POST /api/unidade no Frota (200 = criado agora; 500 c/ "Saga executada" = provavelmente já existe)
// Sempre retorna 200; erros vêm no corpo.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
async function sha256Hex(data: string) {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)));
}
async function hmacSha256Hex(secret: string, content: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(content)));
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
    const plate = String(body.placa ?? "").trim().toUpperCase();
    const tipoContratoOverride = String(body.tipoContrato ?? "").toUpperCase();
    const dispositivo = String(body.dispositivo ?? "NT20");
    if (!plate) return json({ ok: false, error: "placa obrigatória" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Local DB lookups
    const [instRes, kitRes, ivRes] = await Promise.all([
      supabase.from("installation_schedules")
        .select("id, plate, customer, vehicle_model, scheduled_date, scheduled_time, status, tipo_contrato, created_at")
        .eq("plate", plate).order("created_at", { ascending: false }).limit(10),
      supabase.from("kit_schedules")
        .select("id, vehicle_plate, customer_name, vehicle_model, scheduled_date, installation_time, status, created_at")
        .eq("vehicle_plate", plate).order("created_at", { ascending: false }).limit(10),
      supabase.from("incoming_vehicles")
        .select("id, plate, company_name, brand, vehicle, usage_type, sale_summary_id, received_at, created_at")
        .eq("plate", plate).order("created_at", { ascending: false }).limit(10),
    ]);

    // Descobrir usage_type mais recente para inferir tipoContrato
    const usageType = (ivRes.data ?? [])[0]?.usage_type ?? null;
    const tipoContrato =
      tipoContratoOverride === "TELEMETRIA" || tipoContratoOverride === "MENSALISTA"
        ? (tipoContratoOverride as "TELEMETRIA" | "MENSALISTA")
        : mapTipoContrato(usageType);

    // Frota check via POST /api/unidade
    const apiKey = Deno.env.get("FROTA_SEGSALE_API_KEY");
    const baseUrl = Deno.env.get("FROTA_SEGSALE_BASE_URL") || "https://frota-auto-aityd.ondigitalocean.app";
    let frota: unknown = { ok: false, error: "FROTA_SEGSALE_API_KEY ausente" };
    if (apiKey) {
      const path = "/api/unidade";
      const payload = { placa: plate, dispositivo, tipoContrato };
      const rawBody = JSON.stringify(payload);
      const timestamp = String(Math.floor(Date.now() / 1000));
      const nonce = crypto.randomUUID();
      const bodyHash = await sha256Hex(rawBody);
      const canonical = `POST\n${path}\n${timestamp}\n${nonce}\n${bodyHash}`;
      const signature = await hmacSha256Hex(apiKey, canonical);
      try {
        const resp = await fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Timestamp": timestamp,
            "X-Nonce": nonce,
            "X-Signature": signature,
          },
          body: rawBody,
        });
        const text = await resp.text();
        let parsed: unknown = text; try { parsed = JSON.parse(text); } catch { /* */ }

        // Interpretação
        // 200/201: criado agora
        // 500 com "Saga executada" ou mensagens de duplicidade: já existe
        // outros: erro
        const respStr = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
        let interpretation: "created_now" | "already_exists" | "error" = "error";
        if (resp.ok) interpretation = "created_now";
        else if (resp.status === 500 && /Saga executada|já existe|duplic/i.test(respStr)) {
          interpretation = "already_exists";
        }
        frota = {
          ok: resp.ok,
          status: resp.status,
          interpretation,
          request: payload,
          response: parsed,
        };
      } catch (err) {
        frota = { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }

    return json({
      ok: true,
      placa: plate,
      local: {
        installation_schedules: instRes.data ?? [],
        kit_schedules: kitRes.data ?? [],
        incoming_vehicles: ivRes.data ?? [],
      },
      tipoContratoUsado: tipoContrato,
      usageTypeDetectado: usageType,
      frota,
    });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});
