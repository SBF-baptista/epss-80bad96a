// GET /api/unidade/pendente?tipoContrato=...&placa=... via HMAC
// Verifica se uma placa está na base de pendências do Frota (Segsale).
// Tenta TELEMETRIA e depois MENSALISTA. Sempre retorna 200.
//
// Body: { placa: string }
// Response: { ok, pendente, data?: { placa, filial, contrato, tipoContrato } }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
async function sha256Hex(data: string) {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)));
}
async function hmacSha256Hex(secret: string, content: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(content)));
}

const CANONICAL_PATH = "/api/unidade/pendente";

async function checkTipo(
  baseUrl: string,
  apiKey: string,
  tipo: "TELEMETRIA" | "MENSALISTA",
  placa: string,
) {
  const qs = new URLSearchParams({ tipoContrato: tipo, placa });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const bodyHash = await sha256Hex("");
  const canonical = `GET\n${CANONICAL_PATH}\n${timestamp}\n${nonce}\n${bodyHash}`;
  const signature = await hmacSha256Hex(apiKey, canonical);

  const resp = await fetch(`${baseUrl}${CANONICAL_PATH}?${qs.toString()}`, {
    method: "GET",
    headers: {
      "X-Timestamp": timestamp,
      "X-Nonce": nonce,
      "X-Signature": signature,
    },
  });
  const text = await resp.text();
  let parsed: any = text;
  try { parsed = JSON.parse(text); } catch { /* */ }
  return { status: resp.status, ok: resp.ok, parsed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const placaRaw = String(body?.placa ?? "").trim().toUpperCase();
    if (!placaRaw) return json({ ok: false, error: "placa obrigatória" });

    const apiKey = Deno.env.get("FROTA_SEGSALE_API_KEY");
    const baseUrl = Deno.env.get("FROTA_SEGSALE_BASE_URL") ||
      "https://frota-auto-aityd.ondigitalocean.app";
    if (!apiKey) return json({ ok: false, error: "FROTA_SEGSALE_API_KEY ausente" });

    for (const tipo of ["TELEMETRIA", "MENSALISTA"] as const) {
      const r = await checkTipo(baseUrl, apiKey, tipo, placaRaw);
      console.log(`[frota-check-placa-pendente] placa=${placaRaw} tipo=${tipo} status=${r.status}`);
      if (r.ok && r.parsed && typeof r.parsed === "object" && r.parsed.pendente === true) {
        return json({
          ok: true,
          pendente: true,
          data: {
            placa: r.parsed.placa ?? placaRaw,
            filial: r.parsed.filial ?? null,
            contrato: r.parsed.contrato ?? null,
            tipoContrato: tipo,
          },
        });
      }
    }
    return json({ ok: true, pendente: false });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});
