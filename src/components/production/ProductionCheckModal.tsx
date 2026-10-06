import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/services/orderService";
import { ExpectedProductionItem, loadProductionChecks, ProductionCheckStage, saveProductionChecks, updateProductionStage } from "@/services/productionCheckService";
import { getProductionItemsByScheduleId } from "@/hooks/useProductionItems";
import { cleanItemName } from "@/utils/itemNormalization";

interface ProductionCheckModalProps {
  order: Order | null;
  stage: ProductionCheckStage;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const ProductionCheckModal = ({ order, stage, isOpen, onClose, onUpdate }: ProductionCheckModalProps) => {
  const { toast } = useToast();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [registeredIdentifiers, setRegisteredIdentifiers] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const expectedItems = useMemo<ExpectedProductionItem[]>(() => {
    if (!order) return [];
    const groups = [
      { category: "Equipamentos", items: order.trackers.map((item) => ({ name: item.model, quantity: item.quantity })) },
      { category: "Acessórios", items: order.accessories },
      { category: "Módulos", items: order.modules ?? [] },
      { category: "Insumos", items: order.supplies ?? [] },
    ];
    return groups.flatMap(({ category, items }) => items.map((item, index) => ({
      key: `${category}-${item.name}-${index}`.toLowerCase(),
      category,
      name: item.name,
      quantity: item.quantity,
    })));
  }, [order]);

  useEffect(() => {
    if (!isOpen || !order) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const [saved, identifiers] = await Promise.all([
          loadProductionChecks(order.id, stage),
          stage === "verification" ? getProductionItemsByScheduleId(order.id) : Promise.resolve([]),
        ]);
        setRegisteredIdentifiers(identifiers.length);
        setQuantities(Object.fromEntries(expectedItems.map((item) => [item.key, saved.find((row) => row.item_key === item.key)?.counted_quantity ?? 0])));
        setChecked(Object.fromEntries(expectedItems.map((item) => [item.key, saved.find((row) => row.item_key === item.key)?.is_checked ?? false])));
      } catch (error) {
        console.error("Error loading production check:", error);
        toast({ title: "Erro", description: "Não foi possível carregar a conferência.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [expectedItems, isOpen, order, stage, toast]);

  if (!order) return null;

  const expectedIdentifiers = order.trackers.reduce((total, item) => total + item.quantity, 0);
  const itemsValid = expectedItems.length > 0 && expectedItems.every((item) => checked[item.key] && quantities[item.key] === item.quantity);
  const identifiersValid = stage === "counting" || registeredIdentifiers >= expectedIdentifiers;
  const canAdvance = itemsValid && identifiersValid;

  const handleSave = async (advance: boolean) => {
    setIsLoading(true);
    try {
      await saveProductionChecks(order.id, stage, expectedItems, quantities, checked);
      if (advance) {
        if (!canAdvance) return;
        await updateProductionStage(order.id, stage === "counting" ? "in_progress" : "completed");
      }
      toast({
        title: advance ? "Conferência concluída" : "Conferência salva",
        description: advance
          ? stage === "counting" ? "Pedido liberado para produção." : "Pedido liberado para expedição."
          : "O andamento foi salvo.",
      });
      onUpdate();
      if (advance) onClose();
    } catch (error) {
      console.error("Error saving production check:", error);
      toast({ title: "Erro", description: "Não foi possível salvar a conferência.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" />{stage === "counting" ? "Contagem do kit" : "Verificação final"}</DialogTitle>
          <DialogDescription>{order.company_name} · {order.plate || `Pedido ${order.number}`}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Consolidated summary: client info, product type and totals */}
          <div className="rounded-md border border-border bg-muted/40 p-3 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{order.company_name}</p>
                <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                  {order.customer_document_number && <p>CNPJ/CPF: {order.customer_document_number}</p>}
                  {order.customer_phone && <p>Telefone: {order.customer_phone}</p>}
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0">{order.configurationType !== "N/A" ? order.configurationType : order.configuration || "Sem configuração"}</Badge>
            </div>
            {(order.plate || order.vehicles.length > 0) && (
              <p className="text-xs text-muted-foreground">
                {order.vehicles.map((v) => `${v.brand} ${v.model}${v.year ? ` ${v.year}` : ""}`).join(", ")}
                {order.plate ? ` · Placa ${order.plate}` : ""}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Equipamentos", total: order.trackers.reduce((sum, item) => sum + item.quantity, 0) },
                { label: "Acessórios", total: order.accessories.reduce((sum, item) => sum + item.quantity, 0) },
                { label: "Módulos", total: (order.modules ?? []).reduce((sum, item) => sum + item.quantity, 0) },
                { label: "Insumos", total: (order.supplies ?? []).reduce((sum, item) => sum + item.quantity, 0) },
              ].map(({ label, total }) => (
                <div key={label} className="rounded-md border border-border bg-card p-2 text-center">
                  <p className="text-lg font-bold text-foreground">{total}</p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(["Equipamentos", "Acessórios", "Módulos", "Insumos"] as const).map((category) => {
                const items = expectedItems.filter((item) => item.category === category);
                if (items.length === 0) return null;
                return (
                  <div key={category} className="rounded-md border border-border bg-card p-2">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{category}</p>
                    <ul className="space-y-1">
                      {items.map((item, index) => (
                        <li key={`${item.key}-${index}`} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate text-foreground">{cleanItemName(item.name)}</span>
                          <span className="shrink-0 font-semibold text-foreground">{item.quantity}x</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {stage === "verification" && (
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 p-3">
              <span className="text-sm font-medium">IMEI/serial registrados</span>
              <Badge variant={identifiersValid ? "default" : "destructive"}>{registeredIdentifiers}/{expectedIdentifiers}</Badge>
            </div>
          )}

          {expectedItems.map((item) => {
            const quantityMatches = quantities[item.key] === item.quantity;
            return (
              <div key={item.key} className="grid grid-cols-[1fr_88px_28px] items-center gap-3 rounded-md border border-border p-3">
                <div className="min-w-0">
                  <Badge variant="outline" className="mb-1">{item.category}</Badge>
                  <p className="truncate text-sm font-medium text-foreground">{cleanItemName(item.name)}</p>
                  <p className="text-xs text-muted-foreground">Previsto: {item.quantity}</p>
                </div>
                <Input
                  type="number"
                  min={0}
                  aria-label={`Quantidade conferida de ${item.name}`}
                  value={quantities[item.key] ?? 0}
                  onChange={(event) => setQuantities((current) => ({ ...current, [item.key]: Number(event.target.value) }))}
                  className={quantityMatches ? "border-success" : undefined}
                />
                <Checkbox
                  aria-label={`Confirmar ${item.name}`}
                  checked={checked[item.key] ?? false}
                  disabled={!quantityMatches}
                  onCheckedChange={(value) => setChecked((current) => ({ ...current, [item.key]: value === true }))}
                />
              </div>
            );
          })}

          {expectedItems.length === 0 && <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">Este pedido não possui itens cadastrados no kit.</p>}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={isLoading}>Salvar andamento</Button>
            <Button onClick={() => handleSave(true)} disabled={isLoading || !canAdvance}>
              <CheckCircle2 className="h-4 w-4" />
              {stage === "counting" ? "Liberar para produção" : "Liberar para expedição"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductionCheckModal;