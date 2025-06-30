
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Order } from "@/services/orderService";
import { Scan } from "lucide-react";

interface OrderCardProps {
  order: Order;
  onClick: () => void;
  onDragStart: () => void;
  onScanClick?: () => void;
}

const OrderCard = ({ order, onClick, onDragStart, onScanClick }: OrderCardProps) => {
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case "high":
        return "Alta";
      case "medium":
        return "Média";
      case "low":
        return "Baixa";
      default:
        return "Normal";
    }
  };

  const isStandby = order.status === "standby";
  const isInProduction = order.status === "producao";

  const totalVehicles = order.vehicles.reduce((sum, vehicle) => sum + vehicle.quantity, 0);
  const totalTrackers = order.trackers.reduce((sum, tracker) => sum + tracker.quantity, 0);

  const handleScanClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onScanClick?.();
  };

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] ${
        isStandby ? "border-red-300 bg-red-50" : ""
      }`}
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <h4 className="font-semibold text-gray-900">
              Pedido de instalação {order.number}
            </h4>
            <div className="flex items-center gap-2">
              {order.priority && (
                <Badge className={`text-xs ${getPriorityColor(order.priority)}`}>
                  {getPriorityLabel(order.priority)}
                </Badge>
              )}
              {isInProduction && onScanClick && (
                <button
                  onClick={handleScanClick}
                  className="p-1 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                  title="Abrir Scanner de Produção"
                >
                  <Scan className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600 font-medium">Veículos ({totalVehicles}):</span>
              <div className="mt-1 space-y-1">
                {order.vehicles.map((vehicle, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-gray-700">{vehicle.brand} {vehicle.model}</span>
                    <span className="font-medium">{vehicle.quantity}x</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <span className="text-gray-600 font-medium">Rastreadores ({totalTrackers}):</span>
              <div className="mt-1 space-y-1">
                {order.trackers.map((tracker, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-gray-700">{tracker.model}</span>
                    <span className="font-medium">{tracker.quantity}x</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Configuração:</span>
              <span className="font-medium text-gray-900">{order.configurationType}</span>
            </div>
          </div>

          {isStandby && (
            <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded-md">
              <p className="text-xs text-red-800 font-medium">⚠️ Em Stand-by</p>
            </div>
          )}

          {isInProduction && (
            <div className="mt-3 p-2 bg-blue-100 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-800 font-medium">🔧 Em Produção</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderCard;
