import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useStalledAlerts } from "@/hooks/useStalledAlerts";
import type { StalledAlertType } from "@/services/stalledAlertsService";

const STAGE_LABELS: Record<StalledAlertType, string> = {
  planning: "Planejamento",
  production: "Em Produção (Logística)",
  scheduling: "Agendamento",
};

export const StalledAlertsBanner = () => {
  const { data: realAlerts = [] } = useStalledAlerts();
  const alerts = realAlerts;

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

  const handleOpen = () => {
    window.dispatchEvent(new CustomEvent("open-stalled-alerts-popup"));
  };

  const hasCritical = alerts.some((a) => a.daysStalled >= 7);

  return (
    <Alert
      variant="destructive"
      className={`border-destructive/40 ${hasCritical ? "banner-critico" : ""}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 w-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-[clamp(1.25rem,4vw,1.625rem)] font-semibold leading-none text-destructive">
              {alerts.length}
            </span>
            <span className="text-fluid-body font-medium">
              {isSingular ? "item parado" : "itens parados"}
            </span>
          </div>
          {sentence && (
            <AlertDescription className="mt-1 text-fluid-body">{sentence}</AlertDescription>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleOpen}
          className="w-full sm:w-auto shrink-0"
        >
          Ver detalhes
        </Button>
      </div>
    </Alert>
  );
};
