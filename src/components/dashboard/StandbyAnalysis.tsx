
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Order } from "@/services/orderService";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Package } from "lucide-react";
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

  const getPriorityStyle = (days: number) => {
    if (days >= 7) return "border-l-red-500 bg-red-50/50 dark:bg-red-950/10";
    if (days >= 3) return "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/10";
    return "border-l-muted-foreground/30 bg-muted/20";
  };

  const getDaysBadge = (days: number) => {
    if (days >= 7) return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800/40";
    if (days >= 3) return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/40";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">Análise de Stand-by</CardTitle>
          {standbyOrders.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5">{standbyOrders.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {ordersWithDays.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-950/20 mb-3">
              <Package className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-xs text-muted-foreground">Nenhum pedido em stand-by</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Todos os pedidos estão fluindo normalmente.</p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {ordersWithDays.slice(0, 8).map(order => (
                <div
                  key={order.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border-l-[3px] border border-border/50 transition-colors hover:bg-muted/20 cursor-default ${getPriorityStyle(order.daysInStandby)}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">Pedido {order.number}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{order.configurationType}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] h-5 ml-2 flex-shrink-0 ${getDaysBadge(order.daysInStandby)}`}>
                    {order.daysInStandby}d
                  </Badge>
                </div>
              ))}
            </div>

            {standbyOrders.length > 0 && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" /> Crítico (&gt;7d): {ordersWithDays.filter(o => o.daysInStandby >= 7).length}</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" /> Atenção (3-6d): {ordersWithDays.filter(o => o.daysInStandby >= 3 && o.daysInStandby < 7).length}</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-muted-foreground/30" /> Recente: {ordersWithDays.filter(o => o.daysInStandby < 3).length}</div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StandbyAnalysis;
