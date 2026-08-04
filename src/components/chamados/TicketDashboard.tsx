import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Clock, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TicketRow } from "./TicketManagementTab";
import { CLASSIFICACOES, STATUSES, classConfig, statusConfig } from "./TicketManagementTab";

const SLA_BY_PRIORITY: Record<string, number> = {
  Baixo: 5 * 8,
  "Médio": 3 * 8,
  Alta: 2 * 8,
  "Crítico": 4,
};
const FIRST_RESPONSE_SLA_HOURS = 1;

const COLORS = [
  "#0d9488",
  "#f59e0b",
  "#ef4444",
  "#6366f1",
  "#ec4899",
  "#10b981",
  "#8b5cf6",
  "#f97316",
];

const HOUR = 1000 * 60 * 60;

const formatHours = (hours: number | null) => {
  if (hours === null || Number.isNaN(hours)) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
};

const isClosed = (t: TicketRow) =>
  t.status === "Concluído" || t.status === "Fechado";

const firstResponseHours = (t: TicketRow) =>
  t.tempo_primeiro_atendimento
    ? (new Date(t.tempo_primeiro_atendimento).getTime() -
        new Date(t.data_atendimento).getTime()) /
      HOUR
    : null;

const resolutionHours = (t: TicketRow) =>
  t.data_encerramento
    ? (new Date(t.data_encerramento).getTime() -
        new Date(t.data_atendimento).getTime()) /
      HOUR
    : null;

const openHours = (t: TicketRow) =>
  (Date.now() - new Date(t.data_atendimento).getTime()) / HOUR;

export const calcScore = (t: TicketRow) => {
  let score = 100;

  const fr = firstResponseHours(t);
  if (fr === null) {
    score -= 15;
  } else if (fr > FIRST_RESPONSE_SLA_HOURS) {
    score -= Math.min(30, (fr / FIRST_RESPONSE_SLA_HOURS) * 10);
  }

  const sla = SLA_BY_PRIORITY[t.classificacao] ?? 24;
  const res = resolutionHours(t);
  if (res !== null) {
    if (res > sla) score -= Math.min(40, (res / sla) * 15);
  } else if (openHours(t) > sla) {
    score -= Math.min(40, (openHours(t) / sla) * 15);
  }

  if (t.responsavel_escalonado || t.data_escalonamento) score -= 10;

  return Math.max(0, Math.round(score));
};

const PERIOD_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "15", label: "Últimos 15 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "this-month", label: "Este mês" },
  { value: "last-month", label: "Mês passado" },
  { value: "180", label: "Últimos 6 meses" },
];

interface Props {
  tickets: TicketRow[];
}

const KpiCard = ({
  label,
  value,
  hint,
  valueClass,
}: {
  label: string;
  value: string;
  hint: string;
  valueClass?: string;
}) => (
  <Card>
    <CardContent className="p-4 space-y-1">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[220px]">{hint}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className={`text-2xl font-bold ${valueClass || ""}`}>{value}</p>
    </CardContent>
  </Card>
);

export function TicketDashboard({ tickets }: Props) {
  const [period, setPeriod] = useState("all");
  const [atendente, setAtendente] = useState("all");
  const [produto, setProduto] = useState("all");
  const [status, setStatus] = useState("all");
  const [classificacao, setClassificacao] = useState("all");
  const [canal, setCanal] = useState("all");
  const [companySort, setCompanySort] = useState<"count" | "name">("count");

  const options = useMemo(
    () => ({
      atendentes: [...new Set(tickets.map((t) => t.atendente_suporte))].filter(Boolean),
      produtos: [...new Set(tickets.map((t) => t.produto))].filter(Boolean),
      canais: [...new Set(tickets.map((t) => t.canal_entrada))].filter(Boolean),
    }),
    [tickets]
  );

  const filtered = useMemo(() => {
    let from: Date | null = null;
    let to: Date | null = null;
    const now = new Date();

    if (period === "this-month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "last-month") {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (period !== "all") {
      from = new Date(now.getTime() - Number(period) * 24 * HOUR);
      from.setHours(0, 0, 0, 0);
    }

    return tickets.filter((t) => {
      const d = new Date(t.data_atendimento);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (atendente !== "all" && t.atendente_suporte !== atendente) return false;
      if (produto !== "all" && t.produto !== produto) return false;
      if (status !== "all" && t.status !== status) return false;
      if (classificacao !== "all" && t.classificacao !== classificacao) return false;
      if (canal !== "all" && t.canal_entrada !== canal) return false;
      return true;
    });
  }, [tickets, period, atendente, produto, status, classificacao, canal]);

  const kpis = useMemo(() => {
    const frs = filtered.map(firstResponseHours).filter((v): v is number => v !== null);
    const avgFr = frs.length ? frs.reduce((a, b) => a + b, 0) / frs.length : null;
    const slaOk = frs.filter((v) => v <= FIRST_RESPONSE_SLA_HOURS).length;
    const slaPct = frs.length ? (slaOk / frs.length) * 100 : null;

    const res = filtered.map(resolutionHours).filter((v): v is number => v !== null);
    const avgRes = res.length ? res.reduce((a, b) => a + b, 0) / res.length : null;

    const scores = filtered.map(calcScore);
    const avgScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

    return { avgFr, slaPct, avgRes, avgScore };
  }, [filtered]);

  const statusDistribution = useMemo(
    () =>
      STATUSES.map((s) => ({
        name: s,
        value: filtered.filter((t) => t.status === s).length,
      })).filter((s) => s.value > 0),
    [filtered]
  );

  const slaByPriority = useMemo(
    () =>
      CLASSIFICACOES.map((c) => {
        const items = filtered.filter((t) => t.classificacao === c);
        const sla = SLA_BY_PRIORITY[c];
        const dentro = items.filter((t) => {
          const res = resolutionHours(t);
          return res !== null ? res <= sla : openHours(t) <= sla;
        }).length;
        return {
          classificacao: c,
          sla,
          total: items.length,
          dentro,
          fora: items.length - dentro,
          pct: items.length ? Math.round((dentro / items.length) * 100) : 0,
        };
      }),
    [filtered]
  );

  const byAtendente = useMemo(
    () =>
      options.atendentes.map((a) => ({
        name: a,
        total: filtered.filter((t) => t.atendente_suporte === a).length,
      })),
    [filtered, options.atendentes]
  );

  const byCanal = useMemo(
    () =>
      options.canais.map((c) => ({
        name: c,
        total: filtered.filter((t) => t.canal_entrada === c).length,
      })),
    [filtered, options.canais]
  );

  const byProduto = useMemo(
    () =>
      options.produtos.map((p) => ({
        name: p,
        value: filtered.filter((t) => t.produto === p).length,
      })),
    [filtered, options.produtos]
  );

  const monthly = useMemo(() => {
    const map = new Map<string, { mes: string; abertos: number; resolvidos: number }>();
    filtered.forEach((t) => {
      const key = t.data_atendimento.slice(0, 7);
      if (!map.has(key)) map.set(key, { mes: key, abertos: 0, resolvidos: 0 });
      const row = map.get(key)!;
      row.abertos += 1;
      if (isClosed(t)) row.resolvidos += 1;
    });
    return [...map.values()].sort((a, b) => a.mes.localeCompare(b.mes));
  }, [filtered]);

  const byCompany = useMemo(() => {
    const map = new Map<
      string,
      { cnpj: string; razao_social: string; total: number; porStatus: Record<string, number> }
    >();
    filtered.forEach((t) => {
      if (!map.has(t.cnpj)) {
        map.set(t.cnpj, {
          cnpj: t.cnpj,
          razao_social: t.razao_social,
          total: 0,
          porStatus: {},
        });
      }
      const row = map.get(t.cnpj)!;
      row.total += 1;
      row.porStatus[t.status] = (row.porStatus[t.status] || 0) + 1;
    });
    const rows = [...map.values()];
    return companySort === "count"
      ? rows.sort((a, b) => b.total - a.total)
      : rows.sort((a, b) => a.razao_social.localeCompare(b.razao_social));
  }, [filtered, companySort]);

  const alerts = useMemo(() => {
    const criticos = filtered.filter(
      (t) => !isClosed(t) && (t.classificacao === "Crítico" || t.classificacao === "Alta")
    );
    const foraSla = filtered.filter(
      (t) => !isClosed(t) && openHours(t) > (SLA_BY_PRIORITY[t.classificacao] ?? 24)
    );
    const aguardando = filtered.filter((t) => t.status === "Aguardando Retorno");
    return { criticos, foraSla, aguardando };
  }, [filtered]);

  const scoreClass =
    kpis.avgScore === null
      ? ""
      : kpis.avgScore >= 80
      ? "text-emerald-600"
      : kpis.avgScore >= 60
      ? "text-amber-600"
      : "text-red-600";

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Período", value: period, set: setPeriod, options: PERIOD_OPTIONS },
            {
              label: "Atendente",
              value: atendente,
              set: setAtendente,
              options: [{ value: "all", label: "Todos" }, ...options.atendentes.map((o) => ({ value: o, label: o }))],
            },
            {
              label: "Produto",
              value: produto,
              set: setProduto,
              options: [{ value: "all", label: "Todos" }, ...options.produtos.map((o) => ({ value: o, label: o }))],
            },
            {
              label: "Status",
              value: status,
              set: setStatus,
              options: [{ value: "all", label: "Todos" }, ...STATUSES.map((o) => ({ value: o, label: o }))],
            },
            {
              label: "Classificação",
              value: classificacao,
              set: setClassificacao,
              options: [{ value: "all", label: "Todas" }, ...CLASSIFICACOES.map((o) => ({ value: o, label: o }))],
            },
            {
              label: "Canal",
              value: canal,
              set: setCanal,
              options: [{ value: "all", label: "Todos" }, ...options.canais.map((o) => ({ value: o, label: o }))],
            },
          ].map((f) => (
            <div key={f.label} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              <Select value={f.value} onValueChange={(v) => f.set(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {f.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Total de Chamados"
          value={String(filtered.length)}
          hint="Quantidade de chamados no período e filtros selecionados."
        />
        <KpiCard
          label="Tempo Médio 1º Atend."
          value={formatHours(kpis.avgFr)}
          hint="Média entre a abertura e o primeiro contato do suporte."
        />
        <KpiCard
          label="SLA 1º Atendimento"
          value={kpis.slaPct === null ? "—" : `${kpis.slaPct.toFixed(0)}%`}
          valueClass={
            kpis.slaPct === null
              ? ""
              : kpis.slaPct >= 80
              ? "text-emerald-600"
              : "text-red-600"
          }
          hint="Percentual de chamados com primeira resposta em até 1 hora."
        />
        <KpiCard
          label="Tempo Médio Resolução"
          value={formatHours(kpis.avgRes)}
          hint="Média entre abertura e encerramento dos chamados resolvidos."
        />
        <KpiCard
          label="Score Desempenho"
          value={kpis.avgScore === null ? "—" : String(kpis.avgScore)}
          valueClass={scoreClass}
          hint="Nota 0–100 penalizada por atraso no 1º atendimento, estouro de SLA e escalonamento."
        />
      </div>

      {/* Distribuição por status + SLA por prioridade */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {statusDistribution.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <Badge variant="outline" className={statusConfig[s.name]}>
                  {s.name}
                </Badge>
                <span className="text-muted-foreground">
                  {s.value} ({filtered.length ? Math.round((s.value / filtered.length) * 100) : 0}%)
                </span>
              </div>
            ))}
            {statusDistribution.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">SLA por Prioridade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {slaByPriority.map((s) => (
              <div key={s.classificacao} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={classConfig[s.classificacao]}>
                    {s.classificacao}
                  </Badge>
                  <span className="text-xs text-muted-foreground">SLA {s.sla}h</span>
                </div>
                <span className="text-muted-foreground">
                  {s.total} chamados · {s.dentro} dentro / {s.fora} fora ·{" "}
                  <span className={s.pct >= 80 ? "text-emerald-600" : "text-red-600"}>
                    {s.pct}%
                  </span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Chamados por Atendente</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byAtendente}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <RTooltip />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {byAtendente.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status (donut)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                >
                  {statusDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Chamados por Canal</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCanal}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <RTooltip />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {byCanal.map((_, i) => (
                    <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Chamados por Produto</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byProduto} dataKey="value" nameKey="name" outerRadius={80}>
                  {byProduto.map((_, i) => (
                    <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Evolução Mensal</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <RTooltip />
              <Legend />
              <Line type="monotone" dataKey="abertos" stroke="#0d9488" name="Abertos" />
              <Line type="monotone" dataKey="resolvidos" stroke="#f59e0b" name="Resolvidos" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chamados por Empresa */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Chamados por Empresa</CardTitle>
          <Select value={companySort} onValueChange={(v) => setCompanySort(v as "count" | "name")}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Mais chamados</SelectItem>
              <SelectItem value="name">Nome (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background border-b">
                <tr className="text-left">
                  <th className="p-3">Empresa</th>
                  <th className="p-3">CNPJ</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Por status</th>
                </tr>
              </thead>
              <tbody>
                {byCompany.map((c) => (
                  <tr key={c.cnpj} className="border-b">
                    <td className="p-3 font-medium">{c.razao_social}</td>
                    <td className="p-3 text-muted-foreground">{c.cnpj}</td>
                    <td className="p-3">{c.total}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(c.porStatus).map(([s, n]) => (
                          <Badge key={s} variant="outline" className={statusConfig[s]}>
                            {s}: {n}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {byCompany.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      Sem dados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {(alerts.criticos.length > 0 ||
        alerts.foraSla.length > 0 ||
        alerts.aguardando.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Painel de Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {alerts.criticos.length > 0 && (
              <div className="space-y-1">
                <p className="font-medium text-red-600">
                  🔴 Críticos / Alta prioridade em aberto ({alerts.criticos.length})
                </p>
                {alerts.criticos.map((t) => (
                  <p key={t.id} className="text-muted-foreground">
                    {t.razao_social} · {t.classificacao} · {t.status}
                  </p>
                ))}
              </div>
            )}
            {alerts.foraSla.length > 0 && (
              <div className="space-y-1">
                <p className="font-medium text-orange-600">
                  🟠 Fora do SLA ({alerts.foraSla.length})
                </p>
                {alerts.foraSla.map((t) => (
                  <p key={t.id} className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t.razao_social} · aberto há {formatHours(openHours(t))}
                  </p>
                ))}
              </div>
            )}
            {alerts.aguardando.length > 0 && (
              <div className="space-y-1">
                <p className="font-medium text-blue-600">
                  🔵 Aguardando retorno ({alerts.aguardando.length})
                </p>
                {alerts.aguardando.map((t) => (
                  <p key={t.id} className="text-muted-foreground">
                    {t.razao_social} · responsável: {t.atendente_suporte}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TicketDashboard;
