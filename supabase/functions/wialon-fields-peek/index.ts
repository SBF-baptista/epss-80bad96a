// TEMPORARIO / READ-ONLY: lê campos personalizados (flds/aflds) de unidades no Wialon Frota.
// Uso: POST { plates: ["SOG8B13","SNY8G44"] }
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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
  const body = await req.json().catch(() => ({}));
  const plates: string[] = Array.isArray(body?.plates) ? body.plates : [];
  const token = Deno.env.get("WIALON_TOKEN_FROTA");
  const login = await wialonCall("token/login", { token, fl: 2 });
  const sid = (login as { eid?: string })?.eid;
  if (!sid) {
    return new Response(JSON.stringify({ ok: false, login }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const out: unknown[] = [];
  for (const p of plates) {
    const sr = await wialonCall("core/search_items", {
      spec: { itemsType: "avl_unit", propName: "sys_name", propValueMask: `*${p}*`, sortType: "sys_name" },
      force: 1,
      flags: 1 | 8 | 0x400000 | 0x100000,
      from: 0,
      to: 10,
    }, sid);
    const items = (sr as { items?: Array<Record<string, unknown>> })?.items ?? [];
    out.push({
      plate: p,
      count: items.length,
      items: items.map((i) => ({
        id: i.id,
        nm: i.nm,
        flds: i.flds,
        aflds: i.aflds,
        pflds: i.pflds,
        act: (i as { act?: unknown }).act,
      })),
    });
  }
  return new Response(JSON.stringify({ ok: true, out }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
