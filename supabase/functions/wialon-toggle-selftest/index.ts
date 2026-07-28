// TEMPORÁRIA: valida o roteamento de token (frota vs auto) do fluxo de toggle.
// Protegida por um token de uso único gravado em public.app_logs (details).
// Deve ser removida após o teste.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-selftest-key",
};

const json = (b: unknown) =>
  new Response(JSON.stringify(b), {
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
  try { return JSON.parse(text); } catch { return text; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const key = req.headers.get("x-selftest-key") ?? "";
  if (!key) return json({ ok: false, error: "sem chave" });
  const { data: rows } = await admin
    .from("app_logs")
    .select("id")
    .eq("action", "wialon_selftest_key")
    .eq("details", key)
    .limit(1);
  if (!rows || rows.length === 0) return json({ ok: false, error: "chave inválida" });

  const body = await req.json().catch(() => ({}));
  const sistema = String(body?.sistema ?? "").toLowerCase() === "auto" ? "auto" : "frota";
  const query = String(body?.query ?? "").trim();
  const doSet = body?.set === true;
  const active = body?.active === 1 ? 1 : 0;

  const tokenEnv = sistema === "frota" ? "WIALON_TOKEN_FROTA" : "WIALON_TOKEN_AUTO";
  const wtoken = Deno.env.get(tokenEnv);
  const login = await wialonCall("token/login", { token: wtoken, fl: 2 }) as
    { eid?: string; user?: { id?: number; nm?: string } };
  const sid = login?.eid;
  if (!sid) return json({ ok: false, sistema, tokenEnv, error: "login falhou", login });

  const search = await wialonCall("core/search_items", {
    spec: { itemsType: "avl_unit", propName: "sys_name", propValueMask: `*${query}*`, sortType: "sys_name" },
    force: 1, flags: 1, from: 0, to: 50,
  }, sid) as { items?: Array<{ id: number; nm: string }> };

  const items = search?.items ?? [];
  const result: Record<string, unknown> = {
    ok: true,
    sistema,
    tokenEnv,
    loginUser: { id: login?.user?.id ?? null, name: login?.user?.nm ?? null },
    found: items.length,
    items: items.slice(0, 5).map((i) => ({ id: i.id, name: i.nm })),
  };

  if (doSet && items.length === 1) {
    result.set_active = await wialonCall("unit/set_active", { itemId: items[0].id, active }, sid);
  }
  return json(result);
});
