import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Power, PowerOff, Loader2, CheckCircle2, XCircle, RefreshCw, AlertTriangle, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import WialonCreateUnitCard from "@/components/frota/WialonCreateUnitCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Action = "activate" | "deactivate";
type AuditAction = Action | "create" | "create_partial_failure";
type Sistema = "frota" | "auto";

interface AuditRow {
  id: string;
  sistema: Sistema | null;
  placa: string | null;
  wialon_item_id: number | null;
  wialon_item_name: string | null;
  action: AuditAction;
  imei: string | null;
  requested_by_email: string | null;
  api_status: number | null;
  api_ok: boolean;
  api_response: unknown;
  error_message: string | null;
  notes: string | null;
  created_at: string;
}

const FrotaUnitActivation = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Sem default — usuário DEVE escolher explicitamente
  const [sistema, setSistema] = useState<Sistema | "">("");
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<Action>("deactivate");
  const [filialContrato, setFilialContrato] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState<unknown>(null);

  const { data: audit = [], isLoading, refetch } = useQuery({
    queryKey: ["frota-unit-activation-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("frota_unit_activation_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as AuditRow[];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("wialon-toggle-unit", {
        body: {
          sistema,
          action,
          query: query.trim(),
          filialContrato: filialContrato.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });
      if (error) throw error;
      return data as {
        ok: boolean;
        sistema?: Sistema;
        itemId?: number;
        itemName?: string;
        response?: unknown;
        error?: string;
        candidates?: Array<{ id: number; name: string }>;
      };
    },
    onSuccess: (data) => {
      setLastResult(data);
      qc.invalidateQueries({ queryKey: ["frota-unit-activation-audit"] });
      if (data.ok) {
        toast({
          title: action === "activate" ? "Unidade ativada" : "Unidade desativada",
          description: data.itemName ? `${data.itemName} (id ${data.itemId})` : undefined,
        });
        setNotes("");
      } else {
        toast({
          title: "Falha na operação",
          description: data.error || "Erro desconhecido",
          variant: "destructive",
        });
      }
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Erro", description: msg, variant: "destructive" });
    },
  });

  const submit = () => {
    if (!sistema) {
      toast({ title: "Selecione o sistema (Frota ou Auto)", variant: "destructive" });
      return;
    }
    if (!query.trim()) {
      toast({ title: "Informe a placa ou nome da unidade", variant: "destructive" });
      return;
    }
    if (sistema === "frota" && !filialContrato.trim()) {
      toast({ title: "Informe o filialContrato", description: "Campo obrigatório para o sistema Frota.", variant: "destructive" });
      return;
    }
    if (notes.trim().length < 10) {
      toast({
        title: "Justificativa obrigatória",
        description: "Descreva o motivo da ação (mínimo 10 caracteres) para registro de auditoria.",
        variant: "destructive",
      });
      return;
    }
    setConfirmOpen(true);
  };


  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Ativação de Unidades</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ativa ou desativa uma unidade <b>já existente</b> no Wialon (Frota ou Auto).
          Não cria nem exclui unidades — apenas alterna o estado <code>active</code>.
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Escolha o <b>sistema</b> com atenção: Frota e Auto usam tokens (contas)
          diferentes no mesmo Wialon. Uma ação executada no sistema errado afeta a
          conta errada. Não há valor padrão de propósito.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova operação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Sistema *</label>
              <Select value={sistema} onValueChange={(v) => setSistema(v as Sistema)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="frota">Frota</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium">Placa ou nome da unidade *</label>
              <Input
                placeholder="ex.: ABC1D23"
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Ação</label>
              <Select value={action} onValueChange={(v) => setAction(v as Action)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activate">Ativar (active=1)</SelectItem>
                  <SelectItem value="deactivate">Desativar (active=0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {sistema === "frota" && (
            <div className="space-y-1">
              <label className="text-xs font-medium">filialContrato (Frota) *</label>
              <Input
                placeholder="Chave do contrato no Segsale (ex.: 300123568)"
                value={filialContrato}
                onChange={(e) => setFilialContrato(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium">Justificativa *</label>
            <Textarea
              placeholder="Descreva o motivo da ativação/desativação (mínimo 10 caracteres)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
            <p className="text-[11px] text-muted-foreground">
              Obrigatória para auditoria — fica registrada junto com a operação.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={mutation.isPending} className="gap-2">
              {mutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : action === "activate" ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
              {action === "activate" ? "Ativar unidade" : "Desativar unidade"}
            </Button>
          </div>
          <Alert>
            <AlertDescription className="text-xs">
              Fluxo: <code>token/login</code> com o token do sistema escolhido →
              <code> core/search_items</code> para localizar a unidade pelo nome
              (contém a placa) → <code>unit/set_active</code> com <code>itemId</code>
              e <code>active=0|1</code>. Se a busca retornar múltiplas unidades,
              a operação é abortada e as candidatas são listadas na resposta abaixo.
            </AlertDescription>
          </Alert>
          {lastResult != null && (
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <WialonCreateUnitCard />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Auditoria ({audit.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1">
            <RefreshCw className="w-3 h-3" /> Atualizar
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
          ) : audit.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Sem registros ainda.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Sistema</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Placa / Unidade</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-xs">{r.requested_by_email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-xs">
                        {r.sistema ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.action === "activate" ? (
                        <Badge className="bg-green-600 text-white gap-1"><Power className="w-3 h-3" />Ativar</Badge>
                      ) : r.action === "deactivate" ? (
                        <Badge className="bg-orange-600 text-white gap-1"><PowerOff className="w-3 h-3" />Desativar</Badge>
                      ) : r.action === "create" ? (
                        <Badge className="bg-blue-600 text-white gap-1"><PlusCircle className="w-3 h-3" />Criar</Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Criação parcial</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      <div>{r.placa ?? "—"}</div>
                      {r.wialon_item_name && (
                        <div className="text-muted-foreground">
                          {r.wialon_item_name} (id {r.wialon_item_id})
                        </div>
                      )}
                      {r.imei && (
                        <div className="text-muted-foreground">IMEI {r.imei}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.api_ok ? (
                        <Badge className="bg-green-600 text-white gap-1"><CheckCircle2 className="w-3 h-3" />OK</Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Falha</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md">
                      {r.error_message && <div className="text-xs text-destructive mb-1">{r.error_message}</div>}
                      {r.notes && <div className="text-xs text-muted-foreground mb-1">{r.notes}</div>}
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">Resposta</summary>
                        <pre className="mt-1 bg-muted p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(r.api_response, null, 2)}
                        </pre>
                      </details>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar {action === "activate" ? "ativação" : "desativação"} no sistema {sistema.toUpperCase()}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você vai <b>{action === "activate" ? "ATIVAR" : "DESATIVAR"}</b> a unidade
              com busca <code>{query}</code> no Wialon do sistema
              <b> {sistema.toUpperCase()}</b>. Se houver mais de uma unidade correspondente,
              a operação será abortada. A ação fica registrada em auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => mutation.mutate()}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FrotaUnitActivation;
