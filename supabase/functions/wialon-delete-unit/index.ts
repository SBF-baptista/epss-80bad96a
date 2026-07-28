// Edge Function: wialon-delete-unit
// Remove definitivamente uma unidade do Wialon (item/delete_item).
// Uso restrito a admin. Registra em frota_unit_activation_audit ('delete' / 'delete_failed').
// Sempre responde 200 (erros no corpo).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-diag-key",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const WIALON_BASE = "https://frota-api.segsat.com/wialon/ajax.html";

type Sistema = "frota" | "auto";

async function wialonCall(svc: string, params: unknown, sid?: string) {
  const url = new URL(WIALON_BASE);
  url.searchParams.set("svc", svc);
  url.searchParams.set("params", JSON.stringify(params));
  if (sid) url.searchParams.set("sid", sid);
  const resp = await fetch(url.toString(), { method: "POST" });
  const text = await resp.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* keep raw */ }
  return { status: resp.status, body };
}

function isWialonError(b: unknown): b is { error: number; reason?: string } {
  return typeof b === "object" && b !== null && "error" in (b as Record<string, unknown>);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let userId: string | null = null;
  let userEmail: string | null = null;
  let sistema: Sistema = "frota";
  let itemId: number | null = null;
  let notes: string | null = null;
  let skipAudit = false;
  const audit = {
    action: "delete" as "delete" | "delete_failed",
    api_status: null as number | null,
    api_ok: false,
    api_response: {} as Record<string, unknown>,
    error_message: null as string | null,
    itemName: null as string | null,
  };

  try {
    const diagKey = Deno.env.get("WIALON_DIAG_KEY_TMP");
    const viaDiagKey = !!diagKey && req.headers.get("x-diag-key") === diagKey;

    if (!viaDiagKey) {
      const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (!token) { skipAudit = true; return json({ ok: false, error: "Não autenticado" }); }
      const { data: userData, error: userErr } = await admin.auth.getUser(token);
      if (userErr || !userData?.user) { skipAudit = true; return json({ ok: false, error: "Sessão inválida" }); }
      userId = userData.user.id;
      userEmail = userData.user.email ?? null;
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!isAdmin) { skipAudit = true; return json({ ok: false, error: "Apenas administradores" }); }
    }

    const body = await req.json().catch(() => ({}));
    sistema = String(body?.sistema ?? "").toLowerCase() as Sistema;
    itemId = Number(body?.itemId ?? 0) || null;
    notes = body?.notes ? String(body.notes).slice(0, 1000) : null;

    if (sistema !== "frota" && sistema !== "auto") {
      skipAudit = true;
      return json({ ok: false, error: "sistema deve ser 'frota' ou 'auto'" });
    }
    if (!itemId) { skipAudit = true; return json({ ok: false, error: "itemId é obrigatório" }); }

    const wialonToken = sistema === "frota"
      ? Deno.env.get("WIALON_TOKEN_FROTA")
      : Deno.env.get("WIALON_TOKEN_AUTO");
    if (!wialonToken) {
      audit.error_message = `Token do sistema ${sistema} não configurado`;
      audit.action = "delete_failed";
      return json({ ok: false, error: audit.error_message });
    }

    const login = await wialonCall("token/login", { token: wialonToken, fl: 2 });
    if (isWialonError(login.body)) {
      audit.action = "delete_failed";
      audit.error_message = `Login Wialon falhou (erro ${login.body.error})`;
      audit.api_response = { login: login.body };
      return json({ ok: false, error: audit.error_message, response: login.body });
    }
    const sid = (login.body as { eid?: string })?.eid;
    if (!sid) {
      audit.action = "delete_failed";
      audit.error_message = "Login Wialon não retornou eid";
      return json({ ok: false, error: audit.error_message });
    }

    // snapshot antes de apagar (nome atual)
    const before = await wialonCall("core/search_item", { id: itemId, flags: 1 }, sid);
    const beforeItem = (before.body as { item?: { nm?: string } })?.item ?? null;
    audit.itemName = beforeItem?.nm ?? null;

    const del = await wialonCall("item/delete_item", { itemId }, sid);
    audit.api_status = del.status;
    audit.api_response = { before: before.body, delete_item: del.body };
    if (isWialonError(del.body)) {
      audit.action = "delete_failed";
      audit.error_message = `item/delete_item falhou: erro ${del.body.error}${del.body.reason ? ` (${del.body.reason})` : ""}`;
      return json({ ok: false, error: audit.error_message, response: del.body });
    }

    audit.api_ok = true;
    return json({ ok: true, sistema, itemId, itemName: audit.itemName, response: del.body });
  } catch (err) {
    audit.action = "delete_failed";
    audit.error_message = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: audit.error_message });
  } finally {
    if (!skipAudit) {
      try {
        await admin.from("frota_unit_activation_audit").insert({
          sistema,
          action: audit.action,
          requested_by: userId,
          requested_by_email: userEmail,
          api_status: audit.api_status,
          api_ok: audit.api_ok,
          api_response: audit.api_response,
          error_message: audit.error_message,
          notes,
          wialon_item_id: itemId,
          wialon_item_name: audit.itemName,
        });
      } catch (e) {
        console.error("[wialon-delete-unit] audit insert failed", e);
      }
    }
  }
});
