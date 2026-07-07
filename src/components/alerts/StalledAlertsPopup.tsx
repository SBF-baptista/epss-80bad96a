import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useStalledAlerts } from "@/hooks/useStalledAlerts";
import { StalledAlertsList } from "./StalledAlertsList";

interface Props {
  /** Chave única por página para evitar reabrir na mesma sessão. */
  storageKey: string;
}

export const StalledAlertsPopup = ({ storageKey }: Props) => {
  const { data: alerts = [], isLoading } = useStalledAlerts();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!alerts.length) return;
    const seen = sessionStorage.getItem(storageKey);
    if (seen) return;
    setOpen(true);
    sessionStorage.setItem(storageKey, String(Date.now()));
  }, [isLoading, alerts.length, storageKey]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Atenção: itens parados no processo
          </DialogTitle>
          <DialogDescription>
            Foram identificados {alerts.length} {alerts.length === 1 ? "veículo/cliente parado" : "veículos/clientes parados"} além do prazo esperado.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <StalledAlertsList alerts={alerts} onNavigated={() => setOpen(false)} compact />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
