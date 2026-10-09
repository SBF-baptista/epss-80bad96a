import { ReactNode, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, ClipboardCheck, Minus, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  const [dirty, setDirty] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNotes(order?.countingNotes ?? "");
      setActiveCategory("Equipamentos");
      setDirty(false);
      setConfirmExit(false);
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
  const verificationReady = !!order.countingCompletedAt && registeredIdentifiers > 0;
  const canAdvance = isVerification ? (variant === "production" ? verificationReady : true) : itemsValid;
  const doneCount = expectedItems.filter((item) => checked[item.key] && quantities[item.key] === item.quantity).length;
  const missing = expectedItems.length - doneCount;
  const progressPct = expectedItems.length ? Math.round((doneCount / expectedItems.length) * 100) : 0;
  const setQty = (key: string, expected: number, value: number) => {
    const next = Math.max(0, value);
    setQuantities((c) => ({ ...c, [key]: next }));
    setChecked((c) => ({ ...c, [key]: next === expected }));
    setDirty(true);
  };

  const handleSave = async (advance: boolean) => {
    setIsLoading(true);
    try {
      if (!isVerification) await saveProductionChecks(order.id, stage, expectedItems, quantities, checked);
      if (stage === "counting") {
        const { data: authData } = await supabase.auth.getUser();
        const u = authData.user;
        const patch: Record<string, unknown> = { counting_notes: notes.trim() || null };
        if (!advance && u) {
          patch.counting_in_progress_by_email = u.email ?? null;
          patch.counting_in_progress_at = new Date().toISOString();
        }
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
      setDirty(false);
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error saving production check:", error);
      toast({ title: "Erro", description: "Não foi possível salvar a conferência.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const title = stage === "counting" ? "Contagem do kit" : variant === "expedition" ? "Conferência de expedição" : variant === "summary" ? "Resumo do envio" : "Verificação final";

  return (
    <>
    <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Você está saindo sem salvar o andamento</AlertDialogTitle>
          <AlertDialogDescription>Se sair agora, a contagem feita desde o último salvamento será perdida. Deseja sair mesmo assim?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continuar contagem</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setConfirmExit(false); setDirty(false); onClose(); }}>Sair sem salvar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <Dialog open={isOpen} onOpenChange={(open) => { if (open) return; if (stage === "counting" && !isLoading) setConfirmExit(true); else onClose(); }}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-4 py-3 sm:px-6 text-left">
          <DialogTitle className="flex items-center gap-2 text-base font-medium"><ClipboardCheck className="h-5 w-5 text-primary" />{title}</DialogTitle>
          <DialogDescription>{order.company_name} · <span className="font-mono">{order.plate || `Pedido ${order.number}`}</span></DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border bg-muted/40 p-3">
            <div className="min-w-0 text-xs text-muted-foreground space-y-0.5">
              <p className="text-sm font-medium text-foreground">{order.company_name}</p>
              {order.customer_document_number && <p>CNPJ/CPF: {order.customer_document_number}</p>}
              {order.customer_phone && <p>Telefone: {order.customer_phone}</p>}
            </div>
            <Badge variant="secondary" className="shrink-0">{order.configurationType !== "N/A" ? order.configurationType : order.configuration || "Sem configuração"}</Badge>
          </div>

          {expectedItems.length > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso geral</span>
                <span>{doneCount}/{expectedItems.length} itens conferidos</span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>
          )}

          {isVerification && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                <p className="text-sm font-medium text-foreground">Contagem</p>
                <p>Responsável: <span className="text-foreground break-all">{order.countingCompletedByEmail || "Não informado"}</span></p>
                {order.countingCompletedAt && <p>Concluída em {new Date(order.countingCompletedAt).toLocaleString("pt-BR")}</p>}
                {order.countingNotes && <p>Observação: <span className="text-foreground">{order.countingNotes}</span></p>}
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Em produção</p>
                  <Badge variant={identifiersValid ? "secondary" : "destructive"}>{registeredIdentifiers} IMEI/serial</Badge>
                </div>
                {producedItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum rastreador registrado na produção.</p>
                ) : (
                  <ul className="max-h-40 space-y-1 overflow-y-auto">
                    {producedItems.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 rounded border border-border bg-card px-2 py-1 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                        <span className="font-mono text-foreground break-all">{item.imei}{item.serial_number ? ` · ${item.serial_number}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {extraContent}

          {isLoading && expectedItems.length > 0 && Object.keys(quantities).length === 0 && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {expectedItems.length === 0 && <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">Este pedido não possui itens cadastrados no kit.</p>}

          {expectedItems.length > 0 && (
            <Tabs value={activeTab} onValueChange={setActiveCategory}>
              <TabsList className="grid h-auto w-full auto-cols-fr grid-flow-col gap-1 bg-muted p-1">
                {checkCategories.map((category) => {
                  const items = expectedItems.filter((item) => item.category === category);
                  const done = items.filter((item) => checked[item.key] && quantities[item.key] === item.quantity).length;
                  const complete = done === items.length;
                  return (
                    <TabsTrigger key={category} value={category} className="min-h-9 gap-1.5 px-2 text-xs">
                      <span className="truncate">{category}</span>
                      <span className={cn("rounded-full px-1.5 text-[10px]", complete ? "bg-success/15 text-success" : "bg-background text-muted-foreground")}>{done}/{items.length}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {checkCategories.map((category) => (
                <TabsContent key={category} value={category} className="mt-3 space-y-2">
                  {expectedItems.filter((item) => item.category === category).map((item) => {
                    const value = quantities[item.key] ?? 0;
                    const ok = checked[item.key] && value === item.quantity;
                    return (
                      <div key={item.key} className={cn("flex items-center gap-3 rounded-md border p-2.5 transition-colors", ok ? "border-success-border bg-success-light" : "border-border bg-card")}>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground break-words">{cleanItemName(item.name)}</p>
                          <p className="text-xs text-muted-foreground">Previsto: {item.quantity}</p>
                        </div>
                        {isVerification ? (
                          <span className="font-mono text-sm text-foreground">{value}</span>
                        ) : (
                          <div className="flex items-center rounded-md border border-border bg-background">
                            <Button type="button" variant="ghost" size="icon" className="h-11 w-11" aria-label={`Diminuir ${item.name}`} onClick={() => setQty(item.key, item.quantity, value - 1)}><Minus className="h-4 w-4" /></Button>
                            <input
                              inputMode="numeric"
                              aria-label={`Quantidade conferida de ${item.name}`}
                              value={value}
                              onChange={(e) => setQty(item.key, item.quantity, Number(e.target.value.replace(/\D/g, "")) || 0)}
                              className="h-11 w-10 bg-transparent text-center font-mono text-sm outline-none"
                            />
                            <Button type="button" variant="ghost" size="icon" className="h-11 w-11" aria-label={`Aumentar ${item.name}`} onClick={() => setQty(item.key, item.quantity, value + 1)}><Plus className="h-4 w-4" /></Button>
                          </div>
                        )}
                        <span className="w-5 shrink-0">{ok ? <CheckCircle2 className="h-5 w-5 text-success" aria-label="Conferido" /> : <Circle className="h-5 w-5 text-muted-foreground/40" aria-label="Pendente" />}</span>
                      </div>
                    );
                  })}
                </TabsContent>
              ))}
            </Tabs>
          )}

          {stage === "counting" && (
            <div className="space-y-1">
              <label htmlFor="counting-notes" className="text-sm text-foreground">Observação da contagem</label>
              <Textarea id="counting-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional: anote algo sobre a contagem" rows={3} />
            </div>
          )}
        </div>

        {variant !== "summary" || !isVerification ? (
          <div className="flex flex-col-reverse gap-2 border-t border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            {!canAdvance && (
              <p className="text-xs text-muted-foreground sm:mr-auto">
                {stage === "counting" ? `Faltam ${missing} ${missing === 1 ? "item" : "itens"}` : !order.countingCompletedAt ? "Falta concluir a contagem" : "Falta registrar IMEI na produção"}
              </p>
            )}
            {!isVerification && <Button variant="outline" className="min-h-11 sm:min-h-9" onClick={() => handleSave(false)} disabled={isLoading}>Salvar andamento</Button>}
            {variant !== "summary" && (
              <Button className="min-h-11 sm:min-h-9" onClick={() => handleSave(true)} disabled={isLoading || !canAdvance}>
                <CheckCircle2 className="h-4 w-4" />
                {stage === "counting" ? "Liberar para produção" : variant === "expedition" ? "Liberar para preparação" : "Liberar para expedição"}
              </Button>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default ProductionCheckModal;