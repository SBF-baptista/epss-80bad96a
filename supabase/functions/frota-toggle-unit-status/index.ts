// Edge Function: frota-toggle-unit-status
// Ativa (ativo=true) ou desativa (ativo=false) uma unidade na Frota via
// POST https://frota-auto-aityd.ondigitalocean.app/api/unidade/status
// Body: { filialContrato: string, tipoContrato: 'TELEMETRIA'|'MENSALISTA', action: 'activate'|'deactivate', notes?: string }
// Restrito a admins. Registra auditoria em public.frota_unit_activation_audit.
// Sempre retorna 200 (regra do projeto: erro no corpo).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const TOGGLE_URL = "https://frota-auto-aityd.ondigitalocean.app/api/unidade/status";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ ok: false, error: "Não autenticado" });

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ ok: false, error: "Sessão inválida" });
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? null;

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ ok: false, error: "Apenas administradores" });

    const body = await req.json().catch(() => ({}));
    const filialContrato = String(body?.filialContrato ?? "").trim();
    const tipoContrato = String(body?.tipoContrato ?? "").trim().toUpperCase();
    const action = String(body?.action ?? "").toLowerCase();
    const notes = body?.notes ? String(body.notes).slice(0, 1000) : null;

    if (!filialContrato) return json({ ok: false, error: "filialContrato obrigatório" });
    if (tipoContrato !== "TELEMETRIA" && tipoContrato !== "MENSALISTA") {
      return json({ ok: false, error: "tipoContrato deve ser TELEMETRIA ou MENSALISTA" });
    }
    if (action !== "activate" && action !== "deactivate") {
      return json({ ok: false, error: "action deve ser 'activate' ou 'deactivate'" });
    }

    const ativo = action === "activate";
    const payload = { filialContrato, ativo, tipoContrato };

    let apiStatus = 0;
    let apiResp: unknown = null;
    let apiOk = false;
    let errorMessage: string | null = null;

    try {
      const resp = await fetch(TOGGLE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      apiStatus = resp.status;
      const text = await resp.text();
      try { apiResp = JSON.parse(text); } catch { apiResp = text; }
      apiOk =
        resp.ok &&
        typeof apiResp === "object" &&
        apiResp !== null &&
        (apiResp as Record<string, unknown>).ativo === ativo;
      if (!apiOk && !errorMessage) {
        errorMessage = `API respondeu ${apiStatus} sem confirmar ${ativo ? "ativação" : "desativação"}`;
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    await admin.from("frota_unit_activation_audit").insert({
      filial_contrato: filialContrato,
      tipo_contrato: tipoContrato,
      action,
      requested_by: userId,
      requested_by_email: userEmail,
      api_status: apiStatus || null,
      api_ok: apiOk,
      api_response: apiResp as Record<string, unknown> | null,
      error_message: errorMessage,
      notes,
    });

    return json({
      ok: apiOk,
      status: apiStatus,
      request: payload,
      response: apiResp,
      error: apiOk ? null : errorMessage,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[frota-toggle-unit-status] ERROR", msg);
    return json({ ok: false, error: msg });
  }
});
