import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle2, XCircle, Loader2, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const Installation = () => {
  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const normalized = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!normalized) return;

    setLoading(true);
    setSearched(true);

    try {
      // Check installation_confirmations
      const { data: confirmations } = await supabase
        .from("installation_confirmations")
        .select("*")
        .eq("plate", normalized)
        .order("created_at", { ascending: false })
        .limit(1);

      // Check kit_schedules
      const { data: schedules } = await supabase
        .from("kit_schedules")
        .select("id, customer_name, vehicle_model, vehicle_brand, scheduled_date, status, technician_id")
        .eq("vehicle_plate", normalized)
        .order("scheduled_date", { ascending: false })
        .limit(1);

      const confirmation = confirmations?.[0] || null;
      const schedule = schedules?.[0] || null;

      setResult({
        found: !!confirmation || !!schedule,
        confirmation: confirmation || undefined,
        schedule: schedule || undefined,
      });
    } catch (error) {
      console.error("Erro ao pesquisar placa:", error);
      setResult({ found: false });
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
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
    </div>
  );
};

export default Installation;
