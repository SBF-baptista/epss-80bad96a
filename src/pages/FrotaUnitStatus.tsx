import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logActionExtended } from "@/services/logService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type FrotaStatus = "pending" | "created" | "failed";
type FilterMode = "problem" | "all";

interface Row {
  id: string;
  vehicle_plate: string | null;
  customer_id: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  technician_id: string | null;
  frota_unit_status: FrotaStatus;
  frota_unit_error: string | null;
  frota_unit_attempts: number;
  frota_unit_created_at: string | null;
  frota_unit_last_attempt_at: string | null;
  created_at: string;
  customers?: { name: string | null; company_name: string | null } | null;
  technicians?: { name: string | null } | null;
}

const statusBadge = (s: FrotaStatus) => {
  if (s === "created")
    return (
      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Criada
      </Badge>
    );
  if (s === "failed")
    return (
      <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 mr-1" /> Falhou
      </Badge>
    );
  return (
    <Badge variant="secondary">
      <Clock className="h-3 w-3 mr-1" /> Pendente
    </Badge>
  );
};

const fmt = (d: string | null) =>
  d ? format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—";

export default function FrotaUnitStatus() {
  const [filter, setFilter] = useState<FilterMode>("problem");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["frota-unit-status", filter],
    queryFn: async () => {
      let q = supabase
        .from("kit_schedules")
        .select(
          `id, vehicle_plate, customer_id, scheduled_date, scheduled_time, technician_id,
           frota_unit_status, frota_unit_error, frota_unit_attempts,
           frota_unit_created_at, frota_unit_last_attempt_at, created_at,
           customers:customer_id ( name, company_name ),
           technicians:technician_id ( name )`
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (filter === "problem") {
        q = q.in("frota_unit_status", ["pending", "failed"]);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as Row[]) ?? [];
    },
  });

  const stats = useMemo(() => {
    const rows = data ?? [];
    return {
      total: rows.length,
      failed: rows.filter((r) => r.frota_unit_status === "failed").length,
      pending: rows.filter((r) => r.frota_unit_status === "pending").length,
      created: rows.filter((r) => r.frota_unit_status === "created").length,
    };
  }, [data]);

  const handleRetry = async (row: Row) => {
    setRetryingId(row.id);
    try {
      const { data: resp, error } = await supabase.functions.invoke(
        "create-frota-unidade",
        { body: { scheduleId: row.id, force: true } }
      );

      const ok = !error && (resp as any)?.ok === true;
      const msg = (resp as any)?.error || error?.message;

      // Auditoria: sempre gerar log
      await logActionExtended({
        action: "retry_frota_unit_creation",
        module: "Frota Unit Status",
        details: `Reprocessamento manual da unidade Frota para agendamento ${row.id} (placa ${row.vehicle_plate ?? "n/a"}). Resultado: ${ok ? "sucesso" : "falha"}${msg ? ` — ${msg}` : ""}`,
        action_type: ok ? "integration" : "error",
        origin: "web",
        impact_level: ok ? "medium" : "critical",
        status: ok ? "success" : "error",
        entity_type: "kit_schedule",
        entity_id: row.id,
        entity_name: row.vehicle_plate ?? undefined,
        error_message: ok ? undefined : msg,
        is_reversible: false,
        is_critical: !ok,
      });

      if (ok) {
        toast({
          title: "Unidade criada com sucesso",
          description: `Placa ${row.vehicle_plate ?? ""} reprocessada.`,
        });
      } else {
        toast({
          title: "Falha ao reprocessar",
          description: msg || "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Erro ao invocar função", description: msg, variant: "destructive" });
    } finally {
      setRetryingId(null);
      await refetch();
      qc.invalidateQueries({ queryKey: ["frota-unit-status"] });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Status de Unidades na Frota</h1>
          <p className="text-sm text-muted-foreground">
            Agendamentos com criação de unidade pendente ou com falha na Frota (DigitalOcean).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total exibido</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.total}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Falhas</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-destructive">{stats.failed}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pendentes</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.pending}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Criadas</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-green-600">{stats.created}</CardContent></Card>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
        <TabsList>
          <TabsTrigger value="problem">Somente problemas</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !data || data.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum agendamento encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Data agend.</TableHead>
                  <TableHead>Status Unidade</TableHead>
                  <TableHead className="text-center">Tent.</TableHead>
                  <TableHead>Última tentativa</TableHead>
                  <TableHead>Erro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono font-medium">
                      {row.vehicle_plate ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      {row.customers?.company_name || row.customers?.name || "—"}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate">
                      {row.technicians?.name ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.scheduled_date
                        ? `${format(new Date(row.scheduled_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}${row.scheduled_time ? " " + row.scheduled_time.slice(0, 5) : ""}`
                        : "—"}
                    </TableCell>
                    <TableCell>{statusBadge(row.frota_unit_status)}</TableCell>
                    <TableCell className="text-center">{row.frota_unit_attempts}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {fmt(row.frota_unit_last_attempt_at)}
                    </TableCell>
                    <TableCell className="max-w-[320px]">
                      <span className="text-xs text-destructive line-clamp-2" title={row.frota_unit_error ?? ""}>
                        {row.frota_unit_error ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={row.frota_unit_status === "created" ? "outline" : "default"}
                        onClick={() => handleRetry(row)}
                        disabled={retryingId === row.id}
                      >
                        {retryingId === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1" />
                        )}
                        Reprocessar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
