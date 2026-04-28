import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";
import { ArrowLeft, FileSpreadsheet, Upload, Loader2, AlertCircle, History, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ruptelaVehicleService, RuptelaCheckResponse } from "@/services/ruptelaVehicleService";
import { findHomologatedConfig, HomologationFallbackMatch } from "@/services/homologationFallbackService";
import { simulatorService } from "@/services/simulatorService";
import { toast } from "sonner";

export interface SimulatorRowInput {
  brand: string;
  model: string;
  year: number | null;
  raw: Record<string, any>;
}

export interface SimulatorRowResult {
  input: SimulatorRowInput;
  response: RuptelaCheckResponse | null;
  fallback?: HomologationFallbackMatch | null;
  error: string | null;
}

export interface SimulatorPayload {
  generatedAt: string;
  fileName: string;
  results: SimulatorRowResult[];
  simulationId?: string;
}

const BRAND_KEYS = ["marca", "brand", "fabricante", "manufacturer", "make"];
const MODEL_KEYS = ["modelo", "model", "veiculo", "vehicle"];
// Ordered by preference: prefer "ano modelo" over "ano fab." when both exist
const YEAR_MODEL_KEYS = ["ano modelo", "ano_modelo", "anomodelo"];
const YEAR_FAB_KEYS = ["ano fab", "ano_fab", "ano fabricacao", "ano fabricação", "anofab"];
const YEAR_GENERIC_KEYS = ["ano", "year"];

function normalize(s: any) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .toLowerCase()
    .trim();
}

function detectColumn(headers: string[], candidates: string[]): string | null {
  const normHeaders = headers.map((h) => ({ raw: h, norm: normalize(h) }));
  // First pass: exact match
  for (const c of candidates) {
    const found = normHeaders.find((h) => h.norm === c);
    if (found) return found.raw;
  }
  // Second pass: contains
  for (const c of candidates) {
    const found = normHeaders.find((h) => h.norm.includes(c));
    if (found) return found.raw;
  }
  return null;
}

function detectYearColumn(headers: string[]): string | null {
  return (
    detectColumn(headers, YEAR_MODEL_KEYS) ||
    detectColumn(headers, YEAR_FAB_KEYS) ||
    detectColumn(headers, YEAR_GENERIC_KEYS)
  );
}

/**
 * Find the header row in a sheet by scanning the first ~20 rows for
 * recognizable column names (MARCA/MODELO/PLACA). Returns the row index
 * (0-based) to use as the header. Defaults to 0 when not found.
 */
function findHeaderRow(sheet: XLSX.WorkSheet): number {
  const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "", blankrows: true });
  const maxScan = Math.min(matrix.length, 20);
  for (let i = 0; i < maxScan; i++) {
    const row = (matrix[i] || []).map((c) => normalize(c));
    const hasBrand = row.some((c) => BRAND_KEYS.includes(c) || c === "marca");
    const hasModel = row.some((c) => MODEL_KEYS.includes(c) || c === "modelo");
    if (hasBrand && hasModel) return i;
  }
  return 0;
}

function parseYear(value: any): number | null {
  if (value == null || value === "") return null;
  const str = String(value).trim();
  const match = str.match(/(19|20)\d{2}/);
  if (match) return parseInt(match[0], 10);
  const num = parseInt(str, 10);
  return Number.isFinite(num) ? num : null;
}

const KickoffSimulator = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<SimulatorRowInput[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<{ brand: string | null; model: string | null; year: string | null } | null>(
    null,
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [savedSimulations, setSavedSimulations] = useState<Awaited<ReturnType<typeof simulatorService.list>>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load previously saved simulations for this user
  useEffect(() => {
    simulatorService.list().then(setSavedSimulations).catch(() => {});
  }, []);

  const handleFileSelect = useCallback(async (selected: File) => {
    setFile(selected);
    setParseError(null);
    setRows([]);
    setDetectedColumns(null);

    try {
      const buffer = await selected.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        setParseError("A planilha está vazia.");
        return;
      }
      const sheet = wb.Sheets[sheetName];
      // Detect header row (planilhas exportadas costumam ter título nas primeiras linhas)
      const headerRowIdx = findHeaderRow(sheet);
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
        defval: "",
        range: headerRowIdx,
      });

      if (data.length === 0) {
        setParseError("Nenhuma linha encontrada na planilha.");
        return;
      }

      const headers = Object.keys(data[0]).filter((h) => h && !h.startsWith("__EMPTY"));
      const brandCol = detectColumn(headers, BRAND_KEYS);
      const modelCol = detectColumn(headers, MODEL_KEYS);
      const yearCol = detectYearColumn(headers);

      setDetectedColumns({ brand: brandCol, model: modelCol, year: yearCol });

      if (!brandCol || !modelCol) {
        setParseError(
          `Não foi possível detectar as colunas obrigatórias. Colunas encontradas: ${headers.join(", ")}. A planilha precisa ter colunas de Marca e Modelo.`,
        );
        return;
      }

      const parsedRows: SimulatorRowInput[] = data
        .map((r) => ({
          brand: String(r[brandCol] ?? "").trim(),
          model: String(r[modelCol] ?? "").trim(),
          year: yearCol ? parseYear(r[yearCol]) : null,
          raw: r,
        }))
        .filter((r) => r.brand && r.model);

      if (parsedRows.length === 0) {
        setParseError("Nenhuma linha válida encontrada (marca e modelo são obrigatórios).");
        return;
      }

      setRows(parsedRows);
    } catch (err: any) {
      console.error(err);
      setParseError(`Erro ao ler a planilha: ${err.message ?? "desconhecido"}`);
    }
  }, []);

  const handleSimulate = useCallback(async () => {
    if (rows.length === 0) return;
    setProcessing(true);
    setProgress(0);

    const results: SimulatorRowResult[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let response: RuptelaCheckResponse | null = null;
      let error: string | null = null;
      try {
        response = await ruptelaVehicleService.checkVehicle(row.brand, row.model, row.year ?? undefined);
      } catch (err: any) {
        error = err.message ?? "Erro ao consultar";
      }

      // Fallback: if Ruptela did not return a supported match, search homologation/automation rules
      let fallback: HomologationFallbackMatch | null = null;
      if (!response?.supported) {
        try {
          fallback = await findHomologatedConfig(row.brand, row.model, row.year);
        } catch (e) {
          console.warn("[simulator] fallback lookup failed", e);
        }
      }

      results.push({ input: row, response, fallback, error });
      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    const payload: SimulatorPayload = {
      generatedAt: new Date().toISOString(),
      fileName: file?.name ?? "planilha.xlsx",
      results,
    };

    // Persist to DB (per user). Fallback to sessionStorage if save fails.
    try {
      const saved = await simulatorService.save(payload);
      if (saved) payload.simulationId = saved.id;
    } catch (e) {
      console.warn("[simulator] persist failed", e);
    }

    try {
      sessionStorage.setItem("kickoff-simulator-result", JSON.stringify(payload));
    } catch {
      toast.error("Não foi possível armazenar o resultado.");
      setProcessing(false);
      return;
    }

    setProcessing(false);
    navigate("/kickoff/simulador/resultado");
  }, [rows, file, navigate]);

  return (
    // Mobile-first: padding compacto no mobile, cresce no desktop. max-w garante boa leitura
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/kickoff")}
          // min-h-12 garante alvo de toque adequado (48px) no mobile
          className="min-h-12 sm:min-h-9"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        {/* Tipografia escalonada por breakpoint */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Simulador de Configuração
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Faça upload de uma planilha (.xlsx) com Marca, Modelo e Ano dos veículos para consultar a configuração compatível na base
          Ruptela.
        </p>
      </motion.div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
            Upload da Planilha
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Aceita arquivos .xlsx. As colunas Marca, Modelo e Ano serão detectadas automaticamente pelo cabeçalho.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
          {/* Dropzone: padding reduzido no mobile, área de toque grande */}
          <div
            className="border-2 border-dashed rounded-lg p-6 sm:p-10 text-center cursor-pointer hover:bg-muted/30 transition-colors touch-manipulation"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFileSelect(f);
            }}
          >
            <Upload className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium break-all">{file ? file.name : "Toque ou arraste a planilha aqui"}</p>
            <p className="text-xs text-muted-foreground mt-1">Formato suportado: .xlsx</p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
          </div>

          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm break-words">{parseError}</AlertDescription>
            </Alert>
          )}

          {detectedColumns && rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-muted-foreground w-full sm:w-auto">Colunas detectadas:</span>
                <Badge variant="secondary" className="max-w-full truncate">Marca: {detectedColumns.brand}</Badge>
                <Badge variant="secondary" className="max-w-full truncate">Modelo: {detectedColumns.model}</Badge>
                <Badge variant={detectedColumns.year ? "secondary" : "outline"} className="max-w-full truncate">
                  Ano: {detectedColumns.year ?? "não detectada"}
                </Badge>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                <strong className="text-foreground">{rows.length}</strong> veículo(s) prontos para simulação.
              </div>

              {/* Mobile: lista de cards. Desktop (md+): tabela tradicional */}
              <div className="border rounded-md max-h-64 overflow-auto">
                {/* Cards para mobile */}
                <ul className="md:hidden divide-y">
                  {rows.slice(0, 50).map((r, i) => (
                    <li key={i} className="p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground font-mono">#{i + 1}</span>
                        <span className="text-xs text-muted-foreground">{r.year ?? "—"}</span>
                      </div>
                      <div className="font-medium truncate">{r.brand}</div>
                      <div className="text-muted-foreground text-xs truncate">{r.model}</div>
                    </li>
                  ))}
                </ul>
                {/* Tabela para desktop */}
                <table className="hidden md:table w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">#</th>
                      <th className="text-left px-3 py-2 font-medium">Marca</th>
                      <th className="text-left px-3 py-2 font-medium">Modelo</th>
                      <th className="text-left px-3 py-2 font-medium">Ano</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2">{r.brand}</td>
                        <td className="px-3 py-2">{r.model}</td>
                        <td className="px-3 py-2">{r.year ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 50 && (
                  <div className="text-xs text-muted-foreground px-3 py-2 border-t">
                    Mostrando 50 de {rows.length} linhas.
                  </div>
                )}
              </div>
            </div>
          )}

          {processing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span className="truncate">Consultando configurações... {progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Botão CTA: largura total no mobile (input/botões no mobile = full-width), padding lateral controlado */}
          <div className="flex justify-stretch sm:justify-end">
            <Button
              onClick={handleSimulate}
              disabled={rows.length === 0 || processing}
              size="lg"
              className="w-full sm:w-auto min-h-12"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Simulando...
                </>
              ) : (
                <>Simular Configuração</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {savedSimulations.length > 0 && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <History className="h-5 w-5 text-primary shrink-0" />
              Minhas simulações salvas
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Suas simulações anteriores ficam salvas e disponíveis para consulta a qualquer momento.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <ul className="divide-y border rounded-md">
              {savedSimulations.map((s) => (
                <li key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{s.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString("pt-BR")} · {s.total_rows} veículo(s) ·{" "}
                      <span className="text-green-700 font-medium">{s.supported_count} compatíveis</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const full = await simulatorService.getById(s.id);
                        if (!full) {
                          toast.error("Não foi possível carregar a simulação.");
                          return;
                        }
                        try {
                          sessionStorage.setItem(
                            "kickoff-simulator-result",
                            JSON.stringify({ ...full.payload, simulationId: full.id }),
                          );
                          navigate("/kickoff/simulador/resultado");
                        } catch {
                          toast.error("Erro ao abrir simulação.");
                        }
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" /> Abrir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!confirm("Excluir esta simulação?")) return;
                        const ok = await simulatorService.remove(s.id);
                        if (ok) {
                          setSavedSimulations((prev) => prev.filter((x) => x.id !== s.id));
                          toast.success("Simulação excluída.");
                        } else {
                          toast.error("Não foi possível excluir.");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KickoffSimulator;
