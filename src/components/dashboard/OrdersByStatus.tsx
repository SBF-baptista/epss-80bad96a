
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Order } from "@/services/orderService";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface OrdersByStatusProps {
  orders: Order[];
}

const OrdersByStatus = ({ orders }: OrdersByStatusProps) => {
  const statusLabels = {
    novos: "Novos Pedidos",
    producao: "Em Produção", 
    aguardando: "Aguardando Envio",
    enviado: "Enviado",
    standby: "Em Stand-by"
  };

  const statusColors = {
    novos: "#3B82F6",
    producao: "#F59E0B",
    aguardando: "#F97316", 
    enviado: "#10B981",
    standby: "#EF4444"
  };

  const statusData = Object.entries(statusLabels).map(([status, label]) => {
    const count = orders.filter(order => order.status === status).length;
    const percentage = orders.length > 0 ? (count / orders.length * 100).toFixed(1) : 0;
    
    return {
      name: label,
      value: count,
      percentage,
      color: statusColors[status as keyof typeof statusColors]
    };
  }).filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">
            Pedidos: <span className="font-bold">{data.value}</span>
          </p>
          <p className="text-sm">
            Percentual: <span className="font-bold">{data.percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0"></div>
          <span className="truncate">Pedidos por Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-48 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                dataKey="value"
                label={({ percentage }) => `${percentage}%`}
              >
                {statusData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className="text-xs sm:text-sm truncate">{value}</span>}
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 space-y-2">
          {statusData.map((item, index) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span>{item.name}</span>
              </div>
              <div className="flex gap-3">
                <span className="font-medium">{item.value}</span>
                <span className="text-gray-500">{item.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrdersByStatus;
