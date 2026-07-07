import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, CalendarClock, ClipboardList, Truck } from "lucide-react";
import { useStalledAlerts } from "@/hooks/useStalledAlerts";
import { MOCK_STALLED_ALERTS } from "@/services/mockStalledAlerts";
import type { StalledAlert, StalledAlertType } from "@/services/stalledAlertsService";
import { cn } from "@/lib/utils";

interface Props {
  storageKey: string;
}

type Severity = "critical" | "attention" | "new";

const LIMITS: Record<StalledAlertType, number> = {
  planning: 2,
  production: 3,
  scheduling: 3,
};

const ICONS: Record<StalledAlertType, React.ComponentType<{ className?: string }>> = {
  planning: ClipboardList,
  production: Truck,
  scheduling: CalendarClock,
};

const SEV_STYLES: Record<Severity, { dot: string; border: string; badge: string; text: string; label: string }> = {
  critical: {
    dot: "bg-red-500",
    border: "border-l-red-500",
    badge: "bg-red-50 text-red-700 ring-1 ring-red-200",
    text: "text-red-700",
    label: "Crítico",
  },
  attention: {
    dot: "bg-amber-500",
    border: "border-l-amber-500",
    badge: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
    text: "text-amber-800",
    label: "Atenção",
  },
  new: {
    dot: "bg-blue-500",
    border: "border-l-blue-500",
    badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    text: "text-blue-700",
    label: "Novo",
  },
};

const CHIPS: Array<{ key: "all" | Severity; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "critical", label: "Crítico" },
  { key: "attention", label: "Atenção" },
  { key: "new", label: "Novo" },
];

const getOverdue = (a: StalledAlert) => a.daysStalled - LIMITS[a.type];
const getSeverity = (a: StalledAlert): Severity => {
  const o = getOverdue(a);
  if (o >= 10) return "critical";
  if (o >= 3) return "attention";
  return "new";
};

export const StalledAlertsPopup = ({ storageKey: _sk }: Props) => {
  const navigate = useNavigate();
  const { data: realAlerts = [], isLoading } = useStalledAlerts();
  const alerts = useMemo(() => [...MOCK_STALLED_ALERTS, ...realAlerts], [realAlerts]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | Severity>("all");

  useEffect(() => {
    if (isLoading) return;
    if (!alerts.length) return;
    setOpen(true);
  }, [isLoading, alerts.length]);

  const grouped = useMemo(() => {
    const g: Record<Severity, StalledAlert[]> = { critical: [], attention: [], new: [] };
    alerts.forEach((a) => g[getSeverity(a)].push(a));
    (Object.keys(g) as Severity[]).forEach((k) =>
      g[k].sort((x, y) => getOverdue(y) - getOverdue(x)),
    );
    return g;
  }, [alerts]);

  const visibleSeverities: Severity[] =
    filter === "all" ? ["critical", "attention", "new"] : [filter];

  const handleNavigate = (link: string) => {
    setOpen(false);
    navigate(link);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl bg-white text-slate-900 border border-slate-200 rounded-xl p-0 gap-0 shadow-sm">
        <DialogHeader className="p-5 pb-3 border-b border-slate-200">
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </span>
            Itens parados no processo
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {alerts.length} {alerts.length === 1 ? "item" : "itens"} além do prazo esperado
          </DialogDescription>
        </DialogHeader>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-slate-200">
          {CHIPS.map((c) => {
            const active = filter === c.key;
            const count =
              c.key === "all"
                ? alerts.length
                : grouped[c.key].length;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setFilter(c.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium border transition-colors",
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
                )}
              >
                {c.key !== "all" && (
                  <span className={cn("h-1.5 w-1.5 rounded-full", SEV_STYLES[c.key as Severity].dot)} />
                )}
                {c.label}
                <span className={cn("text-[10px] font-semibold", active ? "opacity-80" : "text-slate-400")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Lista */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-3 space-y-4">
          {visibleSeverities.every((s) => grouped[s].length === 0) && (
            <div className="text-sm text-slate-500 py-8 text-center">
              Nenhum item nessa categoria.
            </div>
          )}
          {visibleSeverities.map((sev) => {
            const items = grouped[sev];
            if (!items.length) return null;
            const styles = SEV_STYLES[sev];
            return (
              <section key={sev} className="space-y-1.5">
                <header className="flex items-center gap-2 px-0.5">
                  <span className={cn("h-2 w-2 rounded-full", styles.dot)} />
                  <span className={cn("text-xs font-semibold uppercase tracking-wide", styles.text)}>
                    {styles.label}
                  </span>
                  <span className="text-xs text-slate-400">({items.length})</span>
                </header>
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md overflow-hidden bg-white">
                  {items.map((a) => {
                    const Icon = ICONS[a.type];
                    const overdue = getOverdue(a);
                    return (
                      <li
                        key={a.id}
                        className={cn(
                          "flex items-center gap-3 pl-3 pr-2 py-2.5 border-l-[3px]",
                          styles.border,
                        )}
                      >
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-50 text-slate-500 ring-1 ring-slate-200 shrink-0">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {a.customerName}
                          </div>
                          {a.plate && (
                            <div className="text-[11px] text-slate-500 truncate">
                              Placa {a.plate}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {a.stageLabel} · parado há {a.daysStalled}d (limite {LIMITS[a.type]}d)
                          </div>
                        </div>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold shrink-0",
                            styles.badge,
                          )}
                        >
                          +{overdue}d
                        </span>
                        <button
                          type="button"
                          onClick={() => handleNavigate(a.link)}
                          className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-50 shrink-0"
                        >
                          Ver <ArrowRight className="h-3 w-3" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <DialogFooter className="p-4 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
