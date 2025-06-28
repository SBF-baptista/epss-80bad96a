
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Order } from "@/services/orderService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TrackerDistributionProps {
  orders: Order[];
}

const TrackerDistribution = ({ orders }: TrackerDistributionProps) => {
  const trackerStats = orders.reduce((acc, order) => {
    order.trackers.forEach(tracker => {
      if (!acc[tracker.model]) {
        acc[tracker.model] = 0;
      }
      acc[tracker.model] += tracker.quantity;
    });
    return acc;
  }, {} as Record<string, number>);

  const totalTrackers = Object.values(trackerStats).reduce((sum, count) => sum + count, 0);

  const chartData = Object.entries(trackerStats)
    .sort(([, a], [, b]) => b - a)
    .map(([model, quantity]) => ({
      model,
      quantity,
      percentage: totalTrackers > 0 ? ((quantity / totalTrackers) * 100).toFixed(1) : 0
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.model}</p>
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
          <div className="h-2 w-2 bg-indigo-500 rounded-full"></div>
          Distribuição por Rastreador
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="model" 
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="quantity" fill="#6366F1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 space-y-2">
          {chartData.map((item, index) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <span>{item.model}</span>
              <div className="flex gap-3">
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

export default TrackerDistribution;
