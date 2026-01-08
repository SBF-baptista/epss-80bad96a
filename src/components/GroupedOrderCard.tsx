import { Card, CardContent } from "@/components/ui/card";
import { GroupedOrder } from "@/types/groupedOrder";
import { Eye, Package } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { cleanItemName } from "@/utils/itemNormalization";

interface GroupedOrderCardProps {
  groupedOrder: GroupedOrder;
  onClick: () => void;
  onDragStart: () => void;
  onViewDetailsClick?: () => void;
  onScanClick?: () => void;
  onShipmentClick?: () => void;
}

const GroupedOrderCard = ({ 
  groupedOrder, 
  onClick, 
  onDragStart, 
  onViewDetailsClick,
  onScanClick, 
  onShipmentClick 
}: GroupedOrderCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isStandby = groupedOrder.status === "standby";
  const isInProduction = groupedOrder.status === "producao";
  const isAwaitingShipment = groupedOrder.status === "aguardando";
  const isShipped = groupedOrder.status === "enviado";

  const handleShipmentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShipmentClick?.();
  };

  const handleViewDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetailsClick?.();
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Check if this is a grouped card (multiple orders) in shipped status
  const isGroupedShipped = isShipped && groupedOrder.orders.length > 1;

  return (
    <Card
      className={`cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-l-4 ${
        isStandby 
          ? "border-l-error border-error-border bg-error-light/50" 
          : isInProduction
          ? "border-l-primary border-primary/20 bg-primary/5"
          : isAwaitingShipment
          ? "border-l-warning border-warning-border bg-warning-light/50"
          : isShipped
          ? "border-l-success border-success-border bg-success-light/50"
          : "border-l-muted hover:border-l-primary"
      }`}
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
    >
      <CardContent className="p-3 md:p-4">
        <div className="space-y-3">
          {/* Header with company name */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-sm md:text-base truncate">
                {groupedOrder.company_name || 'Cliente'}
              </h4>
              {/* Show vehicle count for grouped shipped cards */}
              {isGroupedShipped && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {groupedOrder.orders.length} veículos
                </p>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* "Em produção" - Eye icon to view details (consolidated info) */}
              {isInProduction && onViewDetailsClick && (
                <button
                  onClick={handleViewDetailsClick}
                  className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  title="Visualizar detalhes"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              )}
              {/* "Aguardando envio" - Eye icon to view details (replaces truck) */}
              {isAwaitingShipment && onViewDetailsClick && (
                <button
                  onClick={handleViewDetailsClick}
                  className="p-1.5 rounded-md bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
                  title="Visualizar detalhes"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              )}
              {/* "Enviado" - Eye icon to view details (same as others) */}
              {isShipped && onViewDetailsClick && (
                <button
                  onClick={handleViewDetailsClick}
                  className="p-1.5 rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors"
                  title="Visualizar detalhes"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          
          {/* Expandable details (non-production only) */}
          {!isInProduction && !isGroupedShipped && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleContent className="space-y-2">
                <div className="border-t border-border pt-2 mt-2">
                  <div className="text-xs text-muted-foreground mb-2">Detalhes dos pedidos:</div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {groupedOrder.orders.map((order) => (
                      <div key={order.id} className="bg-muted/50 border border-border p-2 rounded text-xs">
                        <div className="font-medium text-foreground mb-1">Pedido {order.number}</div>
                        <div className="space-y-1 text-[11px]">
                          {order.vehicles.map((vehicle, vIndex) => (
                            <div key={vIndex} className="flex justify-between items-center">
                              <span className="text-primary truncate pr-2">{vehicle.brand} {vehicle.model}</span>
                              <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">{vehicle.quantity}x</span>
                            </div>
                          ))}
                          {order.trackers.map((tracker, tIndex) => (
                            <div key={tIndex} className="flex justify-between items-center">
                              <span className="text-success truncate pr-2">{cleanItemName(tracker.model)}</span>
                              <span className="bg-success-light text-success px-1.5 py-0.5 rounded text-[10px]">{tracker.quantity}x</span>
                            </div>
                          ))}
                          {order.accessories && order.accessories.length > 0 && (
                            order.accessories.map((accessory, aIndex) => (
                              <div key={aIndex} className="flex justify-between items-center">
                                <span className="text-purple-600 truncate pr-2">{cleanItemName(accessory.name)}</span>
                                <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px]">{accessory.quantity}x</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Status indicators */}
          {isStandby && (
            <div className="flex items-center gap-2 p-2 bg-error-light border border-error-border rounded-md">
              <span className="text-error">⚠️</span>
              <p className="text-xs text-error font-medium">Em Stand-by</p>
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
};

export default GroupedOrderCard;