
import { Card, CardContent } from "@/components/ui/card";
import { Order } from "@/services/orderService";
import { Calendar, CheckCircle, Clock, AlertTriangle, Activity } from "lucide-react";

interface DashboardKPIsProps {
  orders: Order[];
}

const DashboardKPIs = ({ orders }: DashboardKPIsProps) => {
  const totalOrders = orders.length;
  const completedOrders = orders.filter(order => order.status === "enviado").length;
  const standbyOrders = orders.filter(order => order.status === "standby").length;
  
  const completedPercentage = totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(1) : 0;
  const standbyPercentage = totalOrders > 0 ? (standbyOrders / totalOrders * 100).toFixed(1) : 0;
  
  const totalTrackers = orders.reduce((sum, order) => 
    sum + order.trackers.reduce((trackSum, tracker) => trackSum + tracker.quantity, 0), 0
  );
  const avgTrackersPerOrder = totalOrders > 0 ? (totalTrackers / totalOrders).toFixed(1) : 0;

  const kpis = [
    {
      title: "Total de Pedidos",
      value: totalOrders.toLocaleString(),
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Pedidos Concluídos",
      value: `${completedPercentage}%`,
      subtitle: `${completedOrders} pedidos`,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Em Stand-by",
      value: `${standbyPercentage}%`,
      subtitle: `${standbyOrders} pedidos`,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-100"
    },
    {
      title: "Tempo Médio",
      value: "5.2 dias",
      subtitle: "Por pedido",
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    },
    {
      title: "Rastreadores/Pedido",
      value: avgTrackersPerOrder,
      subtitle: "Média",
      icon: Activity,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {kpis.map((kpi, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                {kpi.subtitle && (
                  <p className="text-xs text-gray-500 mt-1">{kpi.subtitle}</p>
                )}
              </div>
              <div className={`p-3 rounded-full ${kpi.bgColor}`}>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardKPIs;
