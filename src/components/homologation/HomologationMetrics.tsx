import { Card, CardContent } from "@/components/ui/card";
import { Link, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import { HomologationCard } from "@/services/homologationService";

interface WorkflowChainItem {
  incoming_processed: boolean | null;
}

interface HomologationMetricsProps {
  cards: HomologationCard[];
  workflowData: WorkflowChainItem[];
}

const HomologationMetrics = ({ cards, workflowData }: HomologationMetricsProps) => {
  const linkedCards = cards.filter(card => card.incoming_vehicle_id).length;
  const cardsWithOrders = cards.filter(card => card.created_order_id).length;
  const homologatedCards = cards.filter(card => card.status === 'homologado').length;
  const totalPendingVehicles = workflowData.filter(item => item.incoming_processed === false).length;

  const metrics = [
    {
      label: "Cards Vinculados",
      value: linkedCards,
      sublabel: `de ${cards.length} totais`,
      icon: Link,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Pedidos Criados",
      value: cardsWithOrders,
      sublabel: "auto. criados",
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Homologados",
      value: homologatedCards,
      sublabel: "aprovados",
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Pendentes",
      value: totalPendingVehicles,
      sublabel: "aguardando",
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground/70">
                  {metric.label}
                </p>
                <p className={`text-2xl md:text-3xl font-bold ${metric.color}`}>
                  {metric.value}
                </p>
                <p className="text-[10px] md:text-xs text-muted-foreground/50">
                  {metric.sublabel}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`h-4 w-4 md:h-5 md:w-5 ${metric.color} opacity-80`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default HomologationMetrics;