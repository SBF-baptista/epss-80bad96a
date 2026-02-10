
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Order } from "@/services/orderService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";

interface TrackerDistributionProps {
  orders: Order[];
}

const TrackerDistribution = ({ orders }: TrackerDistributionProps) => {
  const trackerStats = orders.reduce((acc, order) => {
    order.trackers.forEach(tracker => {
      if (!acc[tracker.model]) acc[tracker.model] = 0;
      acc[tracker.model] += tracker.quantity;
    });
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(trackerStats)
    .sort(([, a], [, b]) => b - a)
    .map(([model, quantity]) => ({ model, quantity }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover text-popover-foreground p-2 border rounded-lg shadow-lg text-xs">
          <p className="font-semibold">{payload[0].payload.model}</p>
          <p>Quantidade: <span className="font-bold">{payload[0].value}</span></p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-foreground">Rastreadores por Modelo</CardTitle></CardHeader>
        <CardContent className="pt-0 flex flex-col items-center justify-center h-40">
          <Activity className="h-5 w-5 text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">Sem dados no período.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">Rastreadores por Modelo</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 0, right: 5, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="model" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="quantity" fill="hsl(240, 60%, 60%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrackerDistribution;
