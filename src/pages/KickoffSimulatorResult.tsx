import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, FileSpreadsheet, FileText, Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimulatorPayload } from "./KickoffSimulator";
import { simulatorService } from "@/services/simulatorService";
import { toast } from "sonner";

const KickoffSimulatorResult = () => {
  const navigate = useNavigate();
  const [payload, setPayload] = useState<SimulatorPayload | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = sessionStorage.getItem("kickoff-simulator-result");
        if (raw) {
          setPayload(JSON.parse(raw));
          return;
        }
      } catch (e) {
        console.error(e);
      }
      // Fallback: load latest saved simulation for the current user
      try {
        const latest = await simulatorService.getLatest();
        if (latest) {
          const p = { ...latest.payload, simulationId: latest.id };
          setPayload(p);
          sessionStorage.setItem("kickoff-simulator-result", JSON.stringify(p));
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    if (!payload) return { total: 0, supported: 0, fallback: 0, unsupported: 0, errors: 0 };
    const total = payload.results.length;
    const ruptela = payload.results.filter((r) => r.response?.supported).length;
    const fallback = payload.results.filter((r) => !r.response?.supported && !!r.fallback && !r.error).length;
    const errors = payload.results.filter((r) => r.error).length;
    // Homologated counts as compatible (same color/treatment)
    const supported = ruptela + fallback;
    return { total, supported, fallback, unsupported: total - supported - errors, errors };
  }, [payload]);

  const handleExport = () => {
    if (!payload) return;
    try {
      const rows = payload.results.map((r, i) => {
        const matched = r.response?.matched_entry;
        const fb = r.fallback;
        const isRuptela = !!r.response?.supported;
        const isHomologated = !isRuptela && !!fb;
        return {
          "#": i + 1,
          Marca: r.input.brand,
          Modelo: r.input.model,
          Ano: r.input.year ?? "",
          Status: r.error
            ? "Erro"
            : isRuptela
              ? "Compatível (Ruptela)"
              : isHomologated
                ? "Homologado (interno)"
                : "Sem correspondência",
          Fonte: isRuptela ? "Ruptela" : isHomologated ? (fb!.source === "homologation_card" ? "Homologação" : "Regra de automação") : "",
          Configuração: isRuptela
            ? matched?.canbus_configuration ?? ""
            : isHomologated
              ? fb!.configuration
              : "",
          "OBD Configuration": isRuptela ? matched?.obd_configuration ?? "" : "",
          "CANbus (HCV/LCV) Configuration": isRuptela
            ? (matched?.canbus_hcv_lcv_parameters ?? []).join("; ")
            : "",
          "Dispositivos sugeridos": isRuptela ? (r.response?.suggested_devices ?? []).join(", ") : isHomologated ? (fb!.tracker_model ?? "") : "",
          "Métodos de conexão": isRuptela ? (r.response?.connection_methods ?? []).join(", ") : "",
          Geração: matched?.generation ?? "",
          Tipo: matched?.type ?? "",
          Região: matched?.regions?.join(", ") ?? "",
          "Faixa de anos": matched ? `${matched.year_from ?? "?"} - ${matched.year_to ?? "atual"}` : "",
          Erro: r.error ?? "",
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Simulação");
      const baseName = payload.fileName.replace(/\.[^.]+$/, "") || "simulacao";
      XLSX.writeFile(wb, `${baseName}-resultado.xlsx`);
    } catch (e) {
      console.error(e);
      toast.error("Falha ao exportar planilha.");
    }
  };

  if (!payload) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-3xl text-center space-y-4">
        <FileSpreadsheet className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground" />
        <h2 className="text-lg sm:text-xl font-semibold">Nenhum resultado disponível</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          O resultado da simulação expirou ou não foi gerado. Faça uma nova simulação.
        </p>
        <Button onClick={() => navigate("/kickoff/simulador")} className="min-h-12 w-full sm:w-auto">
          Ir para Simulador
        </Button>
      </div>
    );
  }

  return (
    // Fundo slate-100 (#F1F5F9) para destacar os cards brancos com aparência premium
    <div className="min-h-screen bg-[#F1F5F9]">
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 max-w-7xl overflow-x-hidden">
      {/* Botões de navegação: empilham no mobile, ocupam largura total */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/kickoff/simulador")}
          className="min-h-12 sm:min-h-9 justify-start sm:justify-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Nova Simulação
        </Button>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleExport}
            className="min-h-12 sm:min-h-9"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar planilha
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/kickoff")}
            className="min-h-12 sm:min-h-9"
          >
            Voltar ao Kickoff
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Resultado da Simulação
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground break-words">
          Arquivo: <strong className="break-all">{payload.fileName}</strong> ·{" "}
          {new Date(payload.generatedAt).toLocaleString("pt-BR")}
        </p>
      </motion.div>

      {/* Stats: 4 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <Card className="bg-white border-slate-200 opacity-80">
          <CardContent className="p-3 sm:p-6 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-slate-700">{stats.total}</div>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Total de veículos</p>
          </CardContent>
        </Card>
        <Card
          className="border-[rgba(34,197,94,0.3)] shadow-[0_4px_14px_rgba(34,197,94,0.12)]"
          style={{ backgroundColor: "rgba(34,197,94,0.08)" }}
        >
          <CardContent className="p-3 sm:p-6 sm:pt-6">
            <div className="text-2xl sm:text-3xl font-bold text-green-700">{stats.supported}</div>
            <p className="text-[11px] sm:text-xs font-medium text-green-800/80">Compatíveis</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 opacity-80">
          <CardContent className="p-3 sm:p-6 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{stats.unsupported}</div>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Sem correspondência</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 opacity-80">
          <CardContent className="p-3 sm:p-6 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-destructive">{stats.errors}</div>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Erros</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <div className="overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="w-max sm:w-auto">
            <TabsTrigger value="all" className="text-xs sm:text-sm whitespace-nowrap">
              Todos ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="supported" className="text-xs sm:text-sm whitespace-nowrap">
              Compatíveis ({stats.supported})
            </TabsTrigger>
            <TabsTrigger value="unsupported" className="text-xs sm:text-sm whitespace-nowrap">
              Sem correspondência ({stats.unsupported})
            </TabsTrigger>
            {stats.errors > 0 && (
              <TabsTrigger value="errors" className="text-xs sm:text-sm whitespace-nowrap">
                Erros ({stats.errors})
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {(["all", "supported", "unsupported", "errors"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-3">
            {payload.results
              .filter((r) => {
                if (tab === "all") return true;
                if (tab === "supported") return r.response?.supported || (!!r.fallback && !r.error);
                if (tab === "unsupported") return !r.error && !r.response?.supported && !r.fallback;
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
    </div>
  );
};

const ResultCard = ({ result, index }: { result: SimulatorPayload["results"][number]; index: number }) => {
  const { input, response, fallback, error } = result;

  let status: "supported" | "fallback" | "unsupported" | "error" = "unsupported";
  if (error) status = "error";
  else if (response?.supported) status = "supported";
  else if (fallback) status = "fallback";

  const statusConfig = {
    supported: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30", label: "Compatível" },
    fallback: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30", label: "Compatível" },
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

  const isSupported = status === "supported";
  const isFallback = status === "fallback";
  const isCompatible = isSupported || isFallback;
  const cardClasses = isCompatible
    ? "overflow-hidden bg-white border border-[rgba(34,197,94,0.3)] shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-transform duration-200 hover:-translate-y-0.5"
    : "overflow-hidden bg-white border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-transform duration-200 hover:-translate-y-0.5";

  const badgeClasses = isCompatible
    ? "self-start sm:self-auto shrink-0 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold border-transparent"
    : "self-start sm:self-auto shrink-0 font-semibold";

  return (
    <Card className={cardClasses}>
      {/* Header: empilha no mobile para acomodar título longo + badge */}
      <CardHeader className={`${cfg.bg} py-3 px-3 sm:px-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-xs font-mono text-muted-foreground shrink-0">#{index + 1}</span>
            <StatusIcon className={`h-5 w-5 ${cfg.color} shrink-0`} />
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base truncate uppercase tracking-wide">
                {isCompatible && <span className="text-[#16A34A] mr-1">✔</span>}
                {input.brand} {input.model} {input.year ? input.year : ""}
              </CardTitle>
              {isCompatible && (
                <p className="text-[11px] sm:text-xs text-green-700/80 mt-0.5 normal-case tracking-normal font-medium">
                  Compatível com sua operação
                </p>
              )}
            </div>
          </div>
          <Badge
            variant={isCompatible ? "default" : status === "error" ? "destructive" : "secondary"}
            className={badgeClasses}
          >
            {cfg.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 px-3 sm:px-6 space-y-4">
        {error && <p className="text-xs sm:text-sm text-destructive break-words">{error}</p>}

        {/* SEÇÃO: HOMOLOGADO INTERNO (fallback) */}
        {isFallback && fallback && (
          <div className="space-y-2">
            <p className="text-[10px] sm:text-xs font-semibold tracking-widest text-slate-500 uppercase">
              Configuração homologada
            </p>
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-2 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Configuração</p>
                  <p className="font-semibold text-green-900 break-words">{fallback.configuration}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Fonte</p>
                  <p className="font-semibold text-green-900">
                    {fallback.source === "homologation_card" ? "Homologação interna" : "Regra de automação"}
                  </p>
                </div>
                {fallback.tracker_model && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Rastreador</p>
                    <p className="font-semibold text-green-900">{fallback.tracker_model}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Veículo encontrado</p>
                  <p className="font-semibold text-green-900">
                    {fallback.brand} {fallback.model} {fallback.year ? `(${fallback.year})` : ""}
                  </p>
                </div>
              </div>
              {fallback.notes && (
                <p className="text-xs text-muted-foreground italic break-words">{fallback.notes}</p>
              )}
            </div>
          </div>
        )}

        {/* SEÇÃO: ESPECIFICAÇÕES (Geração, Tipo, Região) */}
        {response && response.matched_entry && (
          <div className="space-y-1.5">
            <p className="text-[10px] sm:text-xs font-semibold tracking-widest text-slate-500 uppercase">
              Especificações
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm rounded-lg bg-slate-50 border border-slate-100 p-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Geração</p>
                <p className="font-semibold text-slate-800">{response.matched_entry.generation || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                <p className="font-semibold text-slate-800">{response.matched_entry.type || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Região</p>
                <p className="font-semibold text-slate-800">
                  {response.matched_entry.regions.join(", ") || "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SEÇÃO: PERÍODO (Faixa de anos) */}
        {response && response.matched_entry && (
          <div className="space-y-1.5">
            <p className="text-[10px] sm:text-xs font-semibold tracking-widest text-slate-500 uppercase">
              Período
            </p>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs sm:text-sm">
              <p className="text-xs text-muted-foreground mb-1">Faixa de anos</p>
              <p className="font-semibold text-slate-800">
                {response.matched_entry.year_from ?? "?"} – {response.matched_entry.year_to ?? "atual"}
              </p>
            </div>
          </div>
        )}

        {/* SEÇÃO: COMPATIBILIDADE (Dispositivos + Métodos de conexão) */}
        {response && (response.suggested_devices.length > 0 || response.connection_methods.length > 0) && (
          <div className="space-y-2">
            <p className="text-[10px] sm:text-xs font-semibold tracking-widest text-slate-500 uppercase">
              Compatibilidade
            </p>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 space-y-3">
              {response.suggested_devices.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Dispositivos compatíveis</p>
                  <div className="flex flex-wrap gap-1.5">
                    {/* Chips primários: destaque com borda verde e texto verde */}
                    {response.suggested_devices.map((d) => (
                      <Badge
                        key={d}
                        variant="outline"
                        className="font-mono border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.08)] text-green-800 font-semibold"
                      >
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {response.connection_methods.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Métodos de conexão</p>
                  <div className="flex flex-wrap gap-1.5">
                    {/* Chips secundários: opacidade reduzida */}
                    {response.connection_methods.map((c) => (
                      <Badge key={c} variant="secondary" className="opacity-80">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CANbus Configuration: texto literal extraído da página de detalhe Ruptela
            (ex: "1. LCV group - CITROEN4"). Exibido logo abaixo dos métodos de conexão. */}
        {response && response.matched_entry?.canbus_configuration && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              CANbus Configuration
            </p>
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs sm:text-sm font-medium text-foreground whitespace-pre-line break-words">
              {response.matched_entry.canbus_configuration}
            </div>
          </div>
        )}

        {/* OBD Configuration: card "OBD Configuration" da página de detalhe Ruptela. */}
        {response && response.matched_entry?.obd_configuration && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              OBD Configuration
            </p>
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs sm:text-sm font-medium text-foreground whitespace-pre-line break-words">
              {response.matched_entry.obd_configuration}
            </div>
          </div>
        )}

        {/* CANbus (HCV/LCV) Configuration — Supported Parameters table.
            Lista os parâmetros marcados com check verde no detalhe da Ruptela. */}
        {response &&
          response.matched_entry?.canbus_hcv_lcv_parameters &&
          response.matched_entry.canbus_hcv_lcv_parameters.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                CANbus (HCV/LCV) Configuration · Parâmetros suportados (
                {response.matched_entry.canbus_hcv_lcv_parameters.length})
              </p>
              <div className="rounded-md border bg-muted/40 px-3 py-2 flex flex-wrap gap-1.5">
                {response.matched_entry.canbus_hcv_lcv_parameters.map((p) => (
                  <Badge
                    key={p}
                    variant="outline"
                    className="text-[11px] sm:text-xs font-normal border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.06)] text-green-800"
                  >
                    {p}
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
