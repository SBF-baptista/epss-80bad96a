
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Order } from "@/services/orderService";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from "recharts";

interface OrdersByStatusProps {
  orders: Order[];
}

const OrdersByStatus = ({ orders }: OrdersByStatusProps) => {
  const statusLabels: Record<string, string> = {
    novos: "Novos Pedidos",
    producao: "Em Produção",
    aguardando: "Aguardando Envio",
    enviado: "Enviado",
    standby: "Em Stand-by"
  };

  const statusColors: Record<string, string> = {
    novos: "hsl(214, 90%, 50%)",
    producao: "hsl(38, 92%, 50%)",
    aguardando: "hsl(25, 95%, 53%)",
    enviado: "hsl(152, 69%, 41%)",
    standby: "hsl(0, 84%, 60%)"
  };

  const statusData = Object.entries(statusLabels).map(([status, label]) => {
    const count = orders.filter(order => order.status === status).length;
    const percentage = orders.length > 0 ? (count / orders.length * 100).toFixed(1) : "0";
    return { name: label, status, value: count, percentage, color: statusColors[status] };
  }).filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover text-popover-foreground p-2.5 border rounded-lg shadow-lg text-xs">
          <p className="font-semibold">{data.name}</p>
          <p>Pedidos: <span className="font-bold">{data.value}</span></p>
          <p>Percentual: <span className="font-bold">{data.percentage}%</span></p>
        </div>
      );
    }
    return null;
  };

  if (statusData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">Pedidos por Status</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex items-center justify-center h-48">
          <p className="text-xs text-muted-foreground">Sem dados no período.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">Pedidos por Status</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4">
          <div className="h-44 w-44 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={64}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="hsl(var(--card))"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <RTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {statusData.map((item, index) => (
              <div key={index} className="flex items-center justify-between group cursor-default hover:bg-muted/30 rounded-md px-2 py-1 -mx-2 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">{item.value}</span>
                  <span className="text-[10px] text-muted-foreground">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrdersByStatus;
