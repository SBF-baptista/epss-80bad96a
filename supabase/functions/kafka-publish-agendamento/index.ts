// Edge Function: kafka-publish-agendamento
// Publica evento no Kafka da DigitalOcean (SASL_SSL + SCRAM-SHA-256)
// após a criação de um agendamento (kit_schedules).
//
// Body: { scheduleId: string }
// Sempre retorna 200 (regra do projeto: erros de negócio no corpo).

import { Kafka, logLevel } from "npm:kafkajs@2.2.4";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { scheduleId } = await req.json().catch(() => ({}));
    if (!scheduleId || typeof scheduleId !== "string") {
      return json({ ok: false, error: "scheduleId obrigatório" });
    }

    const brokers = Deno.env.get("DO_KAFKA_BROKERS");
    const username = Deno.env.get("DO_KAFKA_USERNAME");
    const password = Deno.env.get("DO_KAFKA_PASSWORD");
    const ca = Deno.env.get("DO_KAFKA_CA_PEM");
    const topic = Deno.env.get("DO_KAFKA_TOPIC_AGENDAMENTO");

    if (!brokers || !username || !password || !ca || !topic) {
      return json({ ok: false, error: "Secrets do Kafka ausentes" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Busca o agendamento
    const { data: schedule, error: sErr } = await supabase
      .from("kit_schedules")
      .select(
        "id, vehicle_plate, vehicle_model, vehicle_brand, vehicle_year, customer_id, customer_name, customer_email, scheduled_date, installation_time, status",
      )
      .eq("id", scheduleId)
      .maybeSingle();

    if (sErr || !schedule) {
      return json({ ok: false, error: `Agendamento não encontrado: ${sErr?.message ?? "n/a"}` });
    }

    // 2) Busca o cliente (codigoCliente, razão social, email)
    let customer: any = null;
    if (schedule.customer_id) {
      const { data } = await supabase
        .from("customers")
        .select("id, codigo_cliente, name, company_name, email, sale_summary_id")
        .eq("id", schedule.customer_id)
        .maybeSingle();
      customer = data;
    }

    // 3) Busca dispositivo do veículo (kickoff_history.vehicles_data por placa+venda)
    let dispositivo = "rastreador";
    if (customer?.sale_summary_id && schedule.vehicle_plate) {
      const { data: kh } = await supabase
        .from("kickoff_history")
        .select("vehicles_data")
        .eq("sale_summary_id", customer.sale_summary_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const arr = (kh?.vehicles_data ?? []) as Array<Record<string, any>>;
      const match = arr.find(
        (v) =>
          String(v?.plate ?? "").toUpperCase() ===
          String(schedule.vehicle_plate).toUpperCase(),
      );
      if (match?.usage_type) dispositivo = String(match.usage_type);
    }

    // 4) Monta payload no formato solicitado
    const payload = {
      codigoCliente: customer?.codigo_cliente ?? null,
      razaoSocial: customer?.company_name ?? schedule.customer_name ?? null,
      nomeFantasia: customer?.name ?? customer?.company_name ?? null,
      email: customer?.email ?? schedule.customer_email ?? null,
      veiculos: [
        {
          placa: schedule.vehicle_plate ?? null,
          modelo: [schedule.vehicle_brand, schedule.vehicle_model]
            .filter(Boolean)
            .join(" ")
            .trim() || null,
          dispositivo,
        },
      ],
    };

    // 5) Publica no Kafka
    // Normaliza CA: aceita PEM completo, PEM com \n literal, ou só o corpo base64
    const normalizeCaPem = (raw: string): string => {
      let s = raw.trim().replace(/\\n/g, "\n");
      // Remove headers existentes para reconstruir limpo
      s = s.replace(/-----BEGIN CERTIFICATE-----/g, "")
           .replace(/-----END CERTIFICATE-----/g, "")
           .replace(/\s+/g, "");
      // Quebra em linhas de 64 chars
      const lines = s.match(/.{1,64}/g) ?? [];
      return `-----BEGIN CERTIFICATE-----\n${lines.join("\n")}\n-----END CERTIFICATE-----\n`;
    };
    const caPem = normalizeCaPem(ca);

    const kafka = new Kafka({
      clientId: "opmss-edge",
      brokers: brokers.split(",").map((b) => b.trim()).filter(Boolean),
      ssl: { ca: [caPem], rejectUnauthorized: true },
      sasl: { mechanism: "scram-sha-512", username, password },
      // Alinhado com socket.connection.setup.timeout.ms / max.ms do consumer
      connectionTimeout: 60_000,
      authenticationTimeout: 30_000,
      requestTimeout: 60_000,
      enforceRequestTimeout: false,
      logLevel: logLevel.ERROR,
    });

    const producer = kafka.producer({
      idempotent: true,
      maxInFlightRequests: 5,
      retry: { retries: 5, initialRetryTime: 300 },
    });

    try {
      await producer.connect();
      // ID da mensagem: codigoCliente-yyyyMMddHHmmss (America/Sao_Paulo)
      const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Sao_Paulo",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false,
      }).formatToParts(new Date());
      const get = (t: string) => fmt.find((p) => p.type === t)?.value ?? "";
      const localDateTime =
        `${get("year")}${get("month")}${get("day")}${get("hour")}${get("minute")}${get("second")}`;
      const messageKey = `${payload.codigoCliente ?? "sem-cliente"}-${localDateTime}`;

      await producer.send({
        topic,
        acks: -1,
        messages: [
          {
            key: messageKey,
            value: JSON.stringify(payload),
          },
        ],
      });
    } finally {
      try { await producer.disconnect(); } catch (_) { /* noop */ }
    }

    console.log(`[kafka-publish] OK schedule=${schedule.id} topic=${topic}`);
    return json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[kafka-publish] ERROR", msg);
    return json({ ok: false, error: msg });
  }
});
