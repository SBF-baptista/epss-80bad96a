import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, CheckCircle2, XCircle, Loader2, Wrench, Clock, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  found: boolean;
  confirmation?: {
    id: string;
    plate: string;
    imei: string;
    source: string | null;
    created_at: string;
  };
  schedule?: {
    id: string;
    customer_name: string | null;
    vehicle_model: string | null;
    vehicle_brand: string | null;
    scheduled_date: string;
    status: string;
    technician_id: string;
  };
}

interface SearchHistoryEntry {
  id: string;
  searched_plate: string;
  searched_by: string | null;
  found: boolean;
  result_type: string | null;
  result_data: any;
  created_at: string;
}

const Installation = () => {
  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("installation_search_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        setHistory(data as SearchHistoryEntry[]);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const saveToHistory = async (
    normalizedPlate: string,
    found: boolean,
    resultType: string,
    resultData: any
  ) => {
    try {
      await supabase.from("installation_search_history").insert({
        searched_plate: normalizedPlate,
        searched_by: user?.id || null,
        found,
        result_type: resultType,
        result_data: resultData || {},
      });
      loadHistory();
    } catch (err) {
      console.error("Erro ao salvar histórico:", err);
    }
  };

  const handleSearch = async () => {
    const normalized = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!normalized) return;

    setLoading(true);
    setSearched(true);

    try {
      const { data: confirmations } = await supabase
        .from("installation_confirmations")
        .select("*")
        .eq("plate", normalized)
        .order("created_at", { ascending: false })
        .limit(1);

      const { data: schedules } = await supabase
        .from("kit_schedules")
        .select("id, customer_name, vehicle_model, vehicle_brand, scheduled_date, status, technician_id")
        .eq("vehicle_plate", normalized)
        .order("scheduled_date", { ascending: false })
        .limit(1);

      const confirmation = confirmations?.[0] || null;
      const schedule = schedules?.[0] || null;

      const searchResult: SearchResult = {
        found: !!confirmation || !!schedule,
        confirmation: confirmation || undefined,
        schedule: schedule || undefined,
      };

      setResult(searchResult);

      // Save to history
      const resultType = confirmation ? "confirmation" : schedule ? "schedule" : "not_found";
      const resultData = confirmation
        ? { plate: confirmation.plate, imei: confirmation.imei, source: confirmation.source, created_at: confirmation.created_at }
        : schedule
        ? { customer_name: schedule.customer_name, vehicle_brand: schedule.vehicle_brand, vehicle_model: schedule.vehicle_model, scheduled_date: schedule.scheduled_date, status: schedule.status }
        : { plate: normalized };

      await saveToHistory(normalized, searchResult.found, resultType, resultData);
    } catch (error) {
      console.error("Erro ao pesquisar placa:", error);
      setResult({ found: false });
      await saveToHistory(normalized, false, "error", { error: "Erro na pesquisa" });
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      const { error } = await supabase
        .from("installation_search_history")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all

      if (error) throw error;
      setHistory([]);
      toast({ title: "Histórico limpo", description: "Todo o histórico de pesquisas foi removido." });
    } catch (err) {
      console.error("Erro ao limpar histórico:", err);
      toast({ title: "Erro", description: "Não foi possível limpar o histórico.", variant: "destructive" });
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      scheduled: { label: "Agendado", variant: "secondary" },
      confirmed: { label: "Confirmado", variant: "default" },
      completed: { label: "Concluído", variant: "default" },
      cancelled: { label: "Cancelado", variant: "destructive" },
    };
    return map[status] || { label: status, variant: "outline" as const };
  };

  const getResultTypeBadge = (resultType: string | null) => {
    switch (resultType) {
      case "confirmation":
        return <Badge className="bg-green-100 text-green-700 border-green-300">Instalação Confirmada</Badge>;
      case "schedule":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-300">Agendamento Encontrado</Badge>;
      case "not_found":
        return <Badge variant="destructive">Não Encontrado</Badge>;
      case "error":
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="outline">{resultType || "—"}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Instalação</h1>
        <p className="text-muted-foreground">Verifique o status de instalação de um veículo pela placa</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite a placa do veículo..."
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
                maxLength={7}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading || !plate.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pesquisar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="result" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="result" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Resultado
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Histórico ({history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="result" className="mt-4">
          {searched && !loading && result && (
            <>
              {result.confirmation ? (
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      Instalação Confirmada
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-muted-foreground">Placa:</span>
                        <p className="font-medium">{result.confirmation.plate}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">IMEI:</span>
                        <p className="font-medium">{result.confirmation.imei}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Data da Confirmação:</span>
                        <p className="font-medium">
                          {format(new Date(result.confirmation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      {result.confirmation.source && (
                        <div>
                          <span className="text-muted-foreground">Origem:</span>
                          <p className="font-medium">{result.confirmation.source}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : result.schedule ? (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-amber-600">
                      <Wrench className="h-5 w-5" />
                      Agendamento Encontrado — Instalação Pendente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      {result.schedule.customer_name && (
                        <div>
                          <span className="text-muted-foreground">Cliente:</span>
                          <p className="font-medium">{result.schedule.customer_name}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Veículo:</span>
                        <p className="font-medium">
                          {[result.schedule.vehicle_brand, result.schedule.vehicle_model].filter(Boolean).join(" ") || "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Data Agendada:</span>
                        <p className="font-medium">
                          {format(new Date(result.schedule.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={getStatusLabel(result.schedule.status).variant}>
                          {getStatusLabel(result.schedule.status).label}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-5 w-5" />
                      Nenhum registro encontrado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Não foi encontrada nenhuma instalação ou agendamento para a placa informada.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
          {!searched && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Digite uma placa e clique em Pesquisar</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Histórico de Pesquisas
              </CardTitle>
              {history.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearHistory} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma pesquisa realizada ainda</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead>Resultado</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-mono font-bold">{entry.searched_plate}</TableCell>
                          <TableCell>{getResultTypeBadge(entry.result_type)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                            {entry.result_type === "confirmation" && entry.result_data?.imei && (
                              <span>IMEI: {entry.result_data.imei}</span>
                            )}
                            {entry.result_type === "schedule" && entry.result_data?.customer_name && (
                              <span>
                                {entry.result_data.customer_name}
                                {entry.result_data.scheduled_date && ` — ${format(new Date(entry.result_data.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}`}
                              </span>
                            )}
                            {entry.result_type === "not_found" && <span>—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Installation;
