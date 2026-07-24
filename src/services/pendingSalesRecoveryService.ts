import { supabase } from "@/integrations/supabase/client";

export interface PendingSalePlate {
  plate: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  raw_usage_type?: string | null;
}

export interface PendingSaleGroup {
  sale_summary_id: number;
  company_name: string | null;
  last_event_at: string;
  reason: "unmapped_usage_type" | "receive_vehicle_failed" | "other";
  reason_detail: string | null;
  raw_usage_types: string[];
  vehicle_count: number;
  plates: PendingSalePlate[];
  log_ids: string[];
}

type LogRow = {
  id: string;
  action: string;
  created_at: string;
  entity_id: string | null;
  entity_name: string | null;
  error_message: string | null;
  new_state: Record<string, unknown> | null;
};

/**
 * Lista vendas presas por usage_type inválido ou falha no receive-vehicle,
 * agrupadas por sale_summary_id. Deduz a lista de placas a partir de `new_state.plates`.
 */
export async function fetchPendingSaleGroups(): Promise<PendingSaleGroup[]> {
  const { data, error } = await supabase
    .from("app_logs")
    .select("id, action, created_at, entity_id, entity_name, error_message, new_state")
    .in("action", ["segsale_unmapped_usage_type", "segsale_receive_vehicle_failed"])
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) throw error;

  const grouped = new Map<number, PendingSaleGroup>();

  for (const row of (data ?? []) as LogRow[]) {
    const saleId = Number(row.entity_id);
    if (!Number.isFinite(saleId) || saleId <= 0) continue;

    const existing = grouped.get(saleId);
    const ns = (row.new_state ?? {}) as Record<string, unknown>;
    const rawPlates = Array.isArray(ns.plates) ? (ns.plates as unknown[]) : [];
    const platesFromLog: PendingSalePlate[] = rawPlates
      .map((p) => (typeof p === "string" ? p.trim() : null))
      .filter((p): p is string => !!p && p.length > 0)
      .map((plate) => ({
        plate: plate.toUpperCase(),
        raw_usage_type: typeof ns.raw_usage_type === "string" ? (ns.raw_usage_type as string) : null,
      }));

    const rawUsage = typeof ns.raw_usage_type === "string" ? (ns.raw_usage_type as string) : null;

    const reason: PendingSaleGroup["reason"] =
      row.action === "segsale_unmapped_usage_type" ? "unmapped_usage_type" :
      row.action === "segsale_receive_vehicle_failed" ? "receive_vehicle_failed" : "other";

    if (existing) {
      // agrega placas evitando duplicatas
      const seen = new Set(existing.plates.map(p => p.plate));
      for (const p of platesFromLog) {
        if (!seen.has(p.plate)) {
          existing.plates.push(p);
          seen.add(p.plate);
        }
      }
      if (rawUsage && !existing.raw_usage_types.includes(rawUsage)) {
        existing.raw_usage_types.push(rawUsage);
      }
      existing.log_ids.push(row.id);
      // last_event_at: já vem ordenado desc, então o primeiro é o mais recente
      // não sobrescreve
    } else {
      grouped.set(saleId, {
        sale_summary_id: saleId,
        company_name: row.entity_name ?? (typeof ns.company_name === "string" ? (ns.company_name as string) : null),
        last_event_at: row.created_at,
        reason,
        reason_detail: row.error_message,
        raw_usage_types: rawUsage ? [rawUsage] : [],
        vehicle_count: platesFromLog.length,
        plates: platesFromLog,
        log_ids: [row.id],
      });
    }
  }

  // Recalcula vehicle_count
  for (const g of grouped.values()) g.vehicle_count = g.plates.length;

  // Filtra grupos que já foram totalmente recuperados (todas as placas com status='success' em pending_sales_recovery_log)
  const saleIds = Array.from(grouped.keys());
  if (saleIds.length > 0) {
    const { data: recoveryLogs } = await supabase
      .from("pending_sales_recovery_log")
      .select("sale_summary_id, plate, status")
      .in("sale_summary_id", saleIds)
      .eq("status", "success");

    const recoveredByS: Map<number, Set<string>> = new Map();
    for (const r of recoveryLogs ?? []) {
      const s = recoveredByS.get(r.sale_summary_id) ?? new Set<string>();
      s.add((r.plate ?? "").toUpperCase());
      recoveredByS.set(r.sale_summary_id, s);
    }

    for (const [saleId, group] of grouped) {
      const recovered = recoveredByS.get(saleId);
      if (!recovered) continue;
      // se todas as placas do grupo têm registro de sucesso, remove o grupo
      const allDone = group.plates.length > 0 && group.plates.every(p => recovered.has(p.plate));
      if (allDone) grouped.delete(saleId);
    }
  }

  return Array.from(grouped.values()).sort((a, b) =>
    new Date(b.last_event_at).getTime() - new Date(a.last_event_at).getTime()
  );
}

export interface WialonSearchResult {
  plate: string;
  frota: { exists: boolean; item_id: number | null; item_name: string | null } | null;
  auto: { exists: boolean; item_id: number | null; item_name: string | null } | null;
  errors?: { frota?: string; auto?: string };
}

export async function searchPlatesInWialon(plates: string[]): Promise<Record<string, WialonSearchResult>> {
  if (plates.length === 0) return {};
  const { data, error } = await supabase.functions.invoke("wialon-search-plate", {
    body: { plates },
  });
  if (error) throw error;
  return (data?.results ?? {}) as Record<string, WialonSearchResult>;
}

export interface RecoverResult {
  plate: string;
  status: "success" | "error" | "blocked_already_exists";
  system?: "frota" | "auto" | null;
  message?: string;
}

export async function recoverPendingSale(params: {
  action: "send_to_kickoff" | "create_unit_now";
  sale_summary_id: number;
  plates: string[];
  justification: string;
  tipo_contrato_hint?: "TELEMETRIA" | "MENSALISTA";
}): Promise<{ ok: boolean; results: RecoverResult[]; error?: string }> {
  const { data, error } = await supabase.functions.invoke("recover-pending-sale", { body: params });
  if (error) return { ok: false, results: [], error: error.message };
  return { ok: !!data?.ok, results: (data?.results ?? []) as RecoverResult[] };
}

/**
 * Busca vendas diretamente do Segsale por sale_summary_id (não depende de app_logs).
 * Útil para vendas legadas que ficaram presas antes do fix de logging.
 */
export async function fetchSaleGroupsByIds(ids: number[]): Promise<PendingSaleGroup[]> {
  const uniqueIds = Array.from(new Set(ids.filter(n => Number.isFinite(n) && n > 0)));
  if (uniqueIds.length === 0) return [];

  const results: PendingSaleGroup[] = [];
  for (const id of uniqueIds) {
    try {
      const { fetchSegsaleProductsDirect } = await import("./segsaleService");
      const data = await fetchSegsaleProductsDirect(id);
      if (!data?.success || !Array.isArray(data?.sales)) {
        results.push({
          sale_summary_id: id,
          company_name: null,
          last_event_at: new Date().toISOString(),
          reason: "other",
          reason_detail: error?.message ?? data?.message ?? "Sem dados no Segsale",
          raw_usage_types: [],
          vehicle_count: 0,
          plates: [],
          log_ids: [],
        });
        continue;
      }
      const sales = data.sales as Array<{ company_name?: string; usage_type?: string; vehicles?: Array<{ plate?: string | null }> }>;
      const plates: PendingSalePlate[] = [];
      const rawUsage: string[] = [];
      let company: string | null = null;
      for (const s of sales) {
        if (!company && s.company_name) company = s.company_name;
        if (s.usage_type && !rawUsage.includes(s.usage_type)) rawUsage.push(s.usage_type);
        for (const v of s.vehicles ?? []) {
          const plate = (v.plate ?? "").trim().toUpperCase();
          if (plate && !plates.some(p => p.plate === plate)) {
            plates.push({ plate, raw_usage_type: s.usage_type ?? null });
          }
        }
      }
      results.push({
        sale_summary_id: id,
        company_name: company,
        last_event_at: new Date().toISOString(),
        reason: "other",
        reason_detail: "Carregada manualmente do Segsale",
        raw_usage_types: rawUsage,
        vehicle_count: plates.length,
        plates,
        log_ids: [],
      });
    } catch (err) {
      results.push({
        sale_summary_id: id,
        company_name: null,
        last_event_at: new Date().toISOString(),
        reason: "other",
        reason_detail: err instanceof Error ? err.message : String(err),
        raw_usage_types: [],
        vehicle_count: 0,
        plates: [],
        log_ids: [],
      });
    }
  }
  return results;
}
