import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function pickString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

function pickNumber(...vals: unknown[]): number | null {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

function pickDate(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }
  return null;
}

function pickArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  return [];
}

function pickObject(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const ts = new Date().toISOString();
  console.log(`[${ts}][${requestId}] ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // GET: endpoint de health / documentação
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        ok: true,
        endpoint: "instalacao",
        method: "POST",
        auth: "Header x-api-key obrigatório",
        example_payload: {
          company_name: "Empresa Exemplo Ltda",
          cpf_cnpj: "12.345.678/0001-90",
          contact_name: "João Silva",
          contact_phone: "+5511999998888",
          contact_email: "contato@empresa.com",
          address: {
            street: "Rua Exemplo",
            number: "123",
            complement: "Sala 4",
            district: "Centro",
            city: "São Paulo",
            state: "SP",
            zip: "01000-000",
          },
          technician: {
            name: "Carlos Técnico",
            phone: "+5511988887777",
            document: "123.456.789-00",
          },
          installation: {
            date: "2026-07-13T14:30:00Z",
            type: "instalacao",
            service_order: "OS-12345",
            external_reference: "SEG-9988",
          },
          vehicle: {
            plate: "ABC1D23",
            brand: "Volkswagen",
            model: "Delivery 11.180",
            year: 2024,
            color: "Branco",
            chassis: "9BW...",
            renavam: "00000000000",
          },
          tracker: {
            model: "FMC130",
            imei: "356789012345678",
            serial: "SN-99887766",
          },
          sim: {
            iccid: "8955000000000000000",
            operator: "Vivo",
            phone: "+5511970000000",
          },
          accessories: [{ name: "Botão de pânico", quantity: 1, serial: "BP-01" }],
          photos: [{ url: "https://.../foto1.jpg", type: "antes", description: "Painel" }],
          checklist: { equipamento_testado: true, sinal_ok: true },
          metadata: { lat: -23.55, lng: -46.63, app_version: "1.0.0" },
          observations: "Instalação concluída sem intercorrências.",
          source: "app-tecnico",
        },
      }, null, 2),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", request_id: requestId }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Auth via x-api-key (mesma chave do receive-vehicle)
  const apiKey = req.headers.get("x-api-key");
  const expected = Deno.env.get("VEHICLE_API_KEY");
  if (!expected) {
    console.error(`[${requestId}] VEHICLE_API_KEY não configurada`);
    return new Response(
      JSON.stringify({ error: "Server configuration error", request_id: requestId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (!apiKey || apiKey !== expected) {
    return new Response(
      JSON.stringify({ error: "Unauthorized", message: "x-api-key inválida ou ausente", request_id: requestId }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Parse body
  let body: any;
  try {
    const text = await req.text();
    if (!text.trim()) throw new Error("Empty body");
    body = JSON.parse(text);
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON", message: (e as any)?.message, request_id: requestId }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const address = pickObject(body.address);
  const technician = pickObject(body.technician);
  const installation = pickObject(body.installation);
  const vehicle = pickObject(body.vehicle);
  const tracker = pickObject(body.tracker);
  const sim = pickObject(body.sim);

  const row = {
    company_name: pickString(body.company_name, body.company, body.empresa),
    cpf_cnpj: pickString(body.cpf_cnpj, body.cnpj, body.cpf, body.tax_id),
    contact_name: pickString(body.contact_name, body.contato, body.responsavel),
    contact_phone: pickString(body.contact_phone, body.phone, body.telefone),
    contact_email: pickString(body.contact_email, body.email),

    address_street: pickString(address.street, address.rua, body.street),
    address_number: pickString(address.number, address.numero),
    address_complement: pickString(address.complement, address.complemento),
    address_district: pickString(address.district, address.bairro),
    address_city: pickString(address.city, address.cidade),
    address_state: pickString(address.state, address.uf, address.estado),
    address_zip: pickString(address.zip, address.cep, address.zip_code),

    technician_name: pickString(technician.name, technician.nome, body.technician_name),
    technician_phone: pickString(technician.phone, technician.telefone),
    technician_document: pickString(technician.document, technician.cpf, technician.documento),

    installation_date: pickDate(installation.date, installation.data, body.installation_date, body.date),
    installation_type: pickString(installation.type, installation.tipo, body.installation_type) ?? "instalacao",
    service_order: pickString(installation.service_order, installation.os, body.service_order),
    external_reference: pickString(installation.external_reference, body.external_reference, body.reference),

    vehicle_plate: pickString(vehicle.plate, vehicle.placa, body.plate)?.toUpperCase() ?? null,
    vehicle_brand: pickString(vehicle.brand, vehicle.marca),
    vehicle_model: pickString(vehicle.model, vehicle.modelo),
    vehicle_year: pickNumber(vehicle.year, vehicle.ano),
    vehicle_color: pickString(vehicle.color, vehicle.cor),
    vehicle_chassis: pickString(vehicle.chassis, vehicle.chassi),
    vehicle_renavam: pickString(vehicle.renavam),

    tracker_model: pickString(tracker.model, tracker.modelo, body.tracker_model),
    tracker_imei: pickString(tracker.imei, body.imei),
    tracker_serial: pickString(tracker.serial, tracker.serial_number, body.serial),

    sim_iccid: pickString(sim.iccid, body.iccid),
    sim_operator: pickString(sim.operator, sim.operadora),
    sim_phone: pickString(sim.phone, sim.numero),

    accessories: pickArray(body.accessories ?? body.acessorios),
    photos: pickArray(body.photos ?? body.fotos),
    checklist: pickObject(body.checklist),
    metadata: pickObject(body.metadata),

    observations: pickString(body.observations, body.observacoes, body.notes),

    status: "pending",
    raw_payload: body,
    source: pickString(body.source, body.origem, req.headers.get("user-agent")),
    request_id: requestId,
  };

  const { data, error } = await supabase
    .from("instalacoes_recebidas")
    .insert(row)
    .select("id, created_at, status, vehicle_plate, company_name")
    .single();

  if (error) {
    console.error(`[${requestId}] Insert error:`, error);
    return new Response(
      JSON.stringify({ error: "Database error", message: error.message, request_id: requestId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  console.log(`[${requestId}] Instalação registrada: ${data.id}`);
  return new Response(
    JSON.stringify({
      success: true,
      message: "Dados de instalação recebidos com sucesso",
      request_id: requestId,
      installation: data,
    }),
    { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
