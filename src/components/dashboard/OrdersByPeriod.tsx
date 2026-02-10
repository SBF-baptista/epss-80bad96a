
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Order } from "@/services/orderService";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrdersByPeriodProps {
  orders: Order[];
  dateRange: { from: Date; to: Date };
}

const OrdersByPeriod = ({ orders, dateRange }: OrdersByPeriodProps) => {
  const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

  const chartData = days.map(day => {
    const dayOrders = orders.filter(order => isSameDay(new Date(order.createdAt), day));
    return {
      date: format(day, "dd/MM", { locale: ptBR }),
      fullDate: format(day, "dd 'de' MMMM", { locale: ptBR }),
      total: dayOrders.length,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover text-popover-foreground p-2.5 border rounded-lg shadow-lg text-xs">
          <p className="font-semibold mb-1">{data.fullDate}</p>
          <p>Total: <span className="font-bold">{data.total}</span> pedidos</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">Volume por Período</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: 0, right: 5, top: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(214, 90%, 50%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(214, 90%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(214, 90%, 50%)"
                strokeWidth={2}
                fill="url(#colorTotal)"
                dot={false}
                activeDot={{ r: 4, fill: "hsl(214, 90%, 50%)", stroke: "hsl(var(--card))", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrdersByPeriod;
