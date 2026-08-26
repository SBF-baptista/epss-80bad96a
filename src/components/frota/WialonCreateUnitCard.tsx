import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, PlusCircle, AlertTriangle, Search, Check } from "lucide-react";
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

const HARDWARE_OPTIONS = [
  { value: "NT20", label: "NT20", hwTypeId: 400327740 },
  { value: "SMART5", label: "Ruptela Smart5", hwTypeId: 401681750 },
];

interface WialonAccount {
  id: number;
  name: string;
}

interface CreateResult {
  ok: boolean;
  sistema?: Sistema;
  itemId?: number;
  itemName?: string;
  placa?: string;
  imei?: string | null;
  hardware?: string;
  resourceId?: number;
  pendingImeiId?: string | null;
  step?: string;
  rollbackApplied?: boolean;
  error?: string;
  response?: unknown;
}

const WialonCreateUnitCard = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [sistema, setSistema] = useState<Sistema | "">("");
  const [hardware, setHardware] = useState("NT20");
  const [placa, setPlaca] = useState("");
  const [imei, setImei] = useState("");
  const [passwd, setPasswd] = useState("");
  const [notes, setNotes] = useState("");
  const [accountQuery, setAccountQuery] = useState("");
  const [accounts, setAccounts] = useState<WialonAccount[]>([]);
  const [resourceId, setResourceId] = useState("");
  const [selectedAccountName, setSelectedAccountName] = useState("");
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState<CreateResult | null>(null);
  const [successResult, setSuccessResult] = useState<CreateResult | null>(null);
  const searchSeq = useRef(0);

  const accountName =
    accounts.find((a) => String(a.id) === resourceId)?.name ?? selectedAccountName;

  // Autocomplete: busca no Wialon conforme o usuário digita (debounce 350ms)
  useEffect(() => {
    const q = accountQuery.trim();
    if (!sistema || q.length < 2 || q === selectedAccountName) {
      setSearching(false);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("wialon-create-unit", {
          body: { mode: "search-accounts", sistema, q },
        });
        if (seq !== searchSeq.current) return;
        if (error) throw error;
        const res = data as { ok: boolean; accounts?: WialonAccount[]; error?: string };
        if (!res.ok) {
          toast({ title: "Falha ao buscar contas", description: res.error, variant: "destructive" });
          setAccounts([]);
        } else {
          setAccounts(res.accounts ?? []);
          setShowSuggestions(true);
        }
      } catch (err) {
        if (seq !== searchSeq.current) return;
        toast({
          title: "Erro na busca",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
        setAccounts([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [accountQuery, sistema, selectedAccountName, toast]);

  const selectAccount = (a: WialonAccount) => {
    setResourceId(String(a.id));
    setSelectedAccountName(a.name);
    setAccountQuery(a.name);
    setShowSuggestions(false);
  };


  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("wialon-create-unit", {
        body: {
          sistema,
          placa: placa.trim().toUpperCase(),
          imei: imei.trim(),
          passwd,
          hardware,
          resourceId: Number(resourceId),
          clienteNome: accountName || undefined,
          notes: notes.trim() || undefined,
        },
      });
      if (error) throw error;
      return data as CreateResult;
    },
    onSuccess: (data) => {
      setLastResult(data);
      qc.invalidateQueries({ queryKey: ["frota-unit-activation-audit"] });
      qc.invalidateQueries({ queryKey: ["frota-units-pending-imei"] });
      if (data.ok) {
        toast({
          title: "Unidade criada e ativada",
          description: data.imei
            ? `${data.itemName} (id ${data.itemId}) — IMEI ${data.imei}`
            : `${data.itemName} (id ${data.itemId}) — aguardando IMEI`,
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
    if (!resourceId) {
      toast({ title: "Selecione a conta/cliente", variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Criar nova unidade no Wialon</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Cria a unidade <b>direto no Wialon</b> do sistema escolhido, já dentro da conta do
            cliente e ativa. O IMEI é opcional: sem ele a unidade fica registrada como
            <b> aguardando IMEI</b> para o técnico vincular na instalação.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Sistema *</label>
            <Select value={sistema} onValueChange={(v) => { setSistema(v as Sistema); setAccounts([]); setResourceId(""); setAccountQuery(""); setSelectedAccountName(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="frota">Frota</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Modelo de hardware *</label>
            <Select value={hardware} onValueChange={setHardware}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HARDWARE_OPTIONS.map((h) => (
                  <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                ))}
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
            <label className="text-xs font-medium">IMEI (opcional)</label>
            <Input
              placeholder="deixe vazio se ainda não sabe"
              value={imei}
              onChange={(e) => setImei(e.target.value.trim())}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="space-y-1 md:col-span-2 relative">
            <label className="text-xs font-medium">Conta/cliente *</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-8 pr-8"
                placeholder={sistema ? "digite ao menos 2 letras, ex.: SINARCO" : "selecione o sistema primeiro"}
                disabled={!sistema}
                value={accountQuery}
                onChange={(e) => {
                  setAccountQuery(e.target.value);
                  setResourceId("");
                  setSelectedAccountName("");
                }}
                onFocus={() => { if (accounts.length) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              {searching && (
                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {!searching && resourceId && (
                <Check className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              )}
              {showSuggestions && (
                <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                  {accounts.length === 0 && !searching ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Nenhuma conta encontrada
                    </div>
                  ) : (
                    accounts.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectAccount(a)}
                      >
                        {a.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {resourceId && (
              <p className="text-[11px] text-muted-foreground">
                Selecionado: <b>{accountName}</b> (id {resourceId})
              </p>
            )}
          </div>

          <div className="space-y-1 md:col-span-1">
            <label className="text-xs font-medium">Senha do device (opcional)</label>
            <Input
              placeholder="deixe vazio se não houver"
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
            Fluxo: <code>token/login</code> → localizar o usuário da conta do cliente →{" "}
            <code>core/create_unit</code> (name = placa, hwTypeId do modelo escolhido) →{" "}
            conferir/ajustar a conta (<code>account/change_account</code>) →{" "}
            <code>unit/update_device_type</code> (uniqueId = IMEI, se informado) →{" "}
            <code>unit/set_active</code>. Se algum passo depois da criação falhar, a unidade é
            desativada como rollback e o caso fica registrado na auditoria como{" "}
            <b>falha parcial</b> para revisão manual.
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
              Será criada a unidade <b>{placa.toUpperCase()}</b> ({hardware}) na conta{" "}
              <b>{accountName}</b> do Wialon <b>{sistema.toUpperCase()}</b>, já ativa
              {imei ? <> com IMEI <code>{imei}</code></> : " e sem IMEI (ficará aguardando vínculo)"}.
              Confira o sistema com atenção — Frota e Auto são contas diferentes. A ação fica
              registrada em auditoria.
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
