import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, PlusCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Sistema = "frota" | "auto";

interface CreateResult {
  ok: boolean;
  sistema?: Sistema;
  itemId?: number;
  itemName?: string;
  placa?: string;
  imei?: string;
  step?: string;
  rollbackApplied?: boolean;
  error?: string;
  response?: unknown;
}

const WialonCreateUnitCard = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [sistema, setSistema] = useState<Sistema | "">("");
  const [placa, setPlaca] = useState("");
  const [imei, setImei] = useState("");
  const [passwd, setPasswd] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState<CreateResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("wialon-create-unit", {
        body: {
          sistema,
          placa: placa.trim().toUpperCase(),
          imei: imei.trim(),
          passwd,
          notes: notes.trim() || undefined,
        },
      });
      if (error) throw error;
      return data as CreateResult;
    },
    onSuccess: (data) => {
      setLastResult(data);
      qc.invalidateQueries({ queryKey: ["frota-unit-activation-audit"] });
      if (data.ok) {
        toast({
          title: "Unidade criada e ativada",
          description: `${data.itemName} (id ${data.itemId}) — IMEI ${data.imei}`,
        });
        setPlaca("");
        setImei("");
        setPasswd("");
        setNotes("");
      } else {
        toast({
          title: data.itemId ? "Falha parcial — revisão manual necessária" : "Falha ao criar unidade",
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
    if (!placa.trim()) {
      toast({ title: "Informe a placa", variant: "destructive" });
      return;
    }
    if (!imei.trim()) {
      toast({ title: "Informe o IMEI", variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Criar nova unidade (NT20)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Cria a unidade <b>direto no Wialon</b> do sistema escolhido, já com o IMEI
            vinculado e ativa. Placa e IMEI são obrigatórios — não criamos unidade
            "vazia" por aqui.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Sistema *</label>
            <Select value={sistema} onValueChange={(v) => setSistema(v as Sistema)}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="frota">Frota</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Placa *</label>
            <Input
              placeholder="ex.: ABC1D23"
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase().trim())}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">IMEI *</label>
            <Input
              placeholder="ex.: 860123456789012"
              value={imei}
              onChange={(e) => setImei(e.target.value.trim())}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Senha do device (opcional)</label>
            <Input
              placeholder="deixe vazio para NT20"
              value={passwd}
              onChange={(e) => setPasswd(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Observação (opcional)</label>
          <Textarea
            placeholder="Motivo / contexto da criação"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={mutation.isPending} className="gap-2">
            {mutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <PlusCircle className="w-4 h-4" />}
            Criar unidade
          </Button>
        </div>

        <Alert>
          <AlertDescription className="text-xs">
            Fluxo: <code>token/login</code> → <code>core/create_unit</code>{" "}
            (name = placa, hwTypeId 400327740) → <code>unit/update_device_type</code>{" "}
            (uniqueId = IMEI) → <code>unit/set_active</code> (active = 1). Se algum passo
            depois da criação falhar, a unidade é desativada como rollback e o caso fica
            registrado na auditoria como <b>falha parcial</b> para revisão manual.
          </AlertDescription>
        </Alert>

        {lastResult != null && (
          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
            {JSON.stringify(lastResult, null, 2)}
          </pre>
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Criar unidade no sistema {sistema.toUpperCase()}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Será criada a unidade <b>{placa.toUpperCase()}</b> com IMEI{" "}
              <code>{imei}</code> no Wialon do sistema <b>{sistema.toUpperCase()}</b>,
              já ativa. Confira o sistema com atenção — Frota e Auto são contas
              diferentes. A ação fica registrada em auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => mutation.mutate()}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default WialonCreateUnitCard;
