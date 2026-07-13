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
        endpoint: "retirada",
        method: "POST",
        auth: "público (sem autenticação)",
        example_payload: {
          contrato: "077529",
          filial: "300",
          placa: "UKO4B80",
          imei: "4EUM2100171W2",
          tecnicoRetirada: "DARIO WANDERSON ARAUJO TRINDADE",
          motivo: "cancelamento_contrato",
          observacoes: "Equipamento retirado sem avarias",
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

  // Endpoint público — sem autenticação

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

  const str = (v: any) =>
    typeof v === "string" ? v.trim() : v != null ? String(v).trim() : null;

  const contrato = str(body.contrato);
  const filial = str(body.filial);
  const placa = str(body.placa)?.toUpperCase() ?? null;
  const imei = str(body.imei);
  const tecnicoRetirada = str(body.tecnicoRetirada ?? body.tecnico_retirada ?? body.tecnicoInstalador);
  const motivo = str(body.motivo ?? body.reason);
  const observacoes = str(body.observacoes ?? body.observations ?? body.notes);

  const missing: string[] = [];
  if (!contrato) missing.push("contrato");
  if (!filial) missing.push("filial");
  if (!placa) missing.push("placa");
  if (!imei) missing.push("imei");
  if (!tecnicoRetirada) missing.push("tecnicoRetirada");

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
    .from("retiradas_recebidas")
    .insert({
      contrato,
      filial,
      placa,
      imei,
      tecnico_retirada: tecnicoRetirada,
      motivo,
      observacoes,
      status: "pending",
      raw_payload: body,
      source: req.headers.get("user-agent"),
      request_id: requestId,
    })
    .select("id, created_at, contrato, filial, placa, imei, tecnico_retirada, motivo, status")
    .single();

  if (error) {
    console.error(`[${requestId}] Insert error:`, error);
    return new Response(
      JSON.stringify({ error: "Database error", message: error.message, request_id: requestId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  console.log(`[${requestId}] Retirada registrada: ${data.id}`);
  return new Response(
    JSON.stringify({
      success: true,
      message: "Dados de retirada recebidos com sucesso",
      request_id: requestId,
      removal: data,
    }),
    { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
