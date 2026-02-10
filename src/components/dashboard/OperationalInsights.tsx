
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Order } from "@/services/orderService";
import { Lightbulb, AlertTriangle, Clock, TrendingDown, CheckCircle } from "lucide-react";

interface OperationalInsightsProps {
  orders: Order[];
}

const OperationalInsights = ({ orders }: OperationalInsightsProps) => {
  const total = orders.length;
  if (total === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Insights da Operação
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground text-center py-4">Sem dados suficientes para gerar insights.</p>
        </CardContent>
      </Card>
    );
  }

  const standby = orders.filter(o => o.status === "standby").length;
  const producao = orders.filter(o => o.status === "producao").length;
  const aguardando = orders.filter(o => o.status === "aguardando").length;
  const enviado = orders.filter(o => o.status === "enviado").length;

  const avgDays = orders.reduce((sum, o) => sum + Math.floor((Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24)), 0) / total;
  const sla = 7;

  type InsightItem = {
    icon: React.ElementType;
    text: string;
    type: "warning" | "danger" | "success" | "info";
  };

  const insights: InsightItem[] = [];

  if (standby > 0 && (standby / total) > 0.1) {
    insights.push({
      icon: AlertTriangle,
      text: `${((standby / total) * 100).toFixed(0)}% dos pedidos estão em stand-by — principal gargalo operacional.`,
      type: "warning"
    });
  }

  if (producao > 0 && (producao / total) > 0.3) {
    insights.push({
      icon: Clock,
      text: `${((producao / total) * 100).toFixed(0)}% dos pedidos estão parados na etapa de logística.`,
      type: "warning"
    });
  }

  if (avgDays > sla) {
    insights.push({
      icon: TrendingDown,
      text: `Tempo médio de atendimento acima do SLA em ${(avgDays - sla).toFixed(1)} dias.`,
      type: "danger"
    });
  }

  if (enviado > 0 && (enviado / total) > 0.5) {
    insights.push({
      icon: CheckCircle,
      text: `${((enviado / total) * 100).toFixed(0)}% dos pedidos já foram enviados — boa taxa de conclusão.`,
      type: "success"
    });
  }

  if (aguardando > 0 && (aguardando / total) > 0.15) {
    insights.push({
      icon: Clock,
      text: `${aguardando} pedidos aguardando envio — considere priorizar expedição.`,
      type: "info"
    });
  }

  if (insights.length === 0) {
    insights.push({
      icon: CheckCircle,
      text: "Operação dentro dos parâmetros esperados. Sem alertas no momento.",
      type: "success"
    });
  }

  const typeStyles: Record<string, string> = {
    warning: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40",
    danger: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/40",
    success: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40",
    info: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/40",
  };

  const iconStyles: Record<string, string> = {
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-red-600 dark:text-red-400",
    success: "text-emerald-600 dark:text-emerald-400",
    info: "text-blue-600 dark:text-blue-400",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Insights da Operação
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {insights.map((insight, i) => (
          <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${typeStyles[insight.type]}`}>
            <insight.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconStyles[insight.type]}`} />
            <p className="text-xs text-foreground leading-relaxed">{insight.text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default OperationalInsights;
