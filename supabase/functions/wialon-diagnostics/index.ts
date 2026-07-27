// Edge Function: wialon-diagnostics (SOMENTE LEITURA)
// Levantamento de parâmetros para futura criação de unidades via Wialon direto.
// Para cada sistema (frota, auto):
//   1) token/login (fl=2)      -> user.id  (candidato a creatorId)
//   2) core/get_hw_types       -> hwTypeId do NT20 (e alguns similares)
//   3) core/search_items       -> amostra de nomes de unidades (padrão de `name`)
// Nenhuma chamada de escrita. Sempre responde 200 (erros no corpo).

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

async function diagnose(sistema: "frota" | "auto", hwFilter: string, inspectItemId?: number, resourceMask?: string, hwValues?: string[]) {
  const token = sistema === "frota"
    ? Deno.env.get("WIALON_TOKEN_FROTA")
    : Deno.env.get("WIALON_TOKEN_AUTO");
  if (!token) return { sistema, ok: false, error: `Token do sistema ${sistema} não configurado` };

  // 1) login
  const login = await wialonCall("token/login", { token, fl: 2 });
  if (isWialonError(login.body)) {
    return { sistema, ok: false, step: "token/login", error: `erro ${login.body.error}`, response: login.body };
  }
  const lb = login.body as { eid?: string; user?: { id?: number; nm?: string } };
  const sid = lb?.eid;
  if (!sid) return { sistema, ok: false, step: "token/login", error: "sem eid", response: login.body };

  const creatorCandidate = { id: lb.user?.id ?? null, name: lb.user?.nm ?? null };

  // 2) hw types (filtro por nome)
  const hw = await wialonCall("core/get_hw_types", {
    filterType: "name",
    filterValue: hwValues && hwValues.length ? hwValues : [hwFilter],
    includeType: true,
    ignoreRename: true,
  }, sid);

  // 2b) fallback: busca ampla por "NT" caso o filtro exato não retorne nada
  let hwLike: unknown = null;
  let hwRaw: unknown = null;
  const hwEmpty = Array.isArray(hw.body) && hw.body.length === 0;
  if (hwEmpty || isWialonError(hw.body)) {
    const all = await wialonCall("core/get_hw_types", { filterType: "name", filterValue: [], includeType: true, ignoreRename: true }, sid);
    if (Array.isArray(all.body)) {
      const list = all.body as Array<{ id: number; name: string }>;
      hwRaw = { total: list.length };
      const needle = hwFilter.toUpperCase().slice(0, 4);
      hwLike = list
        .filter((t) => String(t.name ?? "").toUpperCase().includes(needle))
        .slice(0, 60);
    } else {
      hwRaw = all.body;
    }
  }

  // 3) amostra de unidades (somente leitura) — pega um lote grande e ordena por id desc
  //    para ver as unidades MAIS RECENTES (as criadas pelo wrapper hoje).
  const sample = await wialonCall("core/search_items", {
    spec: {
      itemsType: "avl_unit",
      propName: "sys_name",
      propValueMask: "*",
      sortType: "sys_name",
      propType: "property",
    },
    force: 1,
    flags: 1 + 8192, // base (nm) + hardware/uid
    from: 0,
    to: 6000,
  }, sid);

  const all = (sample.body as { items?: Array<{ id: number; nm: string; hw?: number; uid?: string }> })?.items ?? [];
  const totalItems = (sample.body as { totalItemsCount?: number })?.totalItemsCount ?? null;
  const items = [...all].sort((a, b) => b.id - a.id);

  // 4) contas / recursos (avl_resource) — necessário para account/change_account
  const resources = await wialonCall("core/search_items", {
    spec: {
      itemsType: "avl_resource",
      propName: "sys_name",
      propValueMask: resourceMask ?? "*",
      sortType: "sys_name",
      propType: "property",
    },
    force: 1,
    flags: 1 + 1024, // base + billing/account properties
    from: 0,
    to: 200,
  }, sid);
  const resItems = (resources.body as { items?: Array<Record<string, unknown>> })?.items ?? [];

  // 5) inspeção opcional de uma unidade específica (conta vinculada / estado)
  let inspected: unknown = null;
  if (inspectItemId) {
    const one = await wialonCall("core/search_item", { id: inspectItemId, flags: 1 + 8192 + 1024 }, sid);
    inspected = one.body;
  }

  return {
    sistema,
    ok: true,
    creatorCandidate,
    loginUser: lb.user ?? null,
    hwTypes: hw.body,
    hwTypesLikeNT: hwLike,
    hwRaw,
    unitsTotal: totalItems,
    unitsSample: items.slice(0, 15).map((u) => ({ id: u.id, name: u.nm, hw: u.hw ?? null, uniqueId: u.uid ?? null })),
    resources: resItems.map((r) => ({
      id: r.id,
      name: r.nm,
      uacl: r.uacl ?? null,
      account: (r as { act?: unknown }).act ?? null,
      billing: (r as { bact?: unknown }).bact ?? null,
    })),
    inspected,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const diagKey = Deno.env.get("WIALON_DIAG_KEY");
    const diagKey2 = Deno.env.get("WIALON_DIAG_KEY_TMP");
    const providedKey = req.headers.get("x-diag-key");
    const viaDiagKey = (!!diagKey && providedKey === diagKey) || (!!diagKey2 && providedKey === diagKey2);

    if (!viaDiagKey) {
      const authToken = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (!authToken) return json({ ok: false, error: "Não autenticado" });

      const { data: userData, error: userErr } = await admin.auth.getUser(authToken);
      if (userErr || !userData?.user) return json({ ok: false, error: "Sessão inválida" });

      const { data: isAdmin } = await admin.rpc("has_role", {
        _user_id: userData.user.id,
        _role: "admin",
      });
      if (!isAdmin) return json({ ok: false, error: "Apenas administradores" });
    }

    const body = await req.json().catch(() => ({}));
    const hwFilter = String(body?.hwFilter ?? "NT20");
    const inspectFrotaItemId = body?.inspectFrotaItemId ? Number(body.inspectFrotaItemId) : undefined;
    const onlyFrota = body?.onlyFrota === true;
    const resourceMask = body?.resourceMask ? String(body.resourceMask) : undefined;
    const hwValues = Array.isArray(body?.hwValues) ? body.hwValues.map(String) : undefined;

    const [frota, auto] = await Promise.all([
      diagnose("frota", hwFilter, inspectFrotaItemId, resourceMask, hwValues).catch((e) => ({ sistema: "frota", ok: false, error: String(e) })),
      onlyFrota
        ? Promise.resolve({ sistema: "auto", ok: true, skipped: true })
        : diagnose("auto", hwFilter).catch((e) => ({ sistema: "auto", ok: false, error: String(e) })),
    ]);

    return json({ ok: true, hwFilter, frota, auto });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});
