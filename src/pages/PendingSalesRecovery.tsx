import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchPendingSaleGroups,
  fetchSaleGroupsByIds,
  searchPlatesInWialon,
  recoverPendingSale,
  type PendingSaleGroup,
  type WialonSearchResult,
  type RecoverResult,
} from "@/services/pendingSalesRecoveryService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, ChevronRight, RefreshCw, ShieldAlert, CheckCircle2, XCircle, Loader2, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type WialonMap = Record<string, WialonSearchResult>;

interface PendingAction {
  action: "send_to_kickoff" | "create_unit_now";
  group: PendingSaleGroup;
  plates: string[];
}

export default function PendingSalesRecovery() {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<Record<number, Set<string>>>({});
  const [wialonBySale, setWialonBySale] = useState<Record<number, WialonMap>>({});
  const [checking, setChecking] = useState<Record<number, boolean>>({});
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [justification, setJustification] = useState("");
  const [tipoContrato, setTipoContrato] = useState<"MENSALISTA" | "TELEMETRIA">("MENSALISTA");
  const [running, setRunning] = useState(false);
  const [lastResults, setLastResults] = useState<{ saleId: number; results: RecoverResult[] } | null>(null);

  const { data: groups = [], isLoading, refetch } = useQuery({
    queryKey: ["pending-sales-recovery"],
    queryFn: fetchPendingSaleGroups,
  });

  const toggleExpand = async (saleId: number, plates: string[]) => {
    const opening = !expanded[saleId];
    setExpanded(prev => ({ ...prev, [saleId]: opening }));
    if (opening && !wialonBySale[saleId]) {
      await runWialonCheck(saleId, plates);
    }
  };

  const runWialonCheck = async (saleId: number, plates: string[]) => {
    if (plates.length === 0) return;
    setChecking(prev => ({ ...prev, [saleId]: true }));
    try {
      const results = await searchPlatesInWialon(plates);
      setWialonBySale(prev => ({ ...prev, [saleId]: results }));
    } catch (err) {
      toast({
        title: "Falha ao checar Wialon",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setChecking(prev => ({ ...prev, [saleId]: false }));
    }
  };

  const plateStatus = (saleId: number, plate: string) => {
    const w = wialonBySale[saleId]?.[plate];
    if (!w) return { exists: false, system: null as null | "frota" | "auto", checked: false };
    if (w.frota?.exists) return { exists: true, system: "frota" as const, checked: true };
    if (w.auto?.exists) return { exists: true, system: "auto" as const, checked: true };
    return { exists: false, system: null, checked: true };
  };

  const togglePlate = (saleId: number, plate: string) => {
    setSelected(prev => {
      const s = new Set(prev[saleId] ?? []);
      if (s.has(plate)) s.delete(plate);
      else s.add(plate);
      return { ...prev, [saleId]: s };
    });
  };

  const openConfirm = (action: PendingAction["action"], group: PendingSaleGroup) => {
    const sel = Array.from(selected[group.sale_summary_id] ?? []);
    const eligible = sel.filter(p => !plateStatus(group.sale_summary_id, p).exists);
    if (eligible.length === 0) {
      toast({
        title: "Nenhuma placa elegível",
        description: "Selecione ao menos uma placa que ainda NÃO tem unidade criada.",
        variant: "destructive",
      });
      return;
    }
    setPendingAction({ action, group, plates: eligible });
    setJustification("");
    setTipoContrato("MENSALISTA");
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    if (justification.trim().length < 10) {
      toast({ title: "Justificativa obrigatória", description: "Informe ao menos 10 caracteres.", variant: "destructive" });
      return;
    }
    setRunning(true);
    try {
      const res = await recoverPendingSale({
        action: pendingAction.action,
        sale_summary_id: pendingAction.group.sale_summary_id,
        plates: pendingAction.plates,
        justification: justification.trim(),
        tipo_contrato_hint: pendingAction.action === "create_unit_now" ? tipoContrato : undefined,
      });
      setLastResults({ saleId: pendingAction.group.sale_summary_id, results: res.results });
      const success = res.results.filter(r => r.status === "success").length;
      const blocked = res.results.filter(r => r.status === "blocked_already_exists").length;
      const failed = res.results.filter(r => r.status === "error").length;
      toast({
        title: res.ok ? "Ação processada" : "Falha na ação",
        description: `Sucesso: ${success} · Bloqueadas: ${blocked} · Erros: ${failed}`,
        variant: failed > 0 ? "destructive" : "default",
      });
      // limpa seleção e re-checa Wialon
      setSelected(prev => ({ ...prev, [pendingAction.group.sale_summary_id]: new Set() }));
      await runWialonCheck(pendingAction.group.sale_summary_id, pendingAction.group.plates.map(p => p.plate));
      await refetch();
      setPendingAction(null);
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const reasonBadge = (r: PendingSaleGroup["reason"]) => {
    switch (r) {
      case "unmapped_usage_type":
        return <Badge variant="destructive">usage_type inválido</Badge>;
      case "receive_vehicle_failed":
        return <Badge variant="destructive">receive-vehicle 4xx</Badge>;
      default:
        return <Badge variant="secondary">outro</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6" /> Diagnóstico de Vendas Pendentes
          </h1>
          <p className="text-sm text-muted-foreground">
            Ferramenta técnica (admin) para recuperar vendas do Segsale presas por <code>usage_type</code> inválido ou falha 4xx no <code>receive-vehicle</code>.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Recarregar
        </Button>
      </div>

      <Alert>
        <AlertTitle>Como funciona</AlertTitle>
        <AlertDescription className="text-sm">
          Expanda uma venda para ver as placas. A checagem no Wialon é <strong>somente-leitura</strong>: não cria nem altera unidades.
          Placas em verde já têm unidade e ficam bloqueadas para qualquer ação. Para as que faltam, você pode
          reenviar ao Kickoff (fluxo normal) ou criar a unidade agora e cadastrá-la como pendente de IMEI.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendas presas ({groups.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Carregando…</div>
          ) : groups.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma venda pendente encontrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Sale</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Veíc.</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>usage_type bruto</TableHead>
                    <TableHead>Último evento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map(g => {
                    const isOpen = expanded[g.sale_summary_id];
                    const sel = selected[g.sale_summary_id] ?? new Set<string>();
                    return (
                      <>
                        <TableRow key={`row-${g.sale_summary_id}`} className="cursor-pointer" onClick={() => toggleExpand(g.sale_summary_id, g.plates.map(p => p.plate))}>
                          <TableCell>{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</TableCell>
                          <TableCell className="font-mono">{g.sale_summary_id}</TableCell>
                          <TableCell className="max-w-[280px] truncate" title={g.company_name ?? ""}>{g.company_name ?? "—"}</TableCell>
                          <TableCell>{g.vehicle_count}</TableCell>
                          <TableCell>{reasonBadge(g.reason)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {g.raw_usage_types.join(", ") || "—"}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {new Date(g.last_event_at).toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); runWialonCheck(g.sale_summary_id, g.plates.map(p => p.plate)); }}
                              disabled={!!checking[g.sale_summary_id]}
                            >
                              {checking[g.sale_summary_id]
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Search className="w-4 h-4" />}
                              <span className="ml-1 hidden md:inline">Rechecar</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isOpen && (
                          <TableRow key={`exp-${g.sale_summary_id}`}>
                            <TableCell colSpan={8} className="bg-muted/30">
                              <div className="p-2 space-y-3">
                                {g.plates.length === 0 ? (
                                  <div className="text-xs text-muted-foreground">
                                    Nenhuma placa individual foi registrada no log dessa venda.
                                    O reenvio para Kickoff ainda funciona por sale_summary_id.
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="w-10"></TableHead>
                                          <TableHead>Placa</TableHead>
                                          <TableHead>Status Wialon</TableHead>
                                          <TableHead>usage_type bruto</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {g.plates.map(p => {
                                          const st = plateStatus(g.sale_summary_id, p.plate);
                                          const disabled = st.exists;
                                          const checked = sel.has(p.plate);
                                          return (
                                            <TableRow key={p.plate}>
                                              <TableCell>
                                                <Checkbox
                                                  checked={checked}
                                                  disabled={disabled}
                                                  onCheckedChange={() => togglePlate(g.sale_summary_id, p.plate)}
                                                />
                                              </TableCell>
                                              <TableCell className="font-mono">{p.plate}</TableCell>
                                              <TableCell>
                                                {!st.checked ? (
                                                  <Badge variant="outline">não verificado</Badge>
                                                ) : st.exists ? (
                                                  <Badge className="bg-green-600 hover:bg-green-600 text-white">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" /> já criada — {st.system}
                                                  </Badge>
                                                ) : (
                                                  <Badge variant="destructive">
                                                    <XCircle className="w-3 h-3 mr-1" /> não criada
                                                  </Badge>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-xs">{p.raw_usage_type ?? "—"}</TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => openConfirm("send_to_kickoff", g)}
                                    disabled={sel.size === 0}
                                  >
                                    Enviar selecionadas para Kickoff
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => openConfirm("create_unit_now", g)}
                                    disabled={sel.size === 0}
                                  >
                                    Criar Unidade Agora
                                  </Button>
                                </div>

                                {lastResults?.saleId === g.sale_summary_id && (
                                  <div className="border rounded p-2 text-xs space-y-1 bg-background">
                                    <div className="font-medium">Resultado da última ação:</div>
                                    {lastResults.results.map((r, i) => (
                                      <div key={i} className="flex items-center gap-2">
                                        {r.status === "success" && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                                        {r.status === "error" && <XCircle className="w-3 h-3 text-destructive" />}
                                        {r.status === "blocked_already_exists" && <ShieldAlert className="w-3 h-3 text-amber-600" />}
                                        <span className="font-mono">{r.plate}</span>
                                        <span className="text-muted-foreground">— {r.message ?? r.status}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingAction} onOpenChange={(o) => !o && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.action === "send_to_kickoff"
                ? "Confirmar envio para Kickoff"
                : "Confirmar criação de unidade"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div>
                  Venda <strong>{pendingAction?.group.sale_summary_id}</strong> · {pendingAction?.group.company_name ?? "—"}
                </div>
                <div>
                  Placas selecionadas ({pendingAction?.plates.length ?? 0}):
                  <div className="font-mono text-xs mt-1">{pendingAction?.plates.join(", ")}</div>
                </div>
                {pendingAction?.action === "create_unit_now" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de contrato</Label>
                    <Select value={tipoContrato} onValueChange={(v) => setTipoContrato(v as "MENSALISTA" | "TELEMETRIA")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MENSALISTA">MENSALISTA</SelectItem>
                        <SelectItem value="TELEMETRIA">TELEMETRIA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Justificativa (mín. 10 caracteres)</Label>
                  <Textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Motivo do reenvio manual…"
                    rows={3}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmAction(); }} disabled={running}>
              {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Executando…</> : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
