import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { combineAgendaRecords, type Row } from "./records.ts";

const headers = { ...corsHeaders, "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...headers, "Content-Type": "application/json" },
});
const text = z.string().trim().min(1).max(255).optional();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const filtersSchema = z.object({
  placa: text, cliente: text, tecnico: text, tipo_contrato: text,
  data_inicio: date, data_fim: date,
  limit: z.coerce.number().int().min(1).max(100000).default(100000),
  page: z.coerce.number().int().min(1).max(100000).default(1),
}).refine(p => !p.data_inicio || !p.data_fim || p.data_inicio <= p.data_fim, {
  message: "data_inicio deve ser anterior ou igual a data_fim",
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "GET" && req.method !== "POST") return json({ ok: false, error: "Método não permitido" }, 405);
  try {
    const url = new URL(req.url);
    let body: unknown = {};
    if (req.method === "POST") {
      try { body = await req.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400); }
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ ok: false, error: "Informe um objeto JSON" }, 400);
    const parsed = filtersSchema.safeParse({ ...body, ...Object.fromEntries(url.searchParams) });
    if (!parsed.success) return json({ ok: false, error: parsed.error.flatten() }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) throw new Error("Configuração indisponível");
    const supabase = createClient(supabaseUrl, serviceKey);
    // Page through the database cap before applying pagination to the combined feed.
    const readAll = async (table: string, columns: string, column?: string, value?: string | string[]) => {
      const rows: Row[] = [];
      for (let from = 0; ; from += 1000) {
        let query = supabase.from(table).select(columns).order("id").range(from, from + 999);
        if (column && value) query = Array.isArray(value) ? query.in(column, value) : query.eq(column, value);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        rows.push(...(data as unknown as Row[] ?? []));
        if (!data || data.length < 1000) return rows;
      }
    };
    const readIds = async (table: string, columns: string, column: string, ids: string[]) => {
      const rows: Row[] = [];
      const unique = [...new Set(ids.filter(Boolean))];
      for (let start = 0; start < unique.length; start += 100) {
        rows.push(...await readAll(table, columns, column, unique.slice(start, start + 100)));
      }
      return rows;
    };
    const kitColumns = "id,incoming_vehicle_id,vehicle_plate,vehicle_brand,vehicle_model,vehicle_year,customer_name,equipment_model,shipped_at,status";
    const [installations, shipments] = await Promise.all([
      readAll("installation_schedules", "id,kit_schedule_id,scheduled_date,scheduled_time,service,customer,plate,tracker_model,tipo_contrato,technician_name,vehicle_model,vehicle_year"),
      readAll("kit_schedules", kitColumns, "status", "shipped"),
    ]);
    const linkedKits = await readIds("kit_schedules", kitColumns, "id", installations.map(r => String(r.kit_schedule_id ?? "")));
    const kits = [...linkedKits, ...shipments];
    const vehicleColumns = "id,plate,pending_contract_id,usage_type,company_name,brand,vehicle,year,created_at";
    const [linkedVehicles, externalVehicles] = await Promise.all([
      readIds("incoming_vehicles", vehicleColumns, "id", kits.map(k => String(k.incoming_vehicle_id ?? ""))),
      readIds("incoming_vehicles", vehicleColumns, "plate", [
        ...installations.filter(r => !r.kit_schedule_id).map(r => String(r.plate ?? "").trim().toUpperCase()),
        ...shipments.filter(r => !r.incoming_vehicle_id).map(r => String(r.vehicle_plate ?? "").trim().toUpperCase()),
      ]),
    ]);
    const vehicles = [...linkedVehicles, ...externalVehicles].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return json({ agendamentos: combineAgendaRecords(installations, shipments, kits, vehicles, parsed.data) });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});
