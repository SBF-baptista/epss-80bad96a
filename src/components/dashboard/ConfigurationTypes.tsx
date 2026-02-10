
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Order } from "@/services/orderService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Settings } from "lucide-react";

interface ConfigurationTypesProps {
  orders: Order[];
}

const ConfigurationTypes = ({ orders }: ConfigurationTypesProps) => {
  const configStats = orders.reduce((acc, order) => {
    if (!acc[order.configurationType]) acc[order.configurationType] = 0;
    acc[order.configurationType]++;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(configStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([config, count]) => ({ config, count }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover text-popover-foreground p-2 border rounded-lg shadow-lg text-xs">
          <p className="font-semibold">{payload[0].payload.config}</p>
          <p>Pedidos: <span className="font-bold">{payload[0].value}</span></p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-foreground">Tipos de Configuração</CardTitle></CardHeader>
        <CardContent className="pt-0 flex flex-col items-center justify-center h-40">
          <Settings className="h-5 w-5 text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">Sem dados no período.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">Tipos de Configuração</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 5, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="config" type="category" width={100} tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="hsl(330, 60%, 55%)" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfigurationTypes;
