
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Order } from "@/services/orderService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ConfigurationTypesProps {
  orders: Order[];
}

const ConfigurationTypes = ({ orders }: ConfigurationTypesProps) => {
  const configStats = orders.reduce((acc, order) => {
    if (!acc[order.configurationType]) {
      acc[order.configurationType] = 0;
    }
    acc[order.configurationType]++;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(configStats)
    .sort(([, a], [, b]) => b - a)
    .map(([config, count]) => ({
      config,
      count,
      percentage: orders.length > 0 ? ((count / orders.length) * 100).toFixed(1) : 0
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.config}</p>
          <p className="text-sm">
            Pedidos: <span className="font-bold">{data.count}</span>
          </p>
          <p className="text-sm">
            Participação: <span className="font-bold">{data.percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-2 w-2 bg-pink-500 rounded-full"></div>
          Tipos de Configuração
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="config" 
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#EC4899" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 space-y-2">
          {chartData.map((item, index) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <span className="truncate">{item.config}</span>
              <div className="flex gap-3 ml-2">
                <span className="font-medium">{item.count}</span>
                <span className="text-gray-500">{item.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfigurationTypes;
