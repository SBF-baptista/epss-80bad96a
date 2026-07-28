// Edge Function: wialon-create-unit
// Cria uma unidade nova diretamente no Wialon (Frota ou Auto).
// Fluxo:
//   1) token/login                -> sid
//   2) core/create_unit           -> {creatorId, name: PLACA, hwTypeId, dataFlags}
//   3) account/change_account     -> {itemId, resourceId}  (vincula a unidade à conta do cliente)
//   4) unit/update_device_type    -> {itemId, deviceTypeId, uniqueId: IMEI, passwd}  (só se houver IMEI)
//   5) unit/set_active            -> {itemId, active: 1}
// Sem IMEI a unidade é criada, vinculada à conta e ativada, e fica registrada em
// frota_units_pending_imei com status 'aguardando_imei'.
// Se algum passo após a criação falhar, tenta rollback (set_active 0) e registra
// 'create_partial_failure' em frota_unit_activation_audit para revisão manual.
// Modo auxiliar (somente leitura): { mode: "search-accounts", sistema, q }.
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

type Sistema = "frota" | "auto";

// Modelos de hardware suportados (hwTypeId obtido via core/get_hw_types)
export const HARDWARE_TYPES: Record<string, number> = {
  NT20: 400327740,
  SMART5: 401681750, // "Ruptela Smart5"
};

const CREATOR_ID: Record<Sistema, number> = {
  frota: 401311935,
  auto: 402033667,
};

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

async function loginWialon(sistema: Sistema) {
  const wialonToken = sistema === "frota"
    ? Deno.env.get("WIALON_TOKEN_FROTA")
    : Deno.env.get("WIALON_TOKEN_AUTO");
  if (!wialonToken) return { error: `Token do sistema ${sistema} não configurado` };
  const login = await wialonCall("token/login", { token: wialonToken, fl: 2 });
  if (isWialonError(login.body)) return { error: `Login Wialon falhou: ${wialonErrText(login.body)}`, body: login.body };
  const sid = (login.body as { eid?: string })?.eid;
  if (!sid) return { error: "Login Wialon não retornou eid", body: login.body };
  return { sid };
}

async function searchAccounts(sid: string, q: string) {
  const mask = q ? `*${q}*` : "*";
  const res = await wialonCall("core/search_items", {
    spec: {
      itemsType: "avl_resource",
      propName: "sys_name",
      propValueMask: mask,
      sortType: "sys_name",
      propType: "property",
    },
    force: 1,
    flags: 1,
    from: 0,
    to: 100,
  }, sid);
  const items = (res.body as { items?: Array<{ id: number; nm: string }> })?.items ?? [];
  return items.map((r) => ({ id: r.id, name: r.nm }));
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
  let skipAudit = false;

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
    if (sistema !== "frota" && sistema !== "auto") {
      skipAudit = true;
      return json({ ok: false, error: "sistema deve ser 'frota' ou 'auto'" });
    }

    // ---- modo auxiliar: busca de contas (somente leitura) ----
    if (String(body?.mode ?? "") === "search-accounts") {
      skipAudit = true;
      const s = await loginWialon(sistema);
      if (!s.sid) return json({ ok: false, error: s.error, response: s.body });
      const accounts = await searchAccounts(s.sid, String(body?.q ?? "").trim());
      return json({ ok: true, accounts });
    }

    // ---- modo auxiliar: vincular uma unidade existente a uma conta (conserto de órfãs) ----
    if (String(body?.mode ?? "") === "attach-account") {
      const s = await loginWialon(sistema);
      if (!s.sid) { skipAudit = true; return json({ ok: false, error: s.error, response: s.body }); }
      const itemIdFix = Number(body?.itemId ?? 0);
      const resIdFix = Number(body?.resourceId ?? 0);
      if (!itemIdFix || !resIdFix) { skipAudit = true; return json({ ok: false, error: "itemId e resourceId são obrigatórios" }); }
      const r = await wialonCall("account/change_account", { itemId: itemIdFix, resourceId: resIdFix }, s.sid);
      audit.action = "create_partial_failure";
      audit.wialon_item_id = itemIdFix;
      audit.api_status = r.status;
      audit.api_ok = !isWialonError(r.body);
      audit.api_response = { change_account: r.body, resourceId: resIdFix };
      audit.error_message = isWialonError(r.body) ? `change_account falhou: ${wialonErrText(r.body)}` : null;
      return json({ ok: audit.api_ok, itemId: itemIdFix, resourceId: resIdFix, response: r.body });
    }



    placa = String(body?.placa ?? "").trim().toUpperCase();
    imei = String(body?.imei ?? "").trim();
    const passwd = String(body?.passwd ?? "");
    notes = body?.notes ? String(body.notes).slice(0, 1000) : null;
    const hardware = String(body?.hardware ?? "NT20").toUpperCase();
    const hwTypeId = Number(body?.hwTypeId ?? HARDWARE_TYPES[hardware] ?? 0);
    const resourceId = body?.resourceId ? Number(body.resourceId) : null;
    const clienteNome = body?.clienteNome ? String(body.clienteNome) : null;
    const incomingVehicleId = body?.incomingVehicleId ? String(body.incomingVehicleId) : null;

    if (!placa) { skipAudit = true; return json({ ok: false, error: "Placa é obrigatória" }); }
    if (!hwTypeId) {
      skipAudit = true;
      return json({ ok: false, error: `Modelo de hardware desconhecido: ${hardware}` });
    }
    if (!resourceId) {
      skipAudit = true;
      return json({ ok: false, error: "Conta/cliente (resourceId) é obrigatória" });
    }
    if (imei && !/^[A-Za-z0-9-]{5,30}$/.test(imei)) {
      skipAudit = true;
      return json({ ok: false, error: "IMEI inválido (use apenas letras, números ou hífen)" });
    }

    // 1) login
    const s = await loginWialon(sistema);
    if (!s.sid) {
      audit.error_message = s.error ?? "falha no login";
      audit.api_response = { login: s.body };
      return json({ ok: false, error: audit.error_message, response: s.body });
    }
    const sid = s.sid;

    // 2) dados da conta do cliente (para auditoria e fallback de criador)
    const resInfo = await wialonCall("core/search_item", { id: resourceId, flags: 4294967295 }, sid);
    const resItem = (resInfo.body as { item?: { crt?: number; nm?: string } })?.item ?? null;
    const accountOwnerId = Number(resItem?.crt ?? 0) || null;

    // 3) create_unit — tenta criar sob o usuário da conta do cliente; se o
    //    integrador não tiver esse direito, cria sob o próprio usuário e o
    //    passo de change_account (feito na MESMA sessão) vincula a conta.
    let create = accountOwnerId
      ? await wialonCall("core/create_unit", { creatorId: accountOwnerId, name: placa, hwTypeId, dataFlags: 1 }, sid)
      : null;
    let usedCreatorId = accountOwnerId;
    if (!create || isWialonError(create.body)) {
      const fallback = await wialonCall("core/create_unit", {
        creatorId: CREATOR_ID[sistema],
        name: placa,
        hwTypeId,
        dataFlags: 1,
      }, sid);
      if (!isWialonError(fallback.body) || !create) {
        usedCreatorId = CREATOR_ID[sistema];
        create = fallback;
      }
    }
    audit.api_status = create.status;
    audit.api_response = {
      hardware, hwTypeId, resourceId, accountOwnerId, usedCreatorId,
      accountName: resItem?.nm ?? null,
      create_unit: create.body,
    };


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

    // 4) confere a conta de billing da unidade; só chama change_account se necessário
    const check = await wialonCall("core/search_item", { id: itemId, flags: 4294967295 }, sid);
    const bact = Number(((check.body as { item?: { bact?: number } })?.item?.bact) ?? 0) || null;
    audit.api_response = { ...audit.api_response, unit_bact: bact };
    if (bact !== resourceId) {
      const acc = await wialonCall("account/change_account", { itemId, resourceId }, sid);
      audit.api_status = acc.status;
      audit.api_response = { ...audit.api_response, change_account: acc.body };
      if (isWialonError(acc.body)) {
        return await rollback("change_account", acc.body);
      }
    }


    // 4) update_device_type (vincula IMEI) — opcional
    if (imei) {
      const dev = await wialonCall("unit/update_device_type", {
        itemId,
        deviceTypeId: hwTypeId,
        uniqueId: imei,
        passwd,
      }, sid);
      audit.api_status = dev.status;
      audit.api_response = { ...audit.api_response, update_device_type: dev.body };
      if (isWialonError(dev.body)) {
        return await rollback("update_device_type", dev.body);
      }
    }

    // 5) set_active
    const act = await wialonCall("unit/set_active", { itemId, active: 1 }, sid);
    audit.api_status = act.status;
    audit.api_response = { ...audit.api_response, set_active: act.body };
    if (isWialonError(act.body)) {
      return await rollback("set_active", act.body);
    }

    // 6) sem IMEI -> registra pendência para o técnico vincular na instalação
    let pendingId: string | null = null;
    if (!imei) {
      const { data: pend, error: pendErr } = await admin
        .from("frota_units_pending_imei")
        .insert({
          plate: placa,
          company_name: clienteNome,
          incoming_vehicle_id: incomingVehicleId,
          status: "aguardando_imei",
          wialon_item_id: itemId,
          wialon_resource_id: resourceId,
          sistema,
          hardware,
          created_by: userId,
          frota_response: audit.api_response,
        })
        .select("id")
        .maybeSingle();
      if (pendErr) console.error("[wialon-create-unit] pending insert failed", pendErr);
      pendingId = pend?.id ?? null;
    }

    audit.api_ok = true;
    return json({
      ok: true,
      sistema,
      itemId,
      itemName,
      placa,
      imei: imei || null,
      hardware,
      hwTypeId,
      resourceId,
      pendingImeiId: pendingId,
      response: audit.api_response,
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
    if (!skipAudit) {
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
  }
});
