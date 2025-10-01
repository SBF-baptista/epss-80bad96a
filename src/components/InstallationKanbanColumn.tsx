import { Card } from "@/components/ui/card";
import { InstallationOrder } from "@/types/installationOrder";
import { Badge } from "@/components/ui/badge";
import { User, Calendar } from "lucide-react";

interface InstallationKanbanColumnProps {
  title: string;
  orders: InstallationOrder[];
  color: string;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onOrderClick: (order: InstallationOrder) => void;
  onDragStart: (order: InstallationOrder) => void;
}

const InstallationKanbanColumn = ({
  title,
  orders,
  color,
  onDragOver,
  onDrop,
  onOrderClick,
  onDragStart
}: InstallationKanbanColumnProps) => {
  // Group orders by customer
  const groupedOrders = orders.reduce((acc, order) => {
    const key = order.customerName;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(order);
    return acc;
  }, {} as Record<string, InstallationOrder[]>);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base md:text-lg">{title}</h3>
        <Badge variant="secondary" className="text-xs md:text-sm">
          {orders.length}
        </Badge>
      </div>
      
      <Card
        className={`p-3 md:p-4 ${color} border-2 min-h-[400px] md:min-h-[500px]`}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="space-y-3">
          {Object.entries(groupedOrders).map(([customerName, customerOrders]) => (
            <div key={customerName} className="space-y-2">
              {customerOrders.map((order) => (
                <div
                  key={order.id}
                  draggable
                  onDragStart={() => onDragStart(order)}
                  onClick={() => onOrderClick(order)}
                  className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-move hover:border-primary/50 space-y-3"
                >
                  {/* Customer Name - Title */}
                  <div>
                    <h4 className="font-semibold text-base text-gray-900">
                      {order.customerName}
                    </h4>
                  </div>

                  {/* Technician */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span>{order.technicianName}</span>
                  </div>

                  {/* Scheduled Date */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(order.scheduledDate).toLocaleDateString('pt-BR')}</span>
                  </div>

                  {/* Vehicle Info */}
                  {order.vehicleBrand && order.vehicleModel && (
                    <div className="text-sm text-gray-700 font-medium">
                      {order.vehicleBrand} {order.vehicleModel}
                      {order.vehicleYear && ` - ${order.vehicleYear}`}
                    </div>
                  )}

                  {/* Configuration */}
                  {order.configuration && (
                    <Badge variant="outline" className="text-xs">
                      {order.configuration}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ))}
          
          {orders.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">Nenhum pedido nesta etapa</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default InstallationKanbanColumn;
