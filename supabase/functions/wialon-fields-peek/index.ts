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

  // modo teste do wrapper: { probe: { ...payload } }
  if (body?.probe) {
    const apiKey = Deno.env.get("FROTA_SEGSALE_API_KEY")!;
    const baseUrl = Deno.env.get("FROTA_SEGSALE_BASE_URL") || "https://frota-auto-aityd.ondigitalocean.app";
    const path = "/api/unidade/status";
    const reqBody = JSON.stringify(body.probe);
    const ts = String(Math.floor(Date.now() / 1000));
    const nonce = crypto.randomUUID();
    const enc = new TextEncoder();
    const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
    const bodyHash = hex(await crypto.subtle.digest("SHA-256", enc.encode(reqBody)));
    const key = await crypto.subtle.importKey("raw", enc.encode(apiKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = hex(await crypto.subtle.sign("HMAC", key, enc.encode(`PATCH\n${path}\n${ts}\n${nonce}\n${bodyHash}`)));
    const r = await fetch(`${baseUrl}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Timestamp": ts, "X-Nonce": nonce, "X-Signature": sig },
      body: reqBody,
    });
    const t = await r.text();
    return new Response(JSON.stringify({ probe: body.probe, status: r.status, response: t }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
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
