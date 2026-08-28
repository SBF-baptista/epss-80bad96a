// Envia o e-mail de instalação para a Frota (formato email-frota-instalar.ftl)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendMail } from "./smtp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMAIL_CHAMADO_TOMTICKET = "chamado.vendasdiretas2@segsat.com";
const EMAIL_CHAMADO_FROTA = "frota.chamado@segsat.com";

const TIPOS_FROTA = ["MENSALISTA", "TELEMETRIA", "VIDEOMONITORAMENTO"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const up = (v: unknown) => (v == null || v === "" ? "" : String(v).toUpperCase());

interface Campos {
  tipo_contrato?: string;
  filial?: string;
  contrato?: string;
  cliente?: string;
  cpf_cnpj?: string;
  nome_fantasia?: string;
  endereco?: string;
  numero?: string;
  cep?: string;
  bairro?: string;
  cidade?: string;
  telefone1?: string;
  telefone2?: string;
  email?: string;
  placa?: string;
  chassi?: string;
  marca?: string;
  modelo?: string;
  ano?: string;
  cor?: string;
  acessorios?: string[];
}

function montarCorpo(c: Campos): string {
  const linhas = [
    ` TIPO CONTRATO: ${up(c.tipo_contrato)}`,
    ` FILIAL: ${c.filial ?? ""}`,
    ` CONTRATO: ${c.contrato ?? ""}`,
    ` CLIENTE: ${c.cliente ?? ""}`,
    ` CPF/CNPJ: ${c.cpf_cnpj ?? ""}`,
    ` NOME FANTASIA: ${c.nome_fantasia ?? ""}`,
    ` ENDEREÇO: ${c.endereco ?? ""}`,
    ` NUMERO: ${c.numero ?? ""}`,
    ` CEP: ${c.cep ?? ""}`,
    ` BAIRRO: ${c.bairro ?? ""}`,
    ` CIDADE: ${c.cidade ?? ""}`,
    ` TELEFONE 1: ${c.telefone1 ?? ""}`,
    ` TELEFONE 2: ${c.telefone2 ?? ""}`,
    ` EMAIL: ${c.email ?? ""}`,
    ` PLACA: ${up(c.placa)}`,
    ` CHASSI: ${up(c.chassi)}`,
    ` MARCA: ${up(c.marca)}`,
    ` MODELO: ${up(c.modelo)}`,
    ` ANO: ${c.ano ?? ""}`,
    ` COR: ${up(c.cor)}`,
  ];

  if (c.acessorios && c.acessorios.length > 0) {
    linhas.push("", "ACESSÓRIOS:");
    for (const a of c.acessorios) linhas.push(`     ${up(a)}`);
  }

  return linhas.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Apenas POST é permitido" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const scheduleId = body.installationScheduleId ? String(body.installationScheduleId) : null;
    const dryRun = body.dryRun === true;

    let campos: Campos = (body.campos as Campos) ?? {};

    // Enriquecimento a partir do agendamento, quando informado
    if (scheduleId) {
      const { data: sched } = await supabase
        .from("installation_schedules")
        .select("*")
        .eq("id", scheduleId)
        .maybeSingle();

      if (!sched) return json({ ok: false, error: "Agendamento não encontrado" });

      const plate = String(sched.plate || "").toUpperCase();

      // Dados do veículo/cliente vindos do kickoff
      const { data: iv } = await supabase
        .from("incoming_vehicles")
        .select(
          "company_name, cpf, phone, address_city, address_district, address_street, address_number, address_zip_code, brand, vehicle, year",
        )
        .eq("plate", plate)
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Acessórios ligados à placa
      let acessorios: string[] = [];
      if (iv) {
        const { data: accs } = await supabase
          .from("accessories")
          .select("name, categories, company_name")
          .eq("company_name", iv.company_name ?? "");
        acessorios = (accs || [])
          .filter((a: any) => (a.categories || "").toLowerCase().includes("acess"))
          .map((a: any) => a.name);
      }

      // filial/contrato vêm concatenados em tipo_contrato/filialContrato do fluxo Frota
      const filialContrato = String(body.filialContrato ?? "");
      const filial = filialContrato.length > 3 ? filialContrato.slice(0, 3) : "";
      const contrato = filialContrato.length > 3 ? filialContrato.slice(3) : filialContrato;

      campos = {
        tipo_contrato: sched.tipo_contrato ?? "",
        filial,
        contrato,
        cliente: sched.customer ?? iv?.company_name ?? "",
        cpf_cnpj: iv?.cpf ?? "",
        nome_fantasia: "",
        endereco: iv?.address_street ?? sched.address ?? "",
        numero: iv?.address_number ?? "",
        cep: iv?.address_zip_code ?? "",
        bairro: iv?.address_district ?? "",
        cidade: iv?.address_city ?? "",
        telefone1: iv?.phone ?? sched.phone ?? "",
        telefone2: "",
        email: "",
        placa: plate,
        chassi: "",
        marca: iv?.brand ?? "",
        modelo: sched.vehicle_model ?? iv?.vehicle ?? "",
        ano: String(sched.vehicle_year ?? iv?.year ?? ""),
        cor: "",
        acessorios,
        ...(body.campos as Campos ?? {}),
      };
    }

    const tipo = up(campos.tipo_contrato);
    if (!body.force && !TIPOS_FROTA.includes(tipo)) {
      return json({ ok: true, skipped: true, reason: `tipo_contrato "${tipo}" não é contrato Frota` });
    }

    const subject = campos.cliente ?? "";
    const text = montarCorpo(campos);
    const toOverride = typeof body.to === "string" && body.to.includes("@") ? body.to : null;
    const destinatario = toOverride ?? EMAIL_CHAMADO_FROTA;

    if (dryRun) {
      return json({ ok: true, dryRun: true, from: EMAIL_CHAMADO_TOMTICKET, to: destinatario, subject, text });
    }

    const host = Deno.env.get("SMTP_HOST")!;
    const port = Number(Deno.env.get("SMTP_PORT") ?? "587");
    const username = Deno.env.get("SMTP_USER")!;
    const password = Deno.env.get("SMTP_PASSWORD")!;

    await sendMail({
      hostname: host,
      port,
      username,
      password,
      from: EMAIL_CHAMADO_TOMTICKET,
      to: destinatario,
      subject,
      text,
    });

    console.log(`[email-frota] enviado para ${destinatario} assunto="${subject}"`);

    return json({ ok: true, from: EMAIL_CHAMADO_TOMTICKET, to: destinatario, subject, text });
  } catch (e) {
    console.error("[email-frota] erro:", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});
