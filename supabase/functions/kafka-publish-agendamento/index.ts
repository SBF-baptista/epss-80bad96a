// Edge Function: kafka-publish-agendamento
// Publica o evento no Kafka (SASL_SSL + SCRAM-SHA-256) após a criação
// de um agendamento (kit_schedules) usando o payload rico:
//   Payload: saleSummaryId, clientCode, eventAt, customerGroups[], accessories[]
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


const onlyDigits = (s?: string | null) => String(s ?? "").replace(/\D+/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const scheduleId: string | undefined = body?.scheduleId;
    const installationScheduleId: string | undefined = body?.installationScheduleId;

    if ((!scheduleId || typeof scheduleId !== "string") &&
        (!installationScheduleId || typeof installationScheduleId !== "string")) {
      return json({ ok: false, error: "scheduleId ou installationScheduleId obrigatório" });
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

    // 1) Agendamento — aceita kit_schedules OU installation_schedules
    let schedule: any = null;
    let sourceLabel = "";

    if (scheduleId) {
      const { data, error: sErr } = await supabase
        .from("kit_schedules")
        .select(
          "id, vehicle_plate, vehicle_model, vehicle_brand, vehicle_year, customer_id, customer_name, customer_email, customer_phone, customer_document_number, scheduled_date, installation_time, status, installation_address_street, installation_address_number, installation_address_neighborhood, installation_address_city, installation_address_postal_code, installation_address_complement",
        )
        .eq("id", scheduleId)
        .maybeSingle();
      if (sErr || !data) {
        return json({ ok: false, error: `Agendamento (kit) não encontrado: ${sErr?.message ?? "n/a"}` });
      }
      schedule = data;
      sourceLabel = `kit:${scheduleId}`;
    } else {
      const { data, error: iErr } = await supabase
        .from("installation_schedules")
        .select("id, plate, vehicle_model, customer, address, phone, scheduled_date, scheduled_time")
        .eq("id", installationScheduleId!)
        .maybeSingle();
      if (iErr || !data) {
        return json({ ok: false, error: `Agendamento (installation) não encontrado: ${iErr?.message ?? "n/a"}` });
      }
      schedule = {
        id: data.id,
        vehicle_plate: data.plate,
        vehicle_model: data.vehicle_model,
        vehicle_brand: null,
        vehicle_year: null,
        customer_id: null,
        customer_name: data.customer,
        customer_email: null,
        customer_phone: data.phone,
        customer_document_number: null,
        scheduled_date: data.scheduled_date,
        installation_time: data.scheduled_time,
        status: null,
        installation_address_street: data.address,
        installation_address_number: null,
        installation_address_neighborhood: null,
        installation_address_city: null,
        installation_address_postal_code: null,
        installation_address_complement: null,
      };
      sourceLabel = `installation:${installationScheduleId}`;
    }

    // 2) Cliente — via customer_id OU (para installation_schedules) via placa em incoming_vehicles → sale_summary_id
    let customer: any = null;
    let saleSummaryIdFromPlate: number | null = null;

    if (schedule.customer_id) {
      const { data } = await supabase
        .from("customers")
        .select(
          "id, name, company_name, email, phone, document_number, sale_summary_id, address_street, address_number, address_neighborhood, address_city, address_postal_code, address_complement",
        )
        .eq("id", schedule.customer_id)
        .maybeSingle();
      customer = data;
    } else if (schedule.vehicle_plate) {
      // Busca via placa: primeiro incoming_vehicles para achar sale_summary_id
      const { data: ivp } = await supabase
        .from("incoming_vehicles")
        .select("sale_summary_id")
        .eq("plate", schedule.vehicle_plate)
        .not("sale_summary_id", "is", null)
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      saleSummaryIdFromPlate = (ivp?.sale_summary_id as number | undefined) ?? null;

      if (saleSummaryIdFromPlate) {
        const { data } = await supabase
          .from("customers")
          .select(
            "id, name, company_name, email, phone, document_number, sale_summary_id, address_street, address_number, address_neighborhood, address_city, address_postal_code, address_complement",
          )
          .eq("sale_summary_id", saleSummaryIdFromPlate)
          .maybeSingle();
        customer = data;
      }
    }

    const saleSummaryId: number | null =
      (customer?.sale_summary_id as number | undefined) ?? saleSummaryIdFromPlate ?? null;

    // 3) Kickoff history (vehicles_data + accessories_sale)
    let kickoff: any = null;
    if (saleSummaryId) {
      const { data: kh } = await supabase
        .from("kickoff_history")
        .select("vehicles_data, accessories_sale, camera_extra_sale, company_name")
        .eq("sale_summary_id", saleSummaryId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      kickoff = kh;
    }

    const vehiclesData: Array<Record<string, any>> = Array.isArray(kickoff?.vehicles_data)
      ? kickoff.vehicles_data
      : [];

    const findVehicle = (plate?: string | null) => {
      const p = String(plate ?? "").toUpperCase();
      return vehiclesData.find(
        (v) => String(v?.plate ?? "").toUpperCase() === p,
      );
    };
    const matchVehicle = findVehicle(schedule.vehicle_plate);

    // 4) Incoming vehicle (para contractCode / chassis / cor — quando existirem)
    let incoming: any = null;
    if (saleSummaryId && schedule.vehicle_plate) {
      const { data: iv } = await supabase
        .from("incoming_vehicles")
        .select("plate, brand, vehicle, year, usage_type, pending_contract_id, company_name")
        .eq("sale_summary_id", saleSummaryId)
        .eq("plate", schedule.vehicle_plate)
        .maybeSingle();
      incoming = iv;
    }

    // codigoCliente: numérico — usamos sale_summary_id (única chave numérica do cliente)
    const codigoCliente: number | null = saleSummaryId;
    const clientCodeStr: string = saleSummaryId != null ? String(saleSummaryId) : "";

    const razaoSocial = customer?.company_name ?? schedule.customer_name ?? null;

    // ============ PAYLOAD (formato rico) ============
    // Acessórios e módulos consolidados a partir do kickoff_history
    type AccItem = { name: string; category: string; quantity: number };
    const accMap = new Map<string, AccItem>();
    const pushAcc = (name?: string | null, category = "Acessório", qty = 1) => {
      const n = String(name ?? "").trim();
      if (!n) return;
      const key = `${category}::${n.toLowerCase()}`;
      const prev = accMap.get(key);
      if (prev) prev.quantity += qty;
      else accMap.set(key, { name: n, category, quantity: qty });
    };

    for (const v of vehiclesData) {
      const accs = Array.isArray(v?.accessories) ? v.accessories : [];
      for (const a of accs) {
        if (typeof a === "string") pushAcc(a, "Acessório", 1);
        else pushAcc(a?.name ?? a?.accessory_name, "Acessório", Number(a?.quantity ?? 1) || 1);
      }
      const mods = Array.isArray(v?.selected_modules) ? v.selected_modules : [];
      for (const m of mods) {
        if (typeof m === "string") pushAcc(m, "Módulo", 1);
        else pushAcc(m?.name, "Módulo", Number(m?.quantity ?? 1) || 1);
      }
    }
    const accessoriesSale = Array.isArray(kickoff?.accessories_sale) ? kickoff.accessories_sale : [];
    for (const a of accessoriesSale) {
      pushAcc(a?.name ?? a?.accessory_name, "Acessório", Number(a?.quantity ?? 1) || 1);
    }
    const cameraSale = Array.isArray(kickoff?.camera_extra_sale) ? kickoff.camera_extra_sale : [];
    for (const c of cameraSale) {
      pushAcc(c?.name ?? "CAMERA EXTRA", "Acessório", Number(c?.quantity ?? 1) || 1);
    }

    const vehicleRich = {
      contractCode: incoming?.pending_contract_id != null ? String(incoming.pending_contract_id) : null,
      productDescription: matchVehicle?.usage_type ?? incoming?.usage_type ?? null,
      plate: schedule.vehicle_plate ?? null,
      brand: schedule.vehicle_brand ?? matchVehicle?.brand ?? incoming?.brand ?? null,
      model: schedule.vehicle_model ?? matchVehicle?.model ?? incoming?.vehicle ?? null,
      year: schedule.vehicle_year ?? matchVehicle?.year ?? incoming?.year ?? null,
      chassis: matchVehicle?.chassis ?? null,
      color: matchVehicle?.color ?? null,
    };

    const customerGroup = {
      companyName: razaoSocial,
      clientCode: clientCodeStr,
      taxId: onlyDigits(customer?.document_number ?? schedule.customer_document_number) || null,
      phone: onlyDigits(customer?.phone ?? schedule.customer_phone) || null,
      address: {
        city: customer?.address_city ?? schedule.installation_address_city ?? null,
        district: customer?.address_neighborhood ?? schedule.installation_address_neighborhood ?? null,
        street: customer?.address_street ?? schedule.installation_address_street ?? null,
        number: customer?.address_number ?? schedule.installation_address_number ?? null,
        zipCode: onlyDigits(customer?.address_postal_code ?? schedule.installation_address_postal_code) || null,
        complement: customer?.address_complement ?? schedule.installation_address_complement ?? "",
      },
      vehicles: [vehicleRich],
    };

    const payloadRico = {
      saleSummaryId,
      clientCode: clientCodeStr,
      eventAt: new Date().toISOString().replace(/\.\d{3}Z$/, ""),
      customerGroups: [customerGroup],
      accessories: Array.from(accMap.values()),
    };

    // 5) Publica no Kafka — uma mensagem no tópico
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
      clientId: "opmss-edge",
      brokers: brokers.split(",").map((b) => b.trim()).filter(Boolean),
      ssl: { ca: [caPem], rejectUnauthorized: true },
      sasl: { mechanism: "scram-sha-512", username, password },
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
      const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Sao_Paulo",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false,
      }).formatToParts(new Date());
      const get = (t: string) => fmt.find((p) => p.type === t)?.value ?? "";
      const localDateTime =
        `${get("year")}${get("month")}${get("day")}${get("hour")}${get("minute")}${get("second")}`;
      const baseKey = `${codigoCliente ?? "sem-cliente"}-${localDateTime}`;

      await producer.send({
        topic,
        acks: -1,
        messages: [
          {
            key: `${baseKey}-v2`,
            value: JSON.stringify(payloadRico),
            headers: { "schema-version": "v2-rico" },
          },
        ],
      });
    } finally {
      try { await producer.disconnect(); } catch (_) { /* noop */ }
    }

    console.log(`[kafka-publish] OK schedule=${schedule.id} topic=${topic} (v2-rico)`);
    return json({ ok: true, sent: ["v2-rico"] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[kafka-publish] ERROR", msg);
    return json({ ok: false, error: msg });
  }
});
