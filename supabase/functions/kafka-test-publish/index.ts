// Edge Function: kafka-test-publish
// Publica um payload arbitrário no tópico Kafka de agendamento — apenas para testes manuais.
import { Kafka, logLevel } from "npm:kafkajs@2.2.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const payload = body?.payload ?? body;
    const brokers = Deno.env.get("DO_KAFKA_BROKERS");
    const username = Deno.env.get("DO_KAFKA_USERNAME");
    const password = Deno.env.get("DO_KAFKA_PASSWORD");
    const ca = Deno.env.get("DO_KAFKA_CA_PEM");
    const topic = body?.topic ?? Deno.env.get("DO_KAFKA_TOPIC_AGENDAMENTO");
    if (!brokers || !username || !password || !ca || !topic) {
      return json({ ok: false, error: "Secrets do Kafka ausentes" });
    }

    const normalizeCaPem = (raw: string): string => {
      let s = raw.trim().replace(/\\n/g, "\n");
      s = s.replace(/-----BEGIN CERTIFICATE-----/g, "")
           .replace(/-----END CERTIFICATE-----/g, "")
           .replace(/\s+/g, "");
      const lines = s.match(/.{1,64}/g) ?? [];
      return `-----BEGIN CERTIFICATE-----\n${lines.join("\n")}\n-----END CERTIFICATE-----\n`;
    };
    const caPem = normalizeCaPem(ca);

    const kafka = new Kafka({
      clientId: "opmss-edge-test",
      brokers: brokers.split(",").map((b) => b.trim()).filter(Boolean),
      ssl: { ca: [caPem], rejectUnauthorized: true },
      sasl: { mechanism: "scram-sha-512", username, password },
      connectionTimeout: 60_000,
      authenticationTimeout: 30_000,
      requestTimeout: 60_000,
      enforceRequestTimeout: false,
      logLevel: logLevel.ERROR,
    });

    const producer = kafka.producer({ idempotent: true, retry: { retries: 3, initialRetryTime: 300 } });
    let result: any = null;
    try {
      await producer.connect();
      const key = `test-${payload?.codigoCliente ?? "sem-cliente"}-${Date.now()}`;
      result = await producer.send({
        topic,
        acks: -1,
        messages: [{ key, value: JSON.stringify(payload), headers: { "schema-version": "test-manual" } }],
      });
      console.log(`[kafka-test-publish] OK topic=${topic} key=${key}`);
    } finally {
      try { await producer.disconnect(); } catch (_) {}
    }
    return json({ ok: true, topic, sent: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[kafka-test-publish] ERROR", msg);
    return json({ ok: false, error: msg });
  }
});
