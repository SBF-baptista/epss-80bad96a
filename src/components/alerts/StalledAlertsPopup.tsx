import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, CalendarCheck, FileText, Package } from "lucide-react";
import { useStalledAlerts } from "@/hooks/useStalledAlerts";
import { MOCK_STALLED_ALERTS } from "@/services/mockStalledAlerts";
import type { StalledAlert, StalledAlertType } from "@/services/stalledAlertsService";
import { cn } from "@/lib/utils";

interface Props {
  storageKey: string;
}

const LIMITS: Record<StalledAlertType, number> = {
  planning: 2,
  production: 3,
  scheduling: 3,
};

const STAGES: Record<
  StalledAlertType,
  { icon: React.ComponentType<{ className?: string }>; label: string; tag: string }
> = {
  planning: {
    icon: FileText,
    label: "Planejamento",
    tag: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  },
  production: {
    icon: Package,
    label: "Em Produção (Logística)",
    tag: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
  },
  scheduling: {
    icon: CalendarCheck,
    label: "Agendamento",
    tag: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  },
};


const getOverdue = (a: StalledAlert) => a.daysStalled - LIMITS[a.type];

export const StalledAlertsPopup = ({ storageKey: _sk }: Props) => {
  const navigate = useNavigate();
  const { data: realAlerts = [], isLoading } = useStalledAlerts();
  const alerts = useMemo(() => [...MOCK_STALLED_ALERTS, ...realAlerts], [realAlerts]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!alerts.length) return;
    setOpen(true);
  }, [isLoading, alerts.length]);

  const sorted = useMemo(
    () => [...alerts].sort((a, b) => getOverdue(b) - getOverdue(a)),
    [alerts],
  );

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

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {sorted.length === 0 ? (
            <div className="text-sm text-slate-500 py-8 text-center">
              Nenhum item parado no momento.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md overflow-hidden bg-white">
              {sorted.map((a) => {
                const stage = STAGES[a.type];
                const Icon = stage.icon;
                const overdue = getOverdue(a);
                return (
                  <li key={a.id} className="flex items-center gap-3 px-3 py-4">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-50 text-slate-500 ring-1 ring-slate-200 shrink-0">
                      <Icon className="h-[22px] w-[22px]" />
                    </span>
                    <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                      <div className="text-[16px] font-semibold text-slate-900 leading-tight truncate">
                        {a.customerName}
                      </div>
                      <div>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium",
                            stage.tag,
                          )}
                        >
                          {stage.label}
                        </span>
                      </div>
                      {a.plate && (
                        <div className="text-[13px] text-slate-600 truncate">
                          {/^placa/i.test(a.plate) ? a.plate : `Placa ${a.plate}`}
                        </div>
                      )}
                      <div className="text-[12px] text-slate-400">
                        parado há {a.daysStalled}d
                      </div>
                    </div>

                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold shrink-0",
                        "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
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
          )}
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
