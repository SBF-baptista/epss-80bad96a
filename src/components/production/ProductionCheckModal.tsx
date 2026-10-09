import { ReactNode, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/services/orderService";
import { ExpectedProductionItem, loadProductionChecks, ProductionCheckStage, saveProductionChecks, updateProductionStage } from "@/services/productionCheckService";
import { getProductionItemsByScheduleId } from "@/hooks/useProductionItems";
import type { ProductionItem } from "@/services/productionService";
import { cleanItemName } from "@/utils/itemNormalization";

interface ProductionCheckModalProps {
  order: Order | null;
  stage: ProductionCheckStage;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  /** production: Em Verificação; expedition: Conferência da Expedição; summary: somente leitura (Enviado) */
  variant?: "production" | "expedition" | "summary";
  extraContent?: ReactNode;
}

const ProductionCheckModal = ({ order, stage, isOpen, onClose, onUpdate, variant = "production", extraContent }: ProductionCheckModalProps) => {
  const { toast } = useToast();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [registeredIdentifiers, setRegisteredIdentifiers] = useState(0);
  const [producedItems, setProducedItems] = useState<ProductionItem[]>([]);
  const isVerification = stage === "verification";
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [activeCategory, setActiveCategory] = useState("Equipamentos");

  useEffect(() => {
    if (isOpen) {
      setNotes(order?.countingNotes ?? "");
      setActiveCategory("Equipamentos");
    }
  }, [isOpen, order]);

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

  const checkCategories = useMemo(() => {
    const order = ["Equipamentos", "Acessórios", "Módulos", "Insumos"];
    return order.filter((category) => expectedItems.some((item) => item.category === category));
  }, [expectedItems]);

  const activeTab = checkCategories.includes(activeCategory) ? activeCategory : checkCategories[0];


  useEffect(() => {
    if (!isOpen || !order) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const [saved, identifiers] = await Promise.all([
          loadProductionChecks(order.id, "counting"),
          stage === "verification" ? getProductionItemsByScheduleId(order.id) : Promise.resolve([]),
        ]);
        setRegisteredIdentifiers(identifiers.length);
        setProducedItems(identifiers as ProductionItem[]);
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

  const itemsValid = expectedItems.length > 0 && expectedItems.every((item) => checked[item.key] && quantities[item.key] === item.quantity);
  const identifiersValid = stage === "counting" || registeredIdentifiers > 0;
  const canAdvance = isVerification ? true : itemsValid;

  const handleSave = async (advance: boolean) => {
    setIsLoading(true);
    try {
      if (!isVerification) await saveProductionChecks(order.id, stage, expectedItems, quantities, checked);
      if (stage === "counting") {
        const { data: authData } = await supabase.auth.getUser();
        const u = authData.user;
        const patch: Record<string, unknown> = { counting_notes: notes.trim() || null };
        if (advance && canAdvance && u) {
          patch.counting_completed_by = u.id;
          patch.counting_completed_by_email = u.email ?? null;
          patch.counting_completed_at = new Date().toISOString();
        }
        const { error } = await supabase.from("kit_schedules").update(patch as any).eq("id", order.id);
        if (error) throw error;
      }
      if (advance) {
        if (!canAdvance) return;
        await updateProductionStage(order.id, stage === "counting" ? "in_progress" : variant === "expedition" ? "completed" : "expedition_check");
      }
      toast({
        title: advance ? "Conferência concluída" : "Conferência salva",
        description: advance
          ? stage === "counting" ? "Pedido liberado para produção." : variant === "expedition" ? "Pedido liberado para envio." : "Pedido liberado para expedição."
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
          <DialogTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" />{stage === "counting" ? "Contagem do kit" : variant === "expedition" ? "Conferência de expedição" : variant === "summary" ? "Resumo do envio" : "Verificação final"}</DialogTitle>
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

          {isVerification && (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                <p className="text-sm font-semibold text-foreground">Contagem</p>
                <p>Responsável: <span className="text-foreground">{order.countingCompletedByEmail || "Não informado"}</span>{order.countingCompletedAt && ` · ${new Date(order.countingCompletedAt).toLocaleString("pt-BR")}`}</p>
                {order.countingNotes && <p>Observação: <span className="text-foreground">{order.countingNotes}</span></p>}
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Em produção · IMEI/serial registrados</p>
                  <Badge variant={identifiersValid ? "default" : "destructive"}>{registeredIdentifiers}</Badge>
                </div>
                {producedItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum rastreador registrado na produção.</p>
                ) : (
                  <ul className="max-h-48 space-y-1 overflow-y-auto">
                    {producedItems.map((item, index) => (
                      <li key={item.id} className="flex items-center justify-between gap-2 rounded border border-border bg-card px-2 py-1 text-xs">
                        <span className="font-mono text-foreground">#{index + 1} {item.imei}{item.serial_number ? ` · Serial ${item.serial_number}` : ""}</span>
                        <span className="text-muted-foreground">{new Date(item.scanned_at).toLocaleString("pt-BR")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {extraContent}

          {expectedItems.length === 0 && <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">Este pedido não possui itens cadastrados no kit.</p>}

          {expectedItems.length > 0 && (
            <Tabs value={activeTab} onValueChange={setActiveCategory}>
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1.5 bg-transparent p-0">
                {checkCategories.map((category) => {
                  const items = expectedItems.filter((item) => item.category === category);
                  const done = items.filter((item) => checked[item.key] && quantities[item.key] === item.quantity).length;
                  const complete = done === items.length;
                  return (
                    <TabsTrigger
                      key={category}
                      value={category}
                      className={cn(
                        "gap-2 rounded-md border px-3 py-1.5 text-xs data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none",
                        complete ? "border-success/50 text-success" : "border-border text-muted-foreground"
                      )}
                    >
                      {category}
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", complete ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                        {done}/{items.length}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {checkCategories.map((category) => (
                <TabsContent key={category} value={category} className="mt-3 space-y-2">
                  {expectedItems.filter((item) => item.category === category).map((item) => {
                    const quantityMatches = quantities[item.key] === item.quantity;
                    return (
                      <div key={item.key} className="grid grid-cols-[1fr_88px_28px] items-center gap-3 rounded-md border border-border p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{cleanItemName(item.name)}</p>
                          <p className="text-xs text-muted-foreground">Previsto: {item.quantity}</p>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          aria-label={`Quantidade conferida de ${item.name}`}
                          value={quantities[item.key] ?? 0}
                          readOnly={isVerification}
                          disabled={isVerification}
                          onChange={(event) => setQuantities((current) => ({ ...current, [item.key]: Number(event.target.value) }))}
                          className={quantityMatches ? "border-success" : undefined}
                        />
                        <Checkbox
                          aria-label={`Confirmar ${item.name}`}
                          checked={checked[item.key] ?? false}
                          disabled={isVerification || !quantityMatches}
                          onCheckedChange={(value) => setChecked((current) => ({ ...current, [item.key]: value === true }))}
                        />
                      </div>
                    );
                  })}
                </TabsContent>
              ))}
            </Tabs>
          )}

          {stage === "counting" && (
            <div className="space-y-1">
              <label htmlFor="counting-notes" className="text-sm font-medium text-foreground">Observação da contagem</label>
              <Textarea id="counting-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional: anote algo sobre a contagem" rows={3} />
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {!isVerification && <Button variant="outline" onClick={() => handleSave(false)} disabled={isLoading}>Salvar andamento</Button>}
            {variant !== "summary" && (
              <Button onClick={() => handleSave(true)} disabled={isLoading || !canAdvance}>
                <CheckCircle2 className="h-4 w-4" />
                {stage === "counting" ? "Liberar para produção" : variant === "expedition" ? "Liberar para preparação" : "Liberar para expedição"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductionCheckModal;