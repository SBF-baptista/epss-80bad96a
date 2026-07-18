import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, FastForward, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { KickoffVehicle } from "@/services/kickoffService";

interface BypassKickoffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleSummaryId: number;
  companyName: string;
  vehicles: KickoffVehicle[];
  onSuccess?: () => void;
}

const MIN_JUSTIFICATION = 10;

export const BypassKickoffModal = ({
  open,
  onOpenChange,
  saleSummaryId,
  companyName,
  vehicles,
  onSuccess,
}: BypassKickoffModalProps) => {
  const pendingVehicles = useMemo(
    () => vehicles.filter((v) => !v.kickoff_completed),
    [vehicles],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(pendingVehicles.map((v) => v.id)),
  );
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === pendingVehicles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingVehicles.map((v) => v.id)));
    }
  };

  const reset = () => {
    setSelectedIds(new Set(pendingVehicles.map((v) => v.id)));
    setJustification("");
  };

  const handleClose = (next: boolean) => {
    if (submitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const justificationTrim = justification.trim();
  const canSubmit =
    selectedIds.size > 0 &&
    justificationTrim.length >= MIN_JUSTIFICATION &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "bypass-kickoff-to-scheduling",
        {
          body: {
            incoming_vehicle_ids: Array.from(selectedIds),
            justification: justificationTrim,
            sale_summary_id: saleSummaryId,
            company_name: companyName,
          },
        },
      );

      if (error) throw error;

      const results: any[] = data?.results ?? [];
      const successes = results.filter((r) => r.status === "success").length;
      const errors = results.filter((r) => r.status === "error");

      if (successes > 0) {
        toast.success(
          `Bypass realizado para ${successes} ${
            successes === 1 ? "veículo" : "veículos"
          }. Cliente liberado para Agendamento.`,
        );
      }
      if (errors.length > 0) {
        toast.error(
          `${errors.length} ${errors.length === 1 ? "veículo falhou" : "veículos falharam"}: ${
            errors[0]?.error_message ?? "erro desconhecido"
          }`,
        );
      }

      if (successes > 0) {
        onSuccess?.();
        reset();
        onOpenChange(false);
      }
    } catch (err: any) {
      console.error("[BypassKickoff] error:", err);
      toast.error(err?.message || "Não foi possível executar o bypass");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FastForward className="h-5 w-5 text-amber-600" />
            Pular direto para Agendamento
          </DialogTitle>
          <DialogDescription>
            {companyName} — venda #{saleSummaryId}
          </DialogDescription>
        </DialogHeader>

        <Alert
          variant="default"
          className="border-amber-300 bg-amber-50 dark:bg-amber-950/30"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-900 dark:text-amber-200">
            Esta ação <strong>ignora Homologação, Kits e Planejamento</strong> e
            envia os veículos selecionados direto para Agendamento. É restrita a
            Gestores, exige justificativa e fica registrada em auditoria.
          </AlertDescription>
        </Alert>

        {pendingVehicles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Não há veículos pendentes de kickoff nesta venda.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Veículos ({selectedIds.size}/{pendingVehicles.length})
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                disabled={submitting}
              >
                {selectedIds.size === pendingVehicles.length
                  ? "Desmarcar todos"
                  : "Selecionar todos"}
              </Button>
            </div>
            <ScrollArea className="max-h-56 rounded-md border">
              <div className="divide-y">
                {pendingVehicles.map((v) => {
                  const checked = selectedIds.has(v.id);
                  return (
                    <label
                      key={v.id}
                      className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(v.id)}
                        disabled={submitting}
                        className="mt-0.5"
                      />
                      <div className="flex-1 text-sm">
                        <div className="font-medium">
                          {v.plate || "Sem placa"}{" "}
                          <span className="text-muted-foreground font-normal">
                            · {v.brand} {v.model}
                            {v.year ? ` ${v.year}` : ""}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {v.usage_type}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="bypass-justification" className="text-sm font-medium">
            Justificativa <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="bypass-justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Explique o motivo do bypass (mínimo 10 caracteres)"
            rows={3}
            disabled={submitting}
          />
          <p className="text-xs text-muted-foreground">
            {justificationTrim.length}/{MIN_JUSTIFICATION} caracteres mínimos
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <FastForward className="h-4 w-4 mr-2" />
                Confirmar Bypass
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
