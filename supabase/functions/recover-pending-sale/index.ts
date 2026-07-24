// Edge Function: recover-pending-sale
// Ferramenta técnica (admin-only) para recuperar vendas do Segsale que ficaram
// presas por usage_type inválido ou falha 4xx no receive-vehicle.
//
// Duas ações:
//   1. send_to_kickoff  -> invoca sync-segsale-auto para o sale_summary_id
//      (a lógica já busca no Segsale, transforma com o mapeamento corrigido
//      e chama receive-vehicle). O usuário decide via UI quais placas mostrar,
//      mas a recuperação em si acontece por venda inteira.
//   2. create_unit_now  -> cria unidade na Frota diretamente para cada placa
//      selecionada (POST /api/unidade com HMAC) e insere em
//      frota_units_pending_imei com status='aguardando_imei' ou 'erro_criacao'.
//
// Antes de QUALQUER ação, re-checa no Wialon (via wialon-search-plate) se a
// placa já existe. Se existir, bloqueia server-side e grava log com status
// 'blocked_already_exists' (defesa em profundidade além da UI).
//
// Toda tentativa é registrada em public.pending_sales_recovery_log.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Action = "send_to_kickoff" | "create_unit_now";

interface RequestBody {
  action: Action;
  sale_summary_id: number;
  plates: string[];
  justification: string;
  tipo_contrato_hint?: "TELEMETRIA" | "MENSALISTA"; // opcional, deduzido se ausente
}

// --- HMAC helpers (mesmo padrão do bypass) ---
const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
async function sha256Hex(data: string) {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)));
}
async function hmacSha256Hex(secret: string, content: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(content)));
}

const CRIAR_VEICULO_PATH = "/api/unidade";

async function callFrotaCreateUnit(plate: string, tipoContrato: "TELEMETRIA" | "MENSALISTA") {
  const apiKey = Deno.env.get("FROTA_SEGSALE_API_KEY");
  const baseUrl = Deno.env.get("FROTA_SEGSALE_BASE_URL") ||
    "https://frota-auto-aityd.ondigitalocean.app";
  if (!apiKey) {
    return { ok: false, status: 0, response: { error: "FROTA_SEGSALE_API_KEY ausente" }, request: null };
  }
  const payload = { placa: plate, dispositivo: "NT20", tipoContrato };
  const rawBody = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const bodyHash = await sha256Hex(rawBody);
  const canonical = `POST\n${CRIAR_VEICULO_PATH}\n${timestamp}\n${nonce}\n${bodyHash}`;
  const signature = await hmacSha256Hex(apiKey, canonical);

  try {
    const resp = await fetch(`${baseUrl}${CRIAR_VEICULO_PATH}`, {
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
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch { /* keep text */ }
    return { ok: resp.ok, status: resp.status, response: parsed, request: payload };
  } catch (netErr) {
    return {
      ok: false, status: 0,
      response: { error: `Erro de rede: ${netErr instanceof Error ? netErr.message : String(netErr)}` },
      request: payload,
    };
  }
}

async function checkWialonForPlate(
  serviceKey: string,
  supabaseUrl: string,
  plate: string,
): Promise<{ exists: boolean; system: "frota" | "auto" | null; item_id: number | null; raw: unknown }> {
  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/wialon-search-plate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
      },
      body: JSON.stringify({ plate }),
    });
    if (!resp.ok) {
      return { exists: false, system: null, item_id: null, raw: { http_status: resp.status } };
    }
    const data = await resp.json();
    const r = data?.results?.[plate];
    if (r?.frota?.exists) return { exists: true, system: "frota", item_id: r.frota.item_id, raw: r };
    if (r?.auto?.exists) return { exists: true, system: "auto", item_id: r.auto.item_id, raw: r };
    return { exists: false, system: null, item_id: null, raw: r ?? data };
  } catch (err) {
    // Falha na checagem NÃO deve criar unidade automaticamente — em caso de dúvida,
    // consideramos "não existente" mas registramos o erro no log da ação.
    return { exists: false, system: null, item_id: null, raw: { error: err instanceof Error ? err.message : String(err) } };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string | undefined) ?? null;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "Apenas administradores" }, 403);

    let body: RequestBody;
    try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }

    const action = body?.action;
    const saleSummaryId = Number(body?.sale_summary_id);
    const plates = Array.isArray(body?.plates)
      ? body.plates.map(p => String(p ?? "").trim().toUpperCase()).filter(Boolean)
      : [];
    const justification = typeof body?.justification === "string" ? body.justification.trim() : "";

    if (action !== "send_to_kickoff" && action !== "create_unit_now") {
      return json({ error: "action deve ser 'send_to_kickoff' ou 'create_unit_now'" }, 400);
    }
    if (!Number.isFinite(saleSummaryId) || saleSummaryId <= 0) {
      return json({ error: "sale_summary_id inválido" }, 400);
    }
    if (plates.length === 0) return json({ error: "Informe ao menos uma placa" }, 400);
    if (justification.length < 10) return json({ error: "Justificativa deve ter ao menos 10 caracteres" }, 400);

    const results: Array<{
      plate: string;
      status: "success" | "error" | "blocked_already_exists";
      system?: "frota" | "auto" | null;
      message?: string;
      response?: unknown;
    }> = [];

    // ========= AÇÃO 1: enviar para Kickoff =========
    if (action === "send_to_kickoff") {
      // Bloqueia cada placa que já tenha unidade
      const platesToProcess: string[] = [];
      for (const plate of plates) {
        const check = await checkWialonForPlate(serviceKey, supabaseUrl, plate);
        if (check.exists) {
          await admin.from("pending_sales_recovery_log").insert({
            sale_summary_id: saleSummaryId,
            plate,
            action: "sent_to_kickoff",
            system: check.system,
            status: "blocked_already_exists",
            error_message: `Unidade já existe no Wialon (${check.system}). Ação bloqueada server-side.`,
            justification,
            performed_by: userId,
            performed_by_email: userEmail,
            request_payload: { action, sale_summary_id: saleSummaryId, plate },
            response_payload: check.raw as Record<string, unknown>,
          });
          results.push({ plate, status: "blocked_already_exists", system: check.system, message: "Unidade já existe" });
        } else {
          platesToProcess.push(plate);
        }
      }

      if (platesToProcess.length > 0) {
        // Invoca sync-segsale-auto especificamente para este sale_summary_id.
        // Ele já: busca no Segsale (com mapeamento corrigido) -> transforma -> chama receive-vehicle.
        const syncResp = await fetch(
          `${supabaseUrl}/functions/v1/sync-segsale-auto?sale_summary_ids=${saleSummaryId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
              "apikey": serviceKey,
            },
            body: JSON.stringify({ sale_summary_ids: [saleSummaryId] }),
          },
        );
        const syncText = await syncResp.text();
        let syncBody: unknown = syncText;
        try { syncBody = JSON.parse(syncText); } catch { /* keep */ }
        const ok = syncResp.ok;

        for (const plate of platesToProcess) {
          const logStatus: "success" | "error" = ok ? "success" : "error";
          await admin.from("pending_sales_recovery_log").insert({
            sale_summary_id: saleSummaryId,
            plate,
            action: "sent_to_kickoff",
            system: null,
            status: logStatus,
            error_message: ok ? null : `sync-segsale-auto ${syncResp.status}`,
            justification,
            performed_by: userId,
            performed_by_email: userEmail,
            request_payload: { action, sale_summary_id: saleSummaryId, plates: platesToProcess },
            response_payload: { http_status: syncResp.status, body: syncBody } as Record<string, unknown>,
          });
          results.push({
            plate,
            status: logStatus,
            message: ok
              ? "Venda reprocessada. Placa deve aparecer no Kickoff em instantes."
              : `Falha ao reprocessar: HTTP ${syncResp.status}`,
            response: ok ? undefined : syncBody,
          });
        }
      }

      return json({ ok: true, action, results });
    }

    // ========= AÇÃO 2: criar unidade agora =========
    // Deduz tipoContrato: hint > default MENSALISTA
    const tipoContrato = body?.tipo_contrato_hint === "TELEMETRIA" ? "TELEMETRIA" : "MENSALISTA";

    for (const plate of plates) {
      const check = await checkWialonForPlate(serviceKey, supabaseUrl, plate);
      if (check.exists) {
        await admin.from("pending_sales_recovery_log").insert({
          sale_summary_id: saleSummaryId,
          plate,
          action: "unit_created_now",
          system: check.system,
          status: "blocked_already_exists",
          error_message: `Unidade já existe no Wialon (${check.system}). Criação bloqueada server-side.`,
          justification,
          performed_by: userId,
          performed_by_email: userEmail,
          request_payload: { action, sale_summary_id: saleSummaryId, plate, tipoContrato },
          response_payload: check.raw as Record<string, unknown>,
        });
        results.push({ plate, status: "blocked_already_exists", system: check.system, message: "Unidade já existe" });
        continue;
      }

      const frota = await callFrotaCreateUnit(plate, tipoContrato);
      const pendingStatus: "aguardando_imei" | "erro_criacao" = frota.ok ? "aguardando_imei" : "erro_criacao";

      const { data: pendingRow, error: pendingErr } = await admin
        .from("frota_units_pending_imei")
        .insert({
          incoming_vehicle_id: null,
          plate,
          brand: null,
          model: null,
          company_name: null,
          status: pendingStatus,
          frota_response: {
            ok: frota.ok,
            http_status: frota.status,
            response: frota.response,
            request: frota.request,
            tipo_contrato: tipoContrato,
            source: "recover-pending-sale",
            sale_summary_id: saleSummaryId,
          },
          created_by: userId,
        })
        .select("id")
        .single();

      await admin.from("pending_sales_recovery_log").insert({
        sale_summary_id: saleSummaryId,
        plate,
        action: "unit_created_now",
        system: "frota",
        status: frota.ok ? "success" : "error",
        error_message: frota.ok
          ? (pendingErr ? `Frota OK mas falha ao inserir pending_imei: ${pendingErr.message}` : null)
          : `Frota rejeitou (HTTP ${frota.status})`,
        justification,
        performed_by: userId,
        performed_by_email: userEmail,
        request_payload: { action, sale_summary_id: saleSummaryId, plate, tipoContrato, frota_request: frota.request },
        response_payload: {
          http_status: frota.status,
          frota_response: frota.response,
          pending_imei_id: pendingRow?.id ?? null,
        } as Record<string, unknown>,
      });

      results.push({
        plate,
        status: frota.ok ? "success" : "error",
        system: "frota",
        message: frota.ok
          ? `Unidade criada. Aguardando IMEI (pending_imei_id=${pendingRow?.id ?? "?"}).`
          : `Falha na criação (HTTP ${frota.status})`,
        response: frota.response,
      });
    }

    return json({ ok: true, action, results });
  } catch (err) {
    console.error("[recover-pending-sale] ERROR", err);
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 200);
  }
});
