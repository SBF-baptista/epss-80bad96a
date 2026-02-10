
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Order } from "@/services/orderService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Car } from "lucide-react";

interface VehicleDistributionProps {
  orders: Order[];
}

const VehicleDistribution = ({ orders }: VehicleDistributionProps) => {
  const vehicleStats = orders.reduce((acc, order) => {
    order.vehicles.forEach(vehicle => {
      const key = vehicle.brand;
      if (!acc[key]) acc[key] = 0;
      acc[key] += vehicle.quantity;
    });
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(vehicleStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([brand, quantity]) => ({ brand, quantity }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover text-popover-foreground p-2 border rounded-lg shadow-lg text-xs">
          <p className="font-semibold">{payload[0].payload.brand}</p>
          <p>Quantidade: <span className="font-bold">{payload[0].value}</span></p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-foreground">Veículos por Marca</CardTitle></CardHeader>
        <CardContent className="pt-0 flex flex-col items-center justify-center h-40">
          <Car className="h-5 w-5 text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">Sem dados no período.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">Veículos por Marca</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 0, right: 5, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="brand" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="quantity" fill="hsl(260, 60%, 58%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleDistribution;
