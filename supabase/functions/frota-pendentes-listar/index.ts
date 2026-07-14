// GET /api/unidade/pendente/listar?tipoContrato=... via HMAC
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
async function sha256Hex(data: string) {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)));
}
async function hmacSha256Hex(secret: string, content: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(content)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const tipoContrato = (url.searchParams.get("tipoContrato") ?? "TELEMETRIA").toUpperCase();
    const placa = url.searchParams.get("placa");

    const apiKey = Deno.env.get("FROTA_SEGSALE_API_KEY");
    const baseUrl = Deno.env.get("FROTA_SEGSALE_BASE_URL") || "https://frota-auto-aityd.ondigitalocean.app";
    if (!apiKey) return json({ ok: false, error: "FROTA_SEGSALE_API_KEY ausente" });

    const qs = new URLSearchParams({ tipoContrato });
    if (placa) qs.set("placa", placa);
    const path = `/api/unidade/pendente/listar?${qs.toString()}`;

    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = crypto.randomUUID();
    const bodyHash = await sha256Hex("");
    const canonicalPath = "/api/unidade/pendente/listar";
    const canonical = `GET\n${canonicalPath}\n${timestamp}\n${nonce}\n${bodyHash}`;
    const signature = await hmacSha256Hex(apiKey, canonical);

    const resp = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers: {
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": signature,
      },
    });
    const text = await resp.text();
    let parsed: unknown = text; try { parsed = JSON.parse(text); } catch { /* */ }
    return json({ ok: resp.ok, status: resp.status, path, count: Array.isArray(parsed) ? parsed.length : undefined, response: parsed });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});
