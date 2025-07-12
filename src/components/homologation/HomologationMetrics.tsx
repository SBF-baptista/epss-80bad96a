import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, TrendingUp } from "lucide-react";
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

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Cards Vinculados</CardTitle>
          <Link className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg md:text-2xl font-bold text-blue-600">{linkedCards}</div>
          <p className="text-xs text-muted-foreground">
            de {cards.length} totais
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Pedidos Criados</CardTitle>
          <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg md:text-2xl font-bold text-green-600">{cardsWithOrders}</div>
          <p className="text-xs text-muted-foreground">
            auto. criados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Homologados</CardTitle>
          <div className="h-3 w-3 md:h-4 md:w-4 bg-green-500 rounded-full" />
        </CardHeader>
        <CardContent>
          <div className="text-lg md:text-2xl font-bold text-green-600">{homologatedCards}</div>
          <p className="text-xs text-muted-foreground">
            aprovados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Pendentes</CardTitle>
          <div className="h-3 w-3 md:h-4 md:w-4 bg-yellow-500 rounded-full" />
        </CardHeader>
        <CardContent>
          <div className="text-lg md:text-2xl font-bold text-yellow-600">{totalPendingVehicles}</div>
          <p className="text-xs text-muted-foreground">
            aguardando
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomologationMetrics;