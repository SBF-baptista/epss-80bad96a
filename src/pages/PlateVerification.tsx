import { useState } from "react";
import { Search, CheckCircle2, XCircle, AlertCircle, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type LocalRecord = Record<string, unknown> & { id: string };

interface CheckResult {
  ok: boolean;
  placa?: string;
  local?: {
    installation_schedules: LocalRecord[];
    kit_schedules: LocalRecord[];
    incoming_vehicles: LocalRecord[];
  };
  tipoContratoUsado?: string;
  usageTypeDetectado?: string | null;
  frota?: {
    ok?: boolean;
    status?: number;
    interpretation?: "created_now" | "already_exists" | "error";
    request?: unknown;
    response?: unknown;
    error?: string;
  };
  error?: string;
}

const PlateVerification = () => {
  const [plate, setPlate] = useState("");
  const [tipoContrato, setTipoContrato] = useState<string>("auto");
  const [loading, setLoading] = useState(false);
  const [kafkaLoading, setKafkaLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const { toast } = useToast();

  const handleCheck = async () => {
    const p = plate.trim().toUpperCase();
    if (!p) {
      toast({ title: "Informe uma placa", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("check-plate-dispatch", {
        body: { placa: p, tipoContrato: tipoContrato === "auto" ? undefined : tipoContrato },
      });
      if (error) throw error;
      setResult(data as CheckResult);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Erro na verificação", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleKafkaResend = async (scheduleId: string, kind: "kit" | "installation") => {
    setKafkaLoading(true);
    try {
      const body = kind === "kit" ? { scheduleId } : { installationScheduleId: scheduleId };
      const { data, error } = await supabase.functions.invoke("kafka-publish-agendamento", { body });
      if (error) throw error;
      const okFlag = (data as { ok?: boolean })?.ok;
      toast({
        title: okFlag ? "Publicado no Kafka" : "Falha ao publicar",
        description: okFlag ? "Mensagem enviada ao tópico." : JSON.stringify(data),
        variant: okFlag ? "default" : "destructive",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Erro ao publicar no Kafka", description: msg, variant: "destructive" });
    } finally {
      setKafkaLoading(false);
    }
  };

  const frotaBadge = () => {
    const f = result?.frota;
    if (!f) return null;
    if (f.interpretation === "created_now")
      return <Badge className="bg-green-600 text-white"><CheckCircle2 className="w-3 h-3 mr-1" />Criada agora no Frota</Badge>;
    if (f.interpretation === "already_exists")
      return <Badge className="bg-blue-600 text-white"><CheckCircle2 className="w-3 h-3 mr-1" />Já existe no Frota</Badge>;
    return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Não criada / erro</Badge>;
  };

  const totalLocal =
    (result?.local?.installation_schedules.length ?? 0) +
    (result?.local?.kit_schedules.length ?? 0) +
    (result?.local?.incoming_vehicles.length ?? 0);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Verificação de Placa - Frota / Kafka</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Consulta uma placa nos registros locais e verifica se ela existe/foi criada no Frota. Opcionalmente, reenvia para o tópico Kafka.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consulta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr,200px,auto] gap-3">
            <Input
              placeholder="Ex.: TXA4F33"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleCheck()}
              className="uppercase"
            />
            <Select value={tipoContrato} onValueChange={setTipoContrato}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (por usage_type)</SelectItem>
                <SelectItem value="TELEMETRIA">TELEMETRIA</SelectItem>
                <SelectItem value="MENSALISTA">MENSALISTA</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCheck} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Verificar
            </Button>
          </div>
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-xs">
              A verificação no Frota é feita via POST /api/unidade. HTTP 200 = criada agora. HTTP 500 com "Saga executada" = provavelmente já existente.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Resultado - Frota (POST /api/unidade)</span>
                {frotaBadge()}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Placa: {result.placa}</Badge>
                <Badge variant="outline">Tipo: {result.tipoContratoUsado}</Badge>
                {result.usageTypeDetectado && (
                  <Badge variant="outline">usage_type: {result.usageTypeDetectado}</Badge>
                )}
                {typeof result.frota?.status === "number" && (
                  <Badge variant="outline">HTTP {result.frota.status}</Badge>
                )}
              </div>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-80">
                {JSON.stringify(result.frota, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Registros Locais {totalLocal > 0 ? `(${totalLocal})` : "(nenhum)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <Section
                title="installation_schedules"
                rows={result.local?.installation_schedules ?? []}
                onKafka={(id) => handleKafkaResend(id, "installation")}
                kafkaLoading={kafkaLoading}
              />
              <Section
                title="kit_schedules"
                rows={result.local?.kit_schedules ?? []}
                onKafka={(id) => handleKafkaResend(id, "kit")}
                kafkaLoading={kafkaLoading}
              />
              <Section
                title="incoming_vehicles"
                rows={result.local?.incoming_vehicles ?? []}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

interface SectionProps {
  title: string;
  rows: Array<Record<string, unknown> & { id: string }>;
  onKafka?: (id: string) => void;
  kafkaLoading?: boolean;
}
const Section = ({ title, rows, onKafka, kafkaLoading }: SectionProps) => (
  <div>
    <div className="font-medium mb-2">{title} <span className="text-muted-foreground">({rows.length})</span></div>
    {rows.length === 0 ? (
      <div className="text-xs text-muted-foreground">Nenhum registro.</div>
    ) : (
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="border rounded p-3 bg-muted/30 text-xs">
            <div className="flex items-start justify-between gap-2">
              <pre className="whitespace-pre-wrap flex-1 overflow-auto">{JSON.stringify(r, null, 2)}</pre>
              {onKafka && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={kafkaLoading}
                  onClick={() => onKafka(r.id)}
                  className="gap-1 shrink-0"
                >
                  <Send className="w-3 h-3" /> Kafka
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default PlateVerification;
