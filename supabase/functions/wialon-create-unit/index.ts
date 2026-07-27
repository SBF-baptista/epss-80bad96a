// Edge Function: wialon-create-unit
// Cria uma unidade nova diretamente no Wialon (Frota ou Auto), com IMEI obrigatório.
// Fluxo:
//   1) token/login                -> sid
//   2) core/create_unit           -> {creatorId, name: PLACA, hwTypeId: 400327740, dataFlags}
//   3) unit/update_device_type    -> {itemId, deviceTypeId, uniqueId: IMEI, passwd}
//   4) unit/set_active            -> {itemId, active: 1}
// Se 3 ou 4 falharem após a unidade já existir, tenta rollback (set_active 0) e
// registra 'create_partial_failure' em frota_unit_activation_audit para revisão manual.
// Restrito a admin. Sempre responde 200 (erros no corpo).

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

const WIALON_BASE = "https://frota-api.segsat.com/wialon/ajax.html";

const HW_TYPE_ID_NT20 = 400327740;
const CREATOR_ID: Record<Sistema, number> = {
  frota: 401311935,
  auto: 402033667,
};

type Sistema = "frota" | "auto";

async function wialonCall(svc: string, params: unknown, sid?: string) {
  const url = new URL(WIALON_BASE);
  url.searchParams.set("svc", svc);
  url.searchParams.set("params", JSON.stringify(params));
  if (sid) url.searchParams.set("sid", sid);
  const resp = await fetch(url.toString(), { method: "POST" });
  const text = await resp.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* keep raw text */ }
  return { status: resp.status, body };
}

function isWialonError(b: unknown): b is { error: number; reason?: string } {
  return typeof b === "object" && b !== null && "error" in (b as Record<string, unknown>);
}

function wialonErrText(b: unknown) {
  if (isWialonError(b)) return `erro ${b.error}${b.reason ? ` (${b.reason})` : ""}`;
  return "resposta inesperada";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let sistema: Sistema | null = null;
  let placa = "";
  let imei = "";
  let notes: string | null = null;
  let userId: string | null = null;
  let userEmail: string | null = null;

  const audit = {
    action: "create" as "create" | "create_partial_failure",
    api_status: null as number | null,
    api_ok: false,
    api_response: {} as Record<string, unknown>,
    error_message: null as string | null,
    wialon_item_id: null as number | null,
    wialon_item_name: null as string | null,
  };

  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ ok: false, error: "Não autenticado" });

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ ok: false, error: "Sessão inválida" });
    userId = userData.user.id;
    userEmail = userData.user.email ?? null;

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ ok: false, error: "Apenas administradores" });

    const body = await req.json().catch(() => ({}));
    sistema = String(body?.sistema ?? "").toLowerCase() as Sistema;
    placa = String(body?.placa ?? "").trim().toUpperCase();
    imei = String(body?.imei ?? "").trim();
    const passwd = String(body?.passwd ?? "");
    notes = body?.notes ? String(body.notes).slice(0, 1000) : null;

    if (sistema !== "frota" && sistema !== "auto") {
      return json({ ok: false, error: "sistema deve ser 'frota' ou 'auto'" });
    }
    if (!placa) return json({ ok: false, error: "Placa é obrigatória" });
    if (!imei) return json({ ok: false, error: "IMEI é obrigatório" });
    if (!/^[A-Za-z0-9-]{5,30}$/.test(imei)) {
      return json({ ok: false, error: "IMEI inválido (use apenas letras, números ou hífen)" });
    }

    const wialonToken = sistema === "frota"
      ? Deno.env.get("WIALON_TOKEN_FROTA")
      : Deno.env.get("WIALON_TOKEN_AUTO");
    if (!wialonToken) {
      audit.error_message = `Token do sistema ${sistema} não configurado`;
      return json({ ok: false, error: audit.error_message });
    }

    // 1) login
    const login = await wialonCall("token/login", { token: wialonToken, fl: 2 });
    audit.api_status = login.status;
    if (isWialonError(login.body)) {
      audit.error_message = `Login Wialon falhou: ${wialonErrText(login.body)}`;
      audit.api_response = { login: login.body };
      return json({ ok: false, error: audit.error_message, response: login.body });
    }
    const sid = (login.body as { eid?: string })?.eid;
    if (!sid) {
      audit.error_message = "Login Wialon não retornou eid";
      audit.api_response = { login: login.body };
      return json({ ok: false, error: audit.error_message, response: login.body });
    }

    // 2) create_unit
    const create = await wialonCall("core/create_unit", {
      creatorId: CREATOR_ID[sistema],
      name: placa,
      hwTypeId: HW_TYPE_ID_NT20,
      dataFlags: 1,
    }, sid);
    audit.api_status = create.status;
    audit.api_response = { create_unit: create.body };
    if (isWialonError(create.body)) {
      audit.error_message = `core/create_unit falhou: ${wialonErrText(create.body)}`;
      return json({ ok: false, step: "create_unit", error: audit.error_message, response: create.body });
    }
    const created = create.body as { item?: { id?: number; nm?: string }; id?: number; nm?: string };
    const itemId = created?.item?.id ?? created?.id ?? null;
    const itemName = created?.item?.nm ?? created?.nm ?? placa;
    if (!itemId) {
      audit.error_message = "core/create_unit não retornou itemId";
      return json({ ok: false, step: "create_unit", error: audit.error_message, response: create.body });
    }
    audit.wialon_item_id = itemId;
    audit.wialon_item_name = itemName;

    // helper de rollback: unidade existe mas ficou incompleta
    const rollback = async (failedStep: string, failBody: unknown) => {
      audit.action = "create_partial_failure";
      audit.error_message =
        `FALHA PARCIAL em ${failedStep}: ${wialonErrText(failBody)}. ` +
        `A unidade ${itemName} (itemId ${itemId}) FOI CRIADA no sistema ${sistema} e precisa de revisão manual.`;
      const off = await wialonCall("unit/set_active", { itemId, active: 0 }, sid);
      audit.api_response = {
        ...audit.api_response,
        [failedStep]: failBody,
        rollback_set_active_0: off.body,
        rollback_ok: !isWialonError(off.body),
      };
      return json({
        ok: false,
        step: failedStep,
        error: audit.error_message,
        itemId,
        itemName,
        sistema,
        rollbackApplied: !isWialonError(off.body),
        response: failBody,
      });
    };

    // 3) update_device_type (vincula IMEI)
    const dev = await wialonCall("unit/update_device_type", {
      itemId,
      deviceTypeId: HW_TYPE_ID_NT20,
      uniqueId: imei,
      passwd,
    }, sid);
    audit.api_status = dev.status;
    audit.api_response = { ...audit.api_response, update_device_type: dev.body };
    if (isWialonError(dev.body)) {
      return await rollback("update_device_type", dev.body);
    }

    // 4) set_active
    const act = await wialonCall("unit/set_active", { itemId, active: 1 }, sid);
    audit.api_status = act.status;
    audit.api_response = { ...audit.api_response, set_active: act.body };
    if (isWialonError(act.body)) {
      return await rollback("set_active", act.body);
    }

    audit.api_ok = true;
    return json({
      ok: true,
      sistema,
      itemId,
      itemName,
      placa,
      imei,
      response: { create: create.body, device: dev.body, active: act.body },
    });
  } catch (err) {
    audit.error_message = err instanceof Error ? err.message : String(err);
    if (audit.wialon_item_id) {
      audit.action = "create_partial_failure";
      audit.error_message =
        `FALHA PARCIAL (exceção): ${audit.error_message}. ` +
        `Unidade itemId ${audit.wialon_item_id} pode ter sido criada — revisar manualmente.`;
    }
    console.error("[wialon-create-unit] ERROR", audit.error_message);
    return json({ ok: false, error: audit.error_message, itemId: audit.wialon_item_id });
  } finally {
    try {
      await admin.from("frota_unit_activation_audit").insert({
        sistema: sistema ?? "frota",
        action: audit.action,
        requested_by: userId,
        requested_by_email: userEmail,
        api_status: audit.api_status,
        api_ok: audit.api_ok,
        api_response: audit.api_response,
        error_message: audit.error_message,
        notes,
        placa: placa || null,
        imei: imei || null,
        wialon_item_id: audit.wialon_item_id,
        wialon_item_name: audit.wialon_item_name,
      });
    } catch (e) {
      console.error("[wialon-create-unit] audit insert failed", e);
    }
  }
});
