// TEMPORARIO: função de teste do wrapper HMAC do Frota (POST /api/unidade/status).
// Deve ser removida após a validação.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown) =>
  new Response(JSON.stringify(b), { headers: { ...cors, "Content-Type": "application/json" } });

const PATH = "/api/unidade/status";
const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const filialContrato = String(body?.filialContrato ?? body?.placa ?? "").trim().toUpperCase();
    const ativo = body?.ativo === true;
    const tipoContrato = String(body?.tipoContrato ?? "MENSALISTA").toUpperCase();
    const httpMethod = String(body?.httpMethod ?? "POST").toUpperCase();

    const apiKey = Deno.env.get("FROTA_SEGSALE_API_KEY");
    const baseUrl = Deno.env.get("FROTA_SEGSALE_BASE_URL") ||
      "https://frota-auto-aityd.ondigitalocean.app";
    if (!apiKey) return json({ ok: false, error: "FROTA_SEGSALE_API_KEY ausente" });

    const candidates: unknown[] = Array.isArray(body?.payloads)
      ? body.payloads
      : [body?.payload ?? { filialContrato, ativo, tipoContrato }];
    const results: unknown[] = [];
    for (const payload of candidates) {
    const reqBody = JSON.stringify(payload);
    const ts = String(Math.floor(Date.now() / 1000));
    const nonce = crypto.randomUUID();
    const hash = toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(reqBody)));
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(apiKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sig = toHex(await crypto.subtle.sign(
      "HMAC", key, new TextEncoder().encode(`${httpMethod}\n${PATH}\n${ts}\n${nonce}\n${hash}`),
    ));

    const resp = await fetch(`${baseUrl}${PATH}`, {
      method: httpMethod,
      headers: {
        "Content-Type": "application/json",
        "X-Timestamp": ts, "X-Nonce": nonce, "X-Signature": sig,
      },
      body: reqBody,
    });
    const text = await resp.text();
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch { /* keep */ }
    results.push({ status: resp.status, request: payload, response: parsed });
    }
    return json({ ok: true, results });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});
