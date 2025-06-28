
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Order } from "@/services/orderService";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StandbyAnalysisProps {
  orders: Order[];
}

const StandbyAnalysis = ({ orders }: StandbyAnalysisProps) => {
  const standbyOrders = orders.filter(order => order.status === "standby");
  
  const ordersWithDays = standbyOrders.map(order => ({
    ...order,
    daysInStandby: differenceInDays(new Date(), new Date(order.createdAt))
  })).sort((a, b) => b.daysInStandby - a.daysInStandby);

  const getPriorityColor = (days: number) => {
    if (days >= 7) return "bg-red-100 text-red-800 border-red-200";
    if (days >= 3) return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  };

  const getPriorityIcon = (days: number) => {
    if (days >= 7) return <AlertTriangle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-2 w-2 bg-red-500 rounded-full"></div>
          Análise de Stand-by
          <Badge variant="secondary" className="ml-2">
            {standbyOrders.length} pedidos
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {ordersWithDays.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>Nenhum pedido em stand-by</p>
            </div>
          ) : (
            ordersWithDays.map(order => (
              <div 
                key={order.id} 
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      Pedido {order.number}
                    </span>
                    <Badge className={getPriorityColor(order.daysInStandby)}>
                      {getPriorityIcon(order.daysInStandby)}
                      <span className="ml-1">
                        {order.daysInStandby} {order.daysInStandby === 1 ? 'dia' : 'dias'}
                      </span>
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <span className="font-medium">Criado:</span>{' '}
                      {format(new Date(order.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <p>
                      <span className="font-medium">Configuração:</span>{' '}
                      {order.configurationType}
                    </p>
                    <div className="flex gap-4">
                      <span>
                        <span className="font-medium">Veículos:</span>{' '}
                        {order.vehicles.reduce((sum, v) => sum + v.quantity, 0)}
                      </span>
                      <span>
                        <span className="font-medium">Rastreadores:</span>{' '}
                        {order.trackers.reduce((sum, t) => sum + t.quantity, 0)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-red-600">
                    {order.daysInStandby}
                  </div>
                  <div className="text-xs text-gray-500">
                    {order.daysInStandby === 1 ? 'dia' : 'dias'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {standbyOrders.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-red-600">
                  {ordersWithDays.filter(o => o.daysInStandby >= 7).length}
                </div>
                <div className="text-gray-500">+7 dias</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-orange-600">
                  {ordersWithDays.filter(o => o.daysInStandby >= 3 && o.daysInStandby < 7).length}
                </div>
                <div className="text-gray-500">3-6 dias</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-yellow-600">
                  {ordersWithDays.filter(o => o.daysInStandby < 3).length}
                </div>
                <div className="text-gray-500">0-2 dias</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StandbyAnalysis;
