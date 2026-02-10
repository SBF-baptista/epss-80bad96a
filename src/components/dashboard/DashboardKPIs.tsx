
import { Card, CardContent } from "@/components/ui/card";
import { Order } from "@/services/orderService";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Package, CheckCircle, AlertTriangle, Clock, Activity, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";

interface DashboardKPIsProps {
  orders: Order[];
}

const DashboardKPIs = ({ orders }: DashboardKPIsProps) => {
  const totalOrders = orders.length;
  const completedOrders = orders.filter(order => order.status === "enviado").length;
  const standbyOrders = orders.filter(order => order.status === "standby").length;
  const inProductionOrders = orders.filter(order => order.status === "producao").length;
  const waitingOrders = orders.filter(order => order.status === "aguardando").length;

  const completedPercentage = totalOrders > 0 ? (completedOrders / totalOrders * 100) : 0;
  const standbyPercentage = totalOrders > 0 ? (standbyOrders / totalOrders * 100) : 0;

  // Simulated delayed orders (orders in production or waiting for more than 5 days)
  const delayedOrders = orders.filter(order => {
    if (order.status === "producao" || order.status === "aguardando") {
      const days = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      return days > 5;
    }
    return false;
  });
  const delayedPercentage = totalOrders > 0 ? (delayedOrders.length / totalOrders * 100) : 0;

  const totalTrackers = orders.reduce((sum, order) =>
    sum + order.trackers.reduce((trackSum, tracker) => trackSum + tracker.quantity, 0), 0
  );
  const avgTrackersPerOrder = totalOrders > 0 ? (totalTrackers / totalOrders) : 0;

  // Average time (simulated based on order age)
  const avgDays = totalOrders > 0
    ? orders.reduce((sum, order) => {
        return sum + Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      }, 0) / totalOrders
    : 0;
  const slaTarget = 7;

  const TrendBadge = ({ value, inverse = false }: { value: number; inverse?: boolean }) => {
    const isPositive = inverse ? value < 0 : value > 0;
    const isNeutral = value === 0;
    const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
    const color = isNeutral
      ? "text-muted-foreground bg-muted/50"
      : isPositive
        ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40"
        : "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/40";
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${color}`}>
        <Icon className="h-3 w-3" />
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  const kpis = [
    {
      title: "Total de Pedidos",
      value: totalOrders.toLocaleString(),
      subtitle: "no período selecionado",
      trend: 5.2,
      icon: Package,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      tooltip: "Quantidade total de pedidos criados no período filtrado."
    },
    {
      title: "Pedidos Concluídos",
      value: `${completedPercentage.toFixed(1)}%`,
      subtitle: `${completedOrders} pedidos enviados`,
      trend: 2.1,
      icon: CheckCircle,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      tooltip: "Percentual de pedidos com status 'Enviado' no período."
    },
    {
      title: "Em Stand-by",
      value: standbyOrders.toString(),
      subtitle: `${standbyPercentage.toFixed(1)}% do total`,
      trend: -3.4,
      trendInverse: true,
      icon: AlertTriangle,
      iconBg: "bg-amber-50 dark:bg-amber-950/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      tooltip: "Pedidos parados aguardando resolução. Principais causas: falta de kit, pendência de homologação."
    },
    {
      title: "Pedidos Atrasados",
      value: delayedOrders.length.toString(),
      subtitle: `${delayedPercentage.toFixed(1)}% acima do SLA`,
      trend: -1.8,
      trendInverse: true,
      icon: AlertCircle,
      iconBg: delayedOrders.length > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-emerald-50 dark:bg-emerald-950/30",
      iconColor: delayedOrders.length > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
      highlight: delayedOrders.length > 0,
      tooltip: "Pedidos com mais de 5 dias em produção ou aguardando envio."
    },
    {
      title: "Tempo Médio",
      value: `${avgDays.toFixed(1)}d`,
      subtitle: avgDays > slaTarget ? `SLA: ${slaTarget}d — acima` : `SLA: ${slaTarget}d — dentro`,
      trend: avgDays > slaTarget ? -(avgDays - slaTarget) : 0,
      trendInverse: true,
      icon: Clock,
      iconBg: avgDays > slaTarget ? "bg-amber-50 dark:bg-amber-950/30" : "bg-emerald-50 dark:bg-emerald-950/30",
      iconColor: avgDays > slaTarget ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
      tooltip: `Tempo médio de atendimento dos pedidos. Meta SLA: ${slaTarget} dias.`
    },
    {
      title: "Rastreadores/Pedido",
      value: avgTrackersPerOrder.toFixed(1),
      subtitle: `${totalTrackers} rastreadores total`,
      trend: 0,
      icon: Activity,
      iconBg: "bg-violet-50 dark:bg-violet-950/30",
      iconColor: "text-violet-600 dark:text-violet-400",
      tooltip: "Média de rastreadores por pedido. Valores fora do padrão podem indicar erro de cadastro."
    }
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Card className={`group cursor-default transition-all hover:shadow-md ${kpi.highlight ? 'border-red-200 dark:border-red-800/50 ring-1 ring-red-100 dark:ring-red-900/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${kpi.iconBg}`}>
                      <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
                    </div>
                    <TrendBadge value={kpi.trend} inverse={kpi.trendInverse} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground tracking-tight">{kpi.value}</p>
                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5 uppercase tracking-wider">{kpi.title}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1 truncate">{kpi.subtitle}</p>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px] text-xs">
              {kpi.tooltip}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default DashboardKPIs;
