import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useStalledAlerts } from "@/hooks/useStalledAlerts";
import { StalledAlertsList } from "./StalledAlertsList";
import { MOCK_STALLED_ALERTS } from "@/services/mockStalledAlerts";

export const StalledAlertsBanner = () => {
  const { data: realAlerts = [] } = useStalledAlerts();
  const alerts = [...MOCK_STALLED_ALERTS, ...realAlerts];
  const [open, setOpen] = useState(false);

  if (!alerts.length) return null;

  return (
    <Alert variant="destructive" className="border-destructive/40">
      <AlertTriangle className="h-4 w-4" />
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="flex-1">
          <AlertTitle className="flex items-center gap-2">
            {alerts.length} {alerts.length === 1 ? "item parado" : "itens parados"} no processo
          </AlertTitle>
          <AlertDescription>
            Existem veículos/clientes parados além do prazo esperado em Planejamento (&gt;2d),
            Em Produção (&gt;3d) ou Agendamento (&gt;3d).
          </AlertDescription>
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
