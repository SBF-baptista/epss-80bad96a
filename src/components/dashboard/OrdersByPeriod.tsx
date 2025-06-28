
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Order } from "@/services/orderService";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrdersByPeriodProps {
  orders: Order[];
  dateRange: { from: Date; to: Date };
}

const OrdersByPeriod = ({ orders, dateRange }: OrdersByPeriodProps) => {
  const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
  
  const chartData = days.map(day => {
    const dayOrders = orders.filter(order => 
      isSameDay(new Date(order.createdAt), day)
    );
    
    return {
      date: format(day, "dd/MM", { locale: ptBR }),
      fullDate: format(day, "dd 'de' MMMM", { locale: ptBR }),
      total: dayOrders.length,
      novos: dayOrders.filter(o => o.status === "novos").length,
      producao: dayOrders.filter(o => o.status === "producao").length,
      aguardando: dayOrders.filter(o => o.status === "aguardando").length,
      enviado: dayOrders.filter(o => o.status === "enviado").length,
      standby: dayOrders.filter(o => o.status === "standby").length
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{data.fullDate}</p>
          <div className="space-y-1 text-sm">
            <p>Total: <span className="font-bold">{data.total}</span></p>
            {data.novos > 0 && <p>Novos: <span className="font-bold text-blue-600">{data.novos}</span></p>}
            {data.producao > 0 && <p>Produção: <span className="font-bold text-yellow-600">{data.producao}</span></p>}
            {data.aguardando > 0 && <p>Aguardando: <span className="font-bold text-orange-600">{data.aguardando}</span></p>}
            {data.enviado > 0 && <p>Enviado: <span className="font-bold text-green-600">{data.enviado}</span></p>}
            {data.standby > 0 && <p>Stand-by: <span className="font-bold text-red-600">{data.standby}</span></p>}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          Pedidos por Período
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrdersByPeriod;
