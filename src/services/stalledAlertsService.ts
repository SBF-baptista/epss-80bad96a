import { supabase } from "@/integrations/supabase/client";

export type StalledAlertType = "planning" | "production" | "scheduling";

export interface StalledAlert {
  id: string;
  type: StalledAlertType;
  stageLabel: string;
  customerName: string;
  companyName?: string;
  plate?: string;
  daysStalled: number;
  since: string; // ISO
  link: string;
}

const DAY_MS = 1000 * 60 * 60 * 24;

const diffDays = (from: string | Date) => {
  const d = typeof from === "string" ? new Date(from) : from;
  return Math.floor((Date.now() - d.getTime()) / DAY_MS);
};

/**
 * Planejamento: clientes com show_in_planning=true, sem kit_schedules,
 * parados há > 2 dias (updated_at).
 */
async function getPlanningStalled(): Promise<StalledAlert[]> {
  const cutoff = new Date(Date.now() - 2 * DAY_MS).toISOString();

  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, name, company_name, updated_at, sale_summary_id, vehicles")
    .eq("show_in_planning", true)
    .lt("updated_at", cutoff);

  if (error || !customers) return [];

  // Excluir clientes que já têm kit_schedules (avançaram para agendamento)
  let scheduledCustomerIds = new Set<string>();
  if (customers.length) {
    const { data: ks } = await supabase
      .from("kit_schedules")
      .select("customer_id")
      .in("customer_id", customers.map((c) => c.id));
    (ks ?? []).forEach((r) => {
      if (r.customer_id) scheduledCustomerIds.add(r.customer_id);
    });
  }

  return customers
    .filter((c) => !scheduledCustomerIds.has(c.id))
    .map<StalledAlert>((c) => {
      const vehicles = Array.isArray(c.vehicles) ? (c.vehicles as any[]) : [];
      const plate = vehicles[0]?.plate ?? undefined;
      return {
        id: `planning-${c.id}`,
        type: "planning",
        stageLabel: "Planejamento",
        customerName: c.name ?? c.company_name ?? "—",
        companyName: c.company_name ?? undefined,
        plate,
        daysStalled: diffDays(c.updated_at),
        since: c.updated_at,
        link: "/planning",
      };
    });
}

/**
 * Em Produção (Logística): kit_schedules com status='in_progress'
 * parados há > 3 dias (updated_at).
 */
async function getProductionStalled(): Promise<StalledAlert[]> {
  const cutoff = new Date(Date.now() - 3 * DAY_MS).toISOString();
  const { data, error } = await supabase
    .from("kit_schedules")
    .select("id, customer_name, vehicle_plate, updated_at, status")
    .eq("status", "in_progress")
    .lt("updated_at", cutoff);

  if (error || !data) return [];
  return data.map<StalledAlert>((s) => ({
    id: `production-${s.id}`,
    type: "production",
    stageLabel: "Em Produção (Logística)",
    customerName: s.customer_name ?? "—",
    plate: s.vehicle_plate ?? undefined,
    daysStalled: diffDays(s.updated_at),
    since: s.updated_at,
    link: "/kanban",
  }));
}

/**
 * Agendamento: kit_schedules com status='scheduled' cujo scheduled_date
 * passou há > 3 dias sem avançar.
 */
async function getSchedulingStalled(): Promise<StalledAlert[]> {
  const cutoff = new Date(Date.now() - 3 * DAY_MS).toISOString();
  const { data, error } = await supabase
    .from("kit_schedules")
    .select("id, customer_name, vehicle_plate, scheduled_date, status")
    .eq("status", "scheduled")
    .lt("scheduled_date", cutoff);

  if (error || !data) return [];
  return data.map<StalledAlert>((s) => ({
    id: `scheduling-${s.id}`,
    type: "scheduling",
    stageLabel: "Agendamento",
    customerName: s.customer_name ?? "—",
    plate: s.vehicle_plate ?? undefined,
    daysStalled: diffDays(s.scheduled_date),
    since: s.scheduled_date,
    link: "/scheduling",
  }));
}

export async function getStalledAlerts(): Promise<StalledAlert[]> {
  const [planning, production, scheduling] = await Promise.all([
    getPlanningStalled(),
    getProductionStalled(),
    getSchedulingStalled(),
  ]);
  return [...planning, ...production, ...scheduling].sort(
    (a, b) => b.daysStalled - a.daysStalled,
  );
}
