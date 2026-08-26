// Edge Function: wialon-search-plate
// READ-ONLY: procura uma unidade no Wialon (Frota e Auto) pela placa.
// NÃO cria, atualiza, apaga ou toca em qualquer estado no Wialon.
// Usa apenas svc=token/login e svc=core/search_items.
//
// Restrito a admin.
// Body: { plate: string }  ou  { plates: string[] }
// Retorna, para cada placa: { plate, frota: {exists,item_id,item_name}|null, auto: {...}|null, errors?: {...} }

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

const WIALON_BASE = "https://frota-api.segsat.com/wialon/ajax.html";

type Sistema = "frota" | "auto";

interface WialonMatch {
  exists: boolean;
  item_id: number | null;
  item_name: string | null;
  candidates?: Array<{ id: number; name: string }>;
}

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

async function loginSistema(sistema: Sistema): Promise<{ sid?: string; error?: string }> {
  const token = sistema === "frota"
    ? Deno.env.get("WIALON_TOKEN_FROTA")
    : Deno.env.get("WIALON_TOKEN_AUTO");
  if (!token) return { error: `Token do sistema ${sistema} não configurado` };
  const login = await wialonCall("token/login", { token, fl: 2 });
  if (isWialonError(login.body)) {
    return { error: `Login Wialon (${sistema}) falhou: erro ${login.body.error}` };
  }
  const sid = (login.body as { eid?: string })?.eid;
  if (!sid) return { error: `Login Wialon (${sistema}) sem eid` };
  return { sid };
}

async function searchPlate(sid: string, plate: string): Promise<WialonMatch | { error: string }> {
  const params = {
    spec: {
      itemsType: "avl_unit",
      propName: "sys_name",
      propValueMask: `*${plate}*`,
      sortType: "sys_name",
    },
    force: 1,
    flags: 1,
    from: 0,
    to: 50,
  };
  const res = await wialonCall("core/search_items", params, sid);
  if (isWialonError(res.body)) {
    return { error: `search_items falhou: erro ${res.body.error}` };
  }
  const items = (res.body as { items?: Array<{ id: number; nm: string }> })?.items ?? [];
  const normPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // match exato preferido: nome normalizado contém a placa normalizada
  const exact = items.find(i => (i.nm || "").toUpperCase().replace(/[^A-Z0-9]/g, "").includes(normPlate));
  if (exact) {
    return { exists: true, item_id: exact.id, item_name: exact.nm };
  }
  if (items.length === 0) {
    return { exists: false, item_id: null, item_name: null };
  }
  // achou candidatos mas nenhum bate exatamente
  return {
    exists: false,
    item_id: null,
    item_name: null,
    candidates: items.slice(0, 5).map(i => ({ id: i.id, name: i.nm })),
  };
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

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "Apenas administradores" }, 403);



    const body = await req.json().catch(() => ({}));
    const rawPlates: string[] = Array.isArray(body?.plates)
      ? body.plates.map((p: unknown) => String(p ?? "").trim()).filter(Boolean)
      : (typeof body?.plate === "string" && body.plate.trim() ? [body.plate.trim()] : []);

    if (rawPlates.length === 0) return json({ error: "Informe plate ou plates[]" }, 400);
    if (rawPlates.length > 50) return json({ error: "Máximo de 50 placas por chamada" }, 400);

    // Login em ambos sistemas
    const [frotaLogin, autoLogin] = await Promise.all([loginSistema("frota"), loginSistema("auto")]);

    const results: Record<string, {
      plate: string;
      frota: WialonMatch | null;
      auto: WialonMatch | null;
      errors?: { frota?: string; auto?: string };
    }> = {};

    for (const plate of rawPlates) {
      const errors: { frota?: string; auto?: string } = {};
      let frotaMatch: WialonMatch | null = null;
      let autoMatch: WialonMatch | null = null;

      if (frotaLogin.sid) {
        const r = await searchPlate(frotaLogin.sid, plate);
        if ("error" in r) errors.frota = r.error;
        else frotaMatch = r;
      } else if (frotaLogin.error) {
        errors.frota = frotaLogin.error;
      }

      if (autoLogin.sid) {
        const r = await searchPlate(autoLogin.sid, plate);
        if ("error" in r) errors.auto = r.error;
        else autoMatch = r;
      } else if (autoLogin.error) {
        errors.auto = autoLogin.error;
      }

      results[plate] = {
        plate,
        frota: frotaMatch,
        auto: autoMatch,
        ...(Object.keys(errors).length ? { errors } : {}),
      };
    }

    return json({ ok: true, results });
  } catch (err) {
    console.error("[wialon-search-plate] ERROR", err);
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 200);
  }
});
