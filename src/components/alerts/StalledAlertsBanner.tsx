import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useStalledAlerts } from "@/hooks/useStalledAlerts";
import { StalledAlertsList } from "./StalledAlertsList";
import { MOCK_STALLED_ALERTS } from "@/services/mockStalledAlerts";
import type { StalledAlertType } from "@/services/stalledAlertsService";

const STAGE_LABELS: Record<StalledAlertType, string> = {
  planning: "Planejamento",
  production: "Em Produção (Logística)",
  scheduling: "Agendamento",
};

export const StalledAlertsBanner = () => {
  const { data: realAlerts = [] } = useStalledAlerts();
  const alerts = [...MOCK_STALLED_ALERTS, ...realAlerts];
  const [open, setOpen] = useState(false);

  if (!alerts.length) return null;

  const present = (Object.keys(STAGE_LABELS) as StalledAlertType[]).filter((t) =>
    alerts.some((a) => a.type === t),
  );
  const labels = present.map((t) => STAGE_LABELS[t]);
  let joined = "";
  if (labels.length === 1) joined = labels[0];
  else if (labels.length === 2) joined = `${labels[0]} e ${labels[1]}`;
  else if (labels.length >= 3)
    joined = `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`;
  const prefix = labels.length === 1 ? "na etapa de" : "nas etapas de";
  const sentence = labels.length
    ? `Existem veículos parados fora do prazo estabelecido ${prefix} ${joined}.`
    : "";

  const isSingular = alerts.length === 1;

  return (
    <Alert variant="destructive" className="border-destructive/40">
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-[26px] font-semibold leading-none text-destructive">
              {alerts.length}
            </span>
            <span className="text-[14px] font-medium">
              {isSingular ? "item parado" : "itens parados"}
            </span>
          </div>
          {sentence && (
            <AlertDescription className="mt-1">{sentence}</AlertDescription>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)} className="shrink-0">
          {open ? <>Ocultar <ChevronUp className="h-3 w-3 ml-1" /></> : <>Ver detalhes <ChevronDown className="h-3 w-3 ml-1" /></>}
        </Button>
      </div>
      {open && (
        <div className="mt-3">
          <StalledAlertsList alerts={alerts} compact />
        </div>
      )}
    </Alert>
  );
};
