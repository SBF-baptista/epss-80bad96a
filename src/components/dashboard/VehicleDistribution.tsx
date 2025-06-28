
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Order } from "@/services/orderService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface VehicleDistributionProps {
  orders: Order[];
}

const VehicleDistribution = ({ orders }: VehicleDistributionProps) => {
  const vehicleStats = orders.reduce((acc, order) => {
    order.vehicles.forEach(vehicle => {
      const key = `${vehicle.brand} ${vehicle.model}`;
      if (!acc[key]) {
        acc[key] = { brand: vehicle.brand, model: vehicle.model, quantity: 0 };
      }
      acc[key].quantity += vehicle.quantity;
    });
    return acc;
  }, {} as Record<string, { brand: string; model: string; quantity: number }>);

  const chartData = Object.values(vehicleStats)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)
    .map(item => ({
      name: `${item.brand} ${item.model}`,
      brand: item.brand,
      model: item.model,
      quantity: item.quantity,
      percentage: orders.length > 0 ? 
        ((item.quantity / orders.reduce((sum, order) => 
          sum + order.vehicles.reduce((vSum, v) => vSum + v.quantity, 0), 0)) * 100).toFixed(1) : 0
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">
            Quantidade: <span className="font-bold">{data.quantity}</span>
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
          <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
          Distribuição por Veículo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="quantity" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
          {chartData.map((item, index) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <span className="truncate">{item.name}</span>
              <div className="flex gap-3 ml-2">
                <span className="font-medium">{item.quantity}</span>
                <span className="text-gray-500">{item.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleDistribution;
