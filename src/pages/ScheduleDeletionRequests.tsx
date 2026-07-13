import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface Request {
  id: string;
  agendamento_id: string | null;
  veiculo: string | null;
  filial_contrato: string | null;
  tipo_contrato: string | null;
  status: "pendente" | "aprovado" | "rejeitado";
  solicitado_por: string;
  solicitado_em: string;
  decidido_por: string | null;
  decidido_em: string | null;
  motivo: string | null;
  resultado_api: unknown;
  snapshot: any;
}

interface UserInfo {
  id: string;
  email: string | null;
}

const ScheduleDeletionRequests = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Request | null>(null);
  const [action, setAction] = useState<"aprovar" | "rejeitar" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("solicitacoes_exclusao_agendamento")
      .select("*")
      .order("solicitado_em", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar solicitações");
    } else {
      setRequests((data ?? []) as unknown as Request[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    // Buscar emails dos usuários envolvidos
    const ids = new Set<string>();
    requests.forEach((r) => {
      if (r.solicitado_por) ids.add(r.solicitado_por);
      if (r.decidido_por) ids.add(r.decidido_por);
    });
    const missing = Array.from(ids).filter((id) => !(id in users));
    if (missing.length === 0) return;
    (async () => {
      // profiles table indisponível — usa auth via edge? Fallback: exibir uuid curto.
      const map: Record<string, string> = { ...users };
      missing.forEach((id) => (map[id] = id.slice(0, 8)));
      setUsers(map);
    })();
  }, [requests]);

  const pendentes = useMemo(() => requests.filter((r) => r.status === "pendente"), [requests]);
  const decididos = useMemo(() => requests.filter((r) => r.status !== "pendente"), [requests]);

  const openAction = (req: Request, act: "aprovar" | "rejeitar") => {
    setSelected(req);
    setAction(act);
    setMotivo("");
  };

  const closeAction = () => {
    setSelected(null);
    setAction(null);
    setMotivo("");
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!selected || !action) return;
    if (!motivo.trim()) {
      toast.error("Motivo é obrigatório");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("approve-schedule-deletion", {
        body: { requestId: selected.id, decision: action, motivo: motivo.trim() },
      });
      if (error) throw error;
      const resp = data as { ok: boolean; error?: string; status?: string };
      if (!resp?.ok) {
        toast.error(resp?.error || "Falha ao processar solicitação. Tente novamente.");
        setSubmitting(false);
        return;
      }
      toast.success(
        action === "aprovar"
          ? "Solicitação aprovada e agendamento excluído."
          : "Solicitação rejeitada.",
      );
      closeAction();
      await fetchRequests();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Erro inesperado");
      setSubmitting(false);
    }
  };

  const renderRow = (r: Request) => (
    <Card key={r.id} className="mb-3">
      <CardContent className="pt-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-mono">{r.veiculo ?? "Sem placa"}</Badge>
              {r.status === "pendente" && (
                <Badge className="bg-amber-500 hover:bg-amber-500">Pendente</Badge>
              )}
              {r.status === "aprovado" && (
                <Badge className="bg-emerald-600 hover:bg-emerald-600">Aprovado</Badge>
              )}
              {r.status === "rejeitado" && (
                <Badge variant="destructive">Rejeitado</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Cliente:</span>{" "}
              {r.snapshot?.customer ?? "-"}
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Filial/Contrato:</span>{" "}
              {r.filial_contrato ?? "—"} ·{" "}
              <span className="font-medium text-foreground">Tipo:</span>{" "}
              {r.tipo_contrato ?? "—"}
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Solicitado por:</span>{" "}
              {users[r.solicitado_por] ?? r.solicitado_por.slice(0, 8)} ·{" "}
              {format(new Date(r.solicitado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
            {r.status !== "pendente" && (
              <>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Decidido por:</span>{" "}
                  {r.decidido_por ? users[r.decidido_por] ?? r.decidido_por.slice(0, 8) : "—"} ·{" "}
                  {r.decidido_em
                    ? format(new Date(r.decidido_em), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "—"}
                </p>
                {r.motivo && (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Motivo:</span> {r.motivo}
                  </p>
                )}
              </>
            )}
          </div>
          {r.status === "pendente" && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                onClick={() => openAction(r, "aprovar")}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Aprovar exclusão
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => openAction(r, "rejeitar")}
                className="w-full sm:w-auto"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rejeitar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="p-3 sm:p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        <div>
          <h1 className="text-fluid-h1 font-bold tracking-tight">
            Solicitações de agendamento
          </h1>
          <p className="text-fluid-body text-muted-foreground">
            Aprovar ou rejeitar solicitações de exclusão de agendamento.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : (
          <Tabs defaultValue="pendentes">
            <div className="scroll-x-mobile">
              <TabsList className="w-max sm:w-auto">
                <TabsTrigger value="pendentes" className="whitespace-nowrap">
                  Pendentes ({pendentes.length})
                </TabsTrigger>
                <TabsTrigger value="historico" className="whitespace-nowrap">
                  Histórico ({decididos.length})
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="pendentes" className="mt-4">
              {pendentes.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    Nenhuma solicitação pendente.
                  </CardContent>
                </Card>
              ) : (
                pendentes.map(renderRow)
              )}
            </TabsContent>
            <TabsContent value="historico" className="mt-4">
              {decididos.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    Nenhuma solicitação decidida ainda.
                  </CardContent>
                </Card>
              ) : (
                decididos.map(renderRow)
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={!!action} onOpenChange={(o) => !o && closeAction()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "aprovar" ? "Aprovar exclusão" : "Rejeitar solicitação"}
            </DialogTitle>
            <DialogDescription>
              {action === "aprovar"
                ? "Ao aprovar, a unidade será desativada na API externa e o agendamento excluído."
                : "Ao rejeitar, o agendamento voltará ao estado ativo normal."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo *</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo da decisão"
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeAction} disabled={submitting} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !motivo.trim()}
              className={`w-full sm:w-auto ${
                action === "aprovar" ? "bg-emerald-600 hover:bg-emerald-700" : ""
              }`}
              variant={action === "rejeitar" ? "destructive" : "default"}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScheduleDeletionRequests;
