// Edge Function: wialon-toggle-unit
// Ativa/desativa uma unidade JÁ EXISTENTE no Wialon (Frota ou Auto),
// chamando diretamente https://frota-api.segsat.com/wialon/ajax.html
// Passos:
//   1) svc=token/login  -> obtém sid (eid)
//   2) svc=core/search_items com o sid -> localiza itemId pela placa/nome
//   3) svc=unit/set_active com o sid   -> altera estado (active=0|1)
// Não usa account/enable_account (afetaria a conta inteira).
// Restrito a admin. Sempre responde 200 (erros no corpo). Registra em
// public.frota_unit_activation_audit com sistema, itemId, itemName e placa.

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
type Action = "activate" | "deactivate";

async function wialonCall(svc: string, params: unknown, sid?: string) {
  const url = new URL(WIALON_BASE);
  url.searchParams.set("svc", svc);
  url.searchParams.set("params", JSON.stringify(params));
  if (sid) url.searchParams.set("sid", sid);
  const resp = await fetch(url.toString(), { method: "POST" });
  const text = await resp.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* keep text */ }
  return { status: resp.status, body };
}

function isWialonError(b: unknown): b is { error: number; reason?: string } {
  return typeof b === "object" && b !== null && "error" in (b as Record<string, unknown>);
}

// TEMPORARIO: usar wrapper HMAC pro Frota enquanto ACL do Wialon nao e liberada
// (unit/set_active retorna erro 7 / permission denied com o token direto do Frota).
// Reverter para chamada direta quando a permissao for concedida ao usuario da integracao.
const FROTA_STATUS_PATH = "/api/unidade/status";

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

async function sha256Hex(data: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)));
}

async function hmacSha256Hex(secret: string, content: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(content)));
}

function mapTipoContrato(usage?: string | null): "TELEMETRIA" | "MENSALISTA" {
  return String(usage ?? "").toLowerCase().includes("telemetr") ? "TELEMETRIA" : "MENSALISTA";
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let sistema: Sistema | null = null;
  let action: Action | null = null;
  let query = "";
  let notes: string | null = null;
  let userId: string | null = null;
  let userEmail: string | null = null;

  const audit = {
    api_status: 0 as number | null,
    api_ok: false,
    api_response: null as unknown,
    error_message: null as string | null,
    wialon_item_id: null as number | null,
    wialon_item_name: null as string | null,
    method: "wialon_direct" as "wialon_direct" | "frota_hmac_wrapper",
    tipo_contrato: null as string | null,
  };


  try {
    // Parse do corpo PRIMEIRO: garante que o sistema realmente selecionado
    // seja registrado na auditoria mesmo se a autenticação/validação falhar.
    const body = await req.json().catch(() => ({}));
    const rawSistema = String(body?.sistema ?? "").trim().toLowerCase();
    sistema = (rawSistema === "frota" || rawSistema === "auto") ? rawSistema as Sistema : null;
    const rawAction = String(body?.action ?? "").trim().toLowerCase();
    action = (rawAction === "activate" || rawAction === "deactivate") ? rawAction as Action : null;
    query = String(body?.query ?? "").trim(); // placa ou nome da unidade
    notes = body?.notes ? String(body.notes).slice(0, 1000) : null;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      audit.error_message = "Não autenticado (header Authorization ausente)";
      return json({ ok: false, error: audit.error_message });
    }

    // Diagnóstico: claims do JWT (nunca o token em si)
    let claims: Record<string, unknown> = {};
    try {
      const part = token.split(".")[1] ?? "";
      claims = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    } catch { /* token não-JWT */ }
    const nowSec = Math.floor(Date.now() / 1000);
    console.log("[wialon-toggle-unit] token claims", JSON.stringify({
      iss: claims.iss, role: claims.role, sub: claims.sub,
      exp: claims.exp, now: nowSec,
      expired: typeof claims.exp === "number" ? claims.exp < nowSec : null,
      alg_header: (() => { try { return JSON.parse(atob(token.split(".")[0])).alg; } catch { return null; } })(),
    }));

    if (claims.role === "anon") {
      audit.error_message = "Sessão inválida: a requisição chegou com a chave anônima, não com o token do usuário logado. Faça login novamente / recarregue a página.";
      return json({ ok: false, error: audit.error_message });
    }
    if (typeof claims.exp === "number" && claims.exp < nowSec) {
      audit.error_message = `Sessão expirada há ${nowSec - claims.exp}s. Recarregue a página e tente novamente.`;
      return json({ ok: false, error: audit.error_message });
    }

    // Validação via PostgREST com o token do usuário (mesmo caminho que o resto
    // do app usa). Não depende de sessão ativa no GoTrue: o PostgREST valida
    // apenas a assinatura do JWT. getUser()/getClaims() falham com
    // session_not_found / AuthSessionMissingError quando a sessão foi revogada.
    if (!claims.sub) {
      audit.error_message = "Sessão inválida: token sem identificação de usuário. Recarregue a página.";
      return json({ ok: false, error: audit.error_message });
    }
    userId = String(claims.sub);
    userEmail = typeof claims.email === "string" ? claims.email : null;

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) {
      console.error("[wialon-toggle-unit] has_role falhou:", roleErr.message);
      audit.error_message = `Sessão inválida — ${roleErr.message}`;
      return json({ ok: false, error: audit.error_message });
    }
    if (!isAdmin) {
      audit.error_message = "Apenas administradores";
      return json({ ok: false, error: audit.error_message });
    }


    if (!sistema) {
      audit.error_message = `sistema deve ser 'frota' ou 'auto' (recebido: "${rawSistema}")`;
      return json({ ok: false, error: audit.error_message });
    }
    if (!action) {
      audit.error_message = `action deve ser 'activate' ou 'deactivate' (recebido: "${rawAction}")`;
      return json({ ok: false, error: audit.error_message });
    }
    if (!query) {
      audit.error_message = "Informe a placa ou nome da unidade";
      return json({ ok: false, error: audit.error_message });
    }

    // ==========================================================================
    // TEMPORARIO: usar wrapper HMAC pro Frota enquanto ACL do Wialon nao e
    // liberada (unit/set_active -> erro 7). Reverter para chamada direta
    // (bloco abaixo, igual ao Auto) quando a permissao for concedida.
    // ==========================================================================
    if (sistema === "frota") {
      audit.method = "frota_hmac_wrapper";
      const apiKey = Deno.env.get("FROTA_SEGSALE_API_KEY");
      const baseUrl = Deno.env.get("FROTA_SEGSALE_BASE_URL") ||
        "https://frota-auto-aityd.ondigitalocean.app";
      if (!apiKey) {
        audit.error_message = "FROTA_SEGSALE_API_KEY não configurada";
        return json({ ok: false, sistema, error: audit.error_message });
      }

      const placa = query.trim().toUpperCase();
      // O wrapper identifica a unidade pelo campo personalizado FILIALCONTRATO
      // da unidade no Wialon (ex.: "300123568"). Se a tela enviar o valor
      // explicitamente, ele tem prioridade; caso contrário resolvemos pela
      // placa lendo o campo personalizado direto no Wialon (leitura é permitida
      // mesmo sem a ACL de escrita).
      let filialContrato = String(body?.filialContrato ?? "").trim();
      if (!filialContrato) {
        const wt = Deno.env.get("WIALON_TOKEN_FROTA");
        if (wt) {
          const lg = await wialonCall("token/login", { token: wt, fl: 2 });
          const sidF = (lg.body as { eid?: string })?.eid;
          if (sidF) {
            const sr = await wialonCall("core/search_items", {
              spec: {
                itemsType: "avl_unit",
                propName: "sys_name",
                propValueMask: `*${placa}*`,
                sortType: "sys_name",
              },
              force: 1,
              flags: 1 | 8, // base + campos personalizados
              from: 0,
              to: 10,
            }, sidF);
            const found = (sr.body as { items?: Array<{ id: number; nm: string; flds?: Record<string, { n: string; v: string }> }> })?.items ?? [];
            if (found.length === 1) {
              audit.wialon_item_id = found[0].id;
              audit.wialon_item_name = found[0].nm;
              const flds = Object.values(found[0].flds ?? {});
              const f = flds.find((x) => String(x?.n ?? "").toUpperCase() === "FILIALCONTRATO");
              if (f?.v) filialContrato = String(f.v).trim();
            } else if (found.length > 1) {
              audit.error_message =
                `Múltiplas unidades (${found.length}) no Frota para "${placa}". Informe o filialContrato manualmente.`;
              return json({ ok: false, sistema, error: audit.error_message, candidates: found.map((i) => ({ id: i.id, name: i.nm })) });
            }
          }
        }
      }
      if (!filialContrato) {
        audit.error_message =
          `Não foi possível resolver o FILIALCONTRATO da placa "${placa}" no Wialon Frota. ` +
          `Preencha o campo "filialContrato" manualmente (campo personalizado da unidade, ex.: 300123568).`;
        return json({ ok: false, sistema, error: audit.error_message });
      }

      // tipoContrato: override explícito do corpo, senão derivado do usage_type
      // do veículo (mesma regra usada em create-frota-unidade).
      const overrideTipo = String(body?.tipoContrato ?? "").trim().toUpperCase();
      let tipoContrato: "TELEMETRIA" | "MENSALISTA";
      if (overrideTipo === "TELEMETRIA" || overrideTipo === "MENSALISTA") {
        tipoContrato = overrideTipo;
      } else {
        const { data: iv } = await admin
          .from("incoming_vehicles")
          .select("usage_type")
          .eq("plate", placa)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        tipoContrato = mapTipoContrato(iv?.usage_type ?? null);
      }
      audit.tipo_contrato = tipoContrato;

      const ativo = action === "activate";
      const payload = { filialContrato, ativo, tipoContrato };
      const reqBody = JSON.stringify(payload);
      const timestamp = String(Math.floor(Date.now() / 1000));
      const nonce = crypto.randomUUID();
      const canonical =
        `PATCH\n${FROTA_STATUS_PATH}\n${timestamp}\n${nonce}\n${await sha256Hex(reqBody)}`;
      const signature = await hmacSha256Hex(apiKey, canonical);

      console.log(
        `[wialon-toggle-unit] sistema=frota method=hmac_wrapper action=${action} placa=${placa} tipo=${tipoContrato}`,
      );

      let respText = "";
      try {
        const resp = await fetch(`${baseUrl}${FROTA_STATUS_PATH}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Timestamp": timestamp,
            "X-Nonce": nonce,
            "X-Signature": signature,
          },
          body: reqBody,
        });
        audit.api_status = resp.status;
        respText = await resp.text();
        let respJson: unknown = respText;
        try { respJson = JSON.parse(respText); } catch { /* keep text */ }
        audit.api_response = { method: "frota_hmac_wrapper", request: payload, response: respJson };

        const confirmed =
          typeof respJson === "object" && respJson !== null &&
          (respJson as Record<string, unknown>).ativo === ativo;
        audit.api_ok = resp.ok && (confirmed || (respJson as Record<string, unknown>)?.ativo === undefined);
        if (!audit.api_ok) {
          const detail = typeof respJson === "string" ? respJson : JSON.stringify(respJson);
          audit.error_message = resp.status === 404
            ? `Wrapper Frota não encontrou a unidade para filialContrato="${filialContrato}". ` +
              `Esse campo é a chave do contrato no Segsale (não a placa) — informe o filialContrato correto. Detalhe: ${detail}`
            : `Wrapper Frota respondeu ${resp.status} sem confirmar ${ativo ? "ativação" : "desativação"}: ${detail}`;
        }
      } catch (netErr) {
        audit.error_message = `Erro de rede ao chamar wrapper Frota: ${
          netErr instanceof Error ? netErr.message : String(netErr)
        }`;
      }

      return json({
        ok: audit.api_ok,
        sistema,
        method: "frota_hmac_wrapper",
        placa,
        filialContrato,
        tipoContrato,
        request: payload,
        response: audit.api_response,
        error: audit.api_ok ? null : audit.error_message,
      });
    }


    // Token estritamente derivado do sistema selecionado — sem fallback silencioso.
    const tokenEnvName = sistema === "frota" ? "WIALON_TOKEN_FROTA" : "WIALON_TOKEN_AUTO";
    const wialonToken = Deno.env.get(tokenEnvName);
    if (!wialonToken) {
      audit.error_message = `Token do sistema ${sistema.toUpperCase()} (${tokenEnvName}) não configurado`;
      return json({ ok: false, error: audit.error_message });
    }
    console.log(`[wialon-toggle-unit] sistema=${sistema} token=${tokenEnvName} action=${action} query=${query}`);


    // 1) login
    const login = await wialonCall("token/login", { token: wialonToken, fl: 2 });
    audit.api_status = login.status;
    if (isWialonError(login.body)) {
      audit.error_message = `Login Wialon (sistema ${sistema.toUpperCase()}) falhou: erro ${login.body.error}${login.body.reason ? ` — ${login.body.reason}` : ""}`;
      audit.api_response = login.body;
      return json({ ok: false, sistema, error: audit.error_message, response: login.body });
    }
    const sid = (login.body as { eid?: string })?.eid;
    if (!sid) {
      audit.error_message = `Login Wialon (sistema ${sistema.toUpperCase()}) não retornou eid`;
      audit.api_response = login.body;
      return json({ ok: false, sistema, error: audit.error_message, response: login.body });
    }


    // 2) search_items — procura por nome contendo placa/nome
    const searchParams = {
      spec: {
        itemsType: "avl_unit",
        propName: "sys_name",
        propValueMask: `*${query}*`,
        sortType: "sys_name",
      },
      force: 1,
      flags: 1, // basic props (nm, id)
      from: 0,
      to: 50,
    };
    const search = await wialonCall("core/search_items", searchParams, sid);
    audit.api_response = { login: login.body, search: search.body };
    if (isWialonError(search.body)) {
      audit.error_message = `Busca Wialon (sistema ${sistema.toUpperCase()}) falhou: erro ${search.body.error}${search.body.reason ? ` — ${search.body.reason}` : ""}`;
      return json({ ok: false, sistema, error: audit.error_message, response: search.body });
    }
    const items = (search.body as { items?: Array<{ id: number; nm: string }> })?.items ?? [];
    if (items.length === 0) {
      audit.error_message = `Unidade não encontrada no sistema ${sistema.toUpperCase()} para a placa "${query}". Verifique se a unidade pertence ao outro sistema (${sistema === "auto" ? "FROTA" : "AUTO"}).`;
      return json({ ok: false, sistema, error: audit.error_message, sid_ok: true, candidates: [] });
    }

    if (items.length > 1) {
      audit.error_message = `Múltiplas unidades encontradas (${items.length}) no sistema ${sistema.toUpperCase()} para "${query}". Refine a busca.`;
      return json({
        ok: false,
        sistema,
        error: audit.error_message,
        candidates: items.map((i) => ({ id: i.id, name: i.nm })),
      });
    }
    const unit = items[0];
    audit.wialon_item_id = unit.id;
    audit.wialon_item_name = unit.nm;

    // 3) set_active
    const active = action === "activate" ? 1 : 0;
    const set = await wialonCall("unit/set_active", { itemId: unit.id, active }, sid);
    audit.api_status = set.status;
    audit.api_response = { ...(audit.api_response as object ?? {}), set_active: set.body };
    if (isWialonError(set.body)) {
      const e = set.body as { error: number; reason?: string };
      audit.error_message = `set_active falhou no sistema ${sistema.toUpperCase()} (unidade ${unit.nm}/${unit.id}): erro ${e.error}${e.reason ? ` — ${e.reason}` : ""}`;
      return json({
        ok: false,
        sistema,
        error: audit.error_message,
        itemId: unit.id,
        itemName: unit.nm,
        response: set.body,
      });
    }

    const returnedActive = (set.body as { active?: unknown })?.active;
    const desired = action === "activate";
    const ok = returnedActive === desired || returnedActive === active || returnedActive === (desired ? 1 : 0);
    audit.api_ok = !!ok;
    if (!ok) {
      audit.error_message = `Wialon respondeu sem confirmar ${desired ? "ativação" : "desativação"}`;
    }

    return json({
      ok: audit.api_ok,
      sistema,
      itemId: unit.id,
      itemName: unit.nm,
      response: set.body,
      error: audit.api_ok ? null : audit.error_message,
    });
  } catch (err) {
    audit.error_message = err instanceof Error ? err.message : String(err);
    console.error("[wialon-toggle-unit] ERROR", audit.error_message);
    return json({ ok: false, sistema, error: audit.error_message });
  } finally {
    try {
      await admin.from("frota_unit_activation_audit").insert({
        // NUNCA usar valor fixo: grava exatamente o sistema selecionado (null se inválido)
        sistema,
        filial_contrato: audit.method === "frota_hmac_wrapper" ? (String((body as any)?.filialContrato ?? "").trim() || query || null) : null,
        tipo_contrato: audit.tipo_contrato,
        action: action ?? "deactivate",

        requested_by: userId,
        requested_by_email: userEmail,
        api_status: audit.api_status,
        api_ok: audit.api_ok,
        api_response: (audit.api_response
          ? { method: audit.method, ...(typeof audit.api_response === "object" && audit.api_response !== null
              ? audit.api_response as Record<string, unknown>
              : { raw: audit.api_response }) }
          : { method: audit.method }) as Record<string, unknown>,
        error_message: audit.error_message,
        notes,
        placa: query || null,
        wialon_item_id: audit.wialon_item_id,
        wialon_item_name: audit.wialon_item_name,
      });
    } catch (e) {
      console.error("[wialon-toggle-unit] audit insert failed", e);
    }
  }
});
