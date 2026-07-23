import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Power, PowerOff, Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Action = "activate" | "deactivate";
type Tipo = "TELEMETRIA" | "MENSALISTA";

interface AuditRow {
  id: string;
  filial_contrato: string;
  tipo_contrato: string;
  action: Action;
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

  const [filial, setFilial] = useState("");
  const [tipo, setTipo] = useState<Tipo>("MENSALISTA");
  const [action, setAction] = useState<Action>("deactivate");
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
      return (data ?? []) as AuditRow[];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("frota-toggle-unit-status", {
        body: { filialContrato: filial.trim(), tipoContrato: tipo, action, notes: notes.trim() || undefined },
      });
      if (error) throw error;
      return data as { ok: boolean; status?: number; response?: unknown; error?: string };
    },
    onSuccess: (data) => {
      setLastResult(data);
      qc.invalidateQueries({ queryKey: ["frota-unit-activation-audit"] });
      if (data.ok) {
        toast({ title: action === "activate" ? "Unidade ativada" : "Unidade desativada" });
        setNotes("");
      } else {
        toast({
          title: "Falha na operação",
          description: data.error || `HTTP ${data.status}`,
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
    if (!filial.trim()) {
      toast({ title: "Informe filialContrato", variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Ativação de Unidades (Frota)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ferramenta de desenvolvedor. Aciona <code>POST /api/unidade/status</code> na Frota para
          ativar/desativar unidades a nível de conta. Todas as ações ficam auditadas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova operação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">filialContrato</label>
              <Input
                placeholder="ex.: 300-077529"
                value={filial}
                onChange={(e) => setFilial(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">tipoContrato</label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MENSALISTA">MENSALISTA</SelectItem>
                  <SelectItem value="TELEMETRIA">TELEMETRIA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Ação</label>
              <Select value={action} onValueChange={(v) => setAction(v as Action)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activate">Ativar (ativo=true)</SelectItem>
                  <SelectItem value="deactivate">Desativar (ativo=false)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Observação (opcional)</label>
            <Textarea
              placeholder="Motivo / contexto da ação"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
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
              Chama <code>POST https://frota-auto-aityd.ondigitalocean.app/api/unidade/status</code> com
              <code> {"{ filialContrato, ativo, tipoContrato }"}</code>. Confirmação de sucesso exige
              retorno com <code>ativo</code> igual ao solicitado.
            </AlertDescription>
          </Alert>
          {lastResult != null && (
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

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
                  <TableHead>Ação</TableHead>
                  <TableHead>Filial/Contrato</TableHead>
                  <TableHead>Tipo</TableHead>
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
                      {r.action === "activate" ? (
                        <Badge className="bg-green-600 text-white gap-1"><Power className="w-3 h-3" />Ativar</Badge>
                      ) : (
                        <Badge className="bg-orange-600 text-white gap-1"><PowerOff className="w-3 h-3" />Desativar</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{r.filial_contrato}</TableCell>
                    <TableCell className="text-xs">{r.tipo_contrato}</TableCell>
                    <TableCell>
                      {r.api_ok ? (
                        <Badge className="bg-green-600 text-white gap-1"><CheckCircle2 className="w-3 h-3" />OK {r.api_status ?? ""}</Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Falha {r.api_status ?? ""}</Badge>
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
              Confirmar {action === "activate" ? "ativação" : "desativação"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a <b>{action === "activate" ? "ATIVAR" : "DESATIVAR"}</b> a unidade
              com <code>filialContrato={filial}</code> ({tipo}). Essa ação é registrada em auditoria.
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
