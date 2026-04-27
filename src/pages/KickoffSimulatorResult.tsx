import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimulatorPayload } from "./KickoffSimulator";

const KickoffSimulatorResult = () => {
  const navigate = useNavigate();
  const [payload, setPayload] = useState<SimulatorPayload | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kickoff-simulator-result");
      if (raw) setPayload(JSON.parse(raw));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const stats = useMemo(() => {
    if (!payload) return { total: 0, supported: 0, unsupported: 0, errors: 0 };
    const total = payload.results.length;
    const supported = payload.results.filter((r) => r.response?.supported).length;
    const errors = payload.results.filter((r) => r.error).length;
    return { total, supported, unsupported: total - supported - errors, errors };
  }, [payload]);

  if (!payload) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl text-center space-y-4">
        <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">Nenhum resultado disponível</h2>
        <p className="text-sm text-muted-foreground">
          O resultado da simulação expirou ou não foi gerado. Faça uma nova simulação.
        </p>
        <Button onClick={() => navigate("/kickoff/simulador")}>Ir para Simulador</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/kickoff/simulador")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Nova Simulação
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/kickoff")}>
          Voltar ao Kickoff
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Resultado da Simulação</h1>
        <p className="text-sm text-muted-foreground">
          Arquivo: <strong>{payload.fileName}</strong> ·{" "}
          {new Date(payload.generatedAt).toLocaleString("pt-BR")}
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total de veículos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.supported}</div>
            <p className="text-xs text-muted-foreground">Compatíveis</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{stats.unsupported}</div>
            <p className="text-xs text-muted-foreground">Sem correspondência</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{stats.errors}</div>
            <p className="text-xs text-muted-foreground">Erros</p>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todos ({stats.total})</TabsTrigger>
          <TabsTrigger value="supported">Compatíveis ({stats.supported})</TabsTrigger>
          <TabsTrigger value="unsupported">Sem correspondência ({stats.unsupported})</TabsTrigger>
          {stats.errors > 0 && <TabsTrigger value="errors">Erros ({stats.errors})</TabsTrigger>}
        </TabsList>

        {(["all", "supported", "unsupported", "errors"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-3">
            {payload.results
              .filter((r) => {
                if (tab === "all") return true;
                if (tab === "supported") return r.response?.supported;
                if (tab === "unsupported") return !r.error && !r.response?.supported;
                if (tab === "errors") return !!r.error;
                return true;
              })
              .map((r, i) => (
                <ResultCard key={i} result={r} index={i} />
              ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

const ResultCard = ({ result, index }: { result: SimulatorPayload["results"][number]; index: number }) => {
  const { input, response, error } = result;

  let status: "supported" | "unsupported" | "error" = "unsupported";
  if (error) status = "error";
  else if (response?.supported) status = "supported";

  const statusConfig = {
    supported: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30", label: "Compatível" },
    unsupported: {
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-950/30",
      label: "Sem correspondência",
    },
    error: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Erro" },
  };
  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  return (
    <Card className="overflow-hidden">
      <CardHeader className={`${cfg.bg} py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
            <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
            <CardTitle className="text-base">
              {input.brand} {input.model} {input.year ? `· ${input.year}` : ""}
            </CardTitle>
          </div>
          <Badge variant={status === "supported" ? "default" : status === "error" ? "destructive" : "secondary"}>
            {cfg.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {response && response.matched_entry && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Geração</p>
              <p className="font-medium">{response.matched_entry.generation || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tipo</p>
              <p className="font-medium">{response.matched_entry.type || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Faixa de anos</p>
              <p className="font-medium">
                {response.matched_entry.year_from ?? "?"} - {response.matched_entry.year_to ?? "atual"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Regiões</p>
              <p className="font-medium">{response.matched_entry.regions.join(", ") || "—"}</p>
            </div>
          </div>
        )}

        {response && response.suggested_devices.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Dispositivos compatíveis</p>
            <div className="flex flex-wrap gap-1.5">
              {response.suggested_devices.map((d) => (
                <Badge key={d} variant="outline" className="font-mono">
                  {d}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {response && response.connection_methods.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Métodos de conexão</p>
            <div className="flex flex-wrap gap-1.5">
              {response.connection_methods.map((c) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {response && !response.supported && response.candidates.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">
              Possíveis correspondências aproximadas ({response.candidates.length}):
            </p>
            <div className="space-y-1.5">
              {response.candidates.slice(0, 3).map((c, idx) => (
                <div key={idx} className="text-xs flex items-center justify-between bg-muted/40 rounded px-2 py-1.5">
                  <span>
                    {c.brand} {c.model} ({c.year_from ?? "?"}-{c.year_to ?? "?"})
                  </span>
                  <Badge variant="outline" className="text-xs">
                    score {c.match_score}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {response && !response.matched_entry && response.candidates.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">Nenhuma correspondência encontrada na base Ruptela.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default KickoffSimulatorResult;
