
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Order } from "@/pages/Kanban";

interface OrderCardProps {
  order: Order;
  onClick: () => void;
  onDragStart: () => void;
}

const OrderCard = ({ order, onClick, onDragStart }: OrderCardProps) => {
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
            {order.priority && (
              <Badge className={`text-xs ${getPriorityColor(order.priority)}`}>
                {getPriorityLabel(order.priority)}
              </Badge>
            )}
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Marca:</span>
              <span className="font-medium text-gray-900">{order.brand}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Modelo:</span>
              <span className="font-medium text-gray-900">{order.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rastreador:</span>
              <span className="font-medium text-gray-900">{order.tracker}</span>
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
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderCard;
