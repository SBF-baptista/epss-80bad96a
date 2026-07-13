import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${new Date().toISOString()}][${requestId}] ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        ok: true,
        endpoint: "instalacao",
        method: "POST",
        auth: "Header x-api-key obrigatório",
        example_payload: {
          contrato: "077529",
          filial: "300",
          placa: "UKO4B80",
          imei: "4EUM2100171W2",
          tecnicoInstalador: "DARIO WANDERSON ARAUJO TRINDADE",
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

  const contrato = typeof body.contrato === "string" ? body.contrato.trim() : (body.contrato != null ? String(body.contrato) : null);
  const filial = typeof body.filial === "string" ? body.filial.trim() : (body.filial != null ? String(body.filial) : null);
  const placa = typeof body.placa === "string" ? body.placa.trim().toUpperCase() : null;
  const imei = typeof body.imei === "string" ? body.imei.trim() : null;
  const tecnicoInstalador = typeof body.tecnicoInstalador === "string" ? body.tecnicoInstalador.trim() : null;

  const missing: string[] = [];
  if (!contrato) missing.push("contrato");
  if (!filial) missing.push("filial");
  if (!placa) missing.push("placa");
  if (!imei) missing.push("imei");
  if (!tecnicoInstalador) missing.push("tecnicoInstalador");

  if (missing.length) {
    return new Response(
      JSON.stringify({ error: "Validation error", missing_fields: missing, request_id: requestId }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase
    .from("instalacoes_recebidas")
    .insert({
      contrato,
      filial,
      placa,
      imei,
      tecnico_instalador: tecnicoInstalador,
      vehicle_plate: placa,
      tracker_imei: imei,
      technician_name: tecnicoInstalador,
      status: "pending",
      raw_payload: body,
      source: req.headers.get("user-agent"),
      request_id: requestId,
    })
    .select("id, created_at, contrato, filial, placa, imei, tecnico_instalador, status")
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
