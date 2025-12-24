import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Order } from "@/services/orderService";
import { Scan, Truck } from "lucide-react";

// Utility to remove quantity pattern like "(1x)" or "(2x)" from item names
const cleanItemName = (name: string): string => {
  return name.replace(/\s*\(\d+x\)\s*$/i, '').trim();
};
interface OrderCardProps {
  order: Order;
  onClick: () => void;
  onDragStart: () => void;
  onScanClick?: () => void;
  onShipmentClick?: () => void;
}

const OrderCard = ({ order, onClick, onDragStart, onScanClick, onShipmentClick }: OrderCardProps) => {
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "bg-error-light text-error border-error-border";
      case "medium":
        return "bg-warning-light text-warning border-warning-border";
      case "low":
        return "bg-success-light text-success border-success-border";
      default:
        return "bg-muted text-muted-foreground border-border";
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
  const isAwaitingShipment = order.status === "aguardando";
  const isShipped = order.status === "enviado";

  const totalVehicles = order.vehicles.reduce((sum, vehicle) => sum + vehicle.quantity, 0);
  const totalTrackers = order.trackers.reduce((sum, tracker) => sum + tracker.quantity, 0);

  const handleScanClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onScanClick?.();
  };

  const handleShipmentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShipmentClick?.();
  };

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] ${
        isStandby ? "border-error bg-error-light" : ""
      }`}
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-foreground">
                {order.company_name || 'Cliente'}
              </h4>
              {order.technicianName && (
                <p className="text-sm text-muted-foreground mt-1">
                  Técnico: {order.technicianName}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {order.priority && (
                <Badge className={`text-xs ${getPriorityColor(order.priority)}`}>
                  {getPriorityLabel(order.priority)}
                </Badge>
              )}
              {isInProduction && onScanClick && (
                <button
                  onClick={handleScanClick}
                  className="p-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  title="Abrir Scanner de Produção"
                >
                  <Scan className="h-4 w-4" />
                </button>
              )}
              {(isAwaitingShipment || isShipped) && onShipmentClick && (
                <button
                  onClick={handleShipmentClick}
                  className="p-2 rounded-md bg-warning text-warning-foreground hover:bg-warning/90 transition-colors shadow-sm"
                  title={isShipped ? "Ver Informações de Envio" : "Preparar Envio"}
                >
                  <Truck className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground font-medium">Veículos ({totalVehicles}):</span>
              <div className="mt-1 space-y-1">
                {order.vehicles.map((vehicle, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-foreground">{vehicle.brand} {vehicle.model}</span>
                    <span className="font-medium">{vehicle.quantity}x</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <span className="text-muted-foreground font-medium">Rastreadores ({totalTrackers}):</span>
              <div className="mt-1 space-y-1">
                {order.trackers.map((tracker, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-foreground">{cleanItemName(tracker.model)}</span>
                    <span className="font-medium">{tracker.quantity}x</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <span className="text-muted-foreground font-medium">Acessórios:</span>
              {order.accessories && order.accessories.length > 0 ? (
                <div className="mt-1 space-y-1">
                  {order.accessories.map((accessory, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-foreground">{cleanItemName(accessory.name)}</span>
                      <span className="font-medium">{accessory.quantity}x</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-1">
                  <span className="text-xs text-muted-foreground italic">Sem acessórios</span>
                </div>
              )}
            </div>
            
          </div>

          {isStandby && (
            <div className="mt-3 p-2 bg-error-light border border-error-border rounded-md">
              <p className="text-xs text-error font-medium">⚠️ Em Stand-by</p>
            </div>
          )}

          {isInProduction && (
            <div className="mt-3 p-2 bg-primary/10 border border-primary/20 rounded-md">
              <p className="text-xs text-primary font-medium">🔧 Em Produção</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderCard;
