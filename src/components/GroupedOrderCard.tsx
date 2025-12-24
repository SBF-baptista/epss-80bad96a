import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GroupedOrder } from "@/types/groupedOrder";
import { Truck, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

// Utility to remove quantity pattern like "(1x)" or "(2x)" from item names
const cleanItemName = (name: string): string => {
  return name.replace(/\s*\(\d+x\)\s*$/i, '').trim();
};

interface GroupedOrderCardProps {
  groupedOrder: GroupedOrder;
  onClick: () => void;
  onDragStart: () => void;
  onScanClick?: () => void;
  onShipmentClick?: () => void;
}

const GroupedOrderCard = ({ 
  groupedOrder, 
  onClick, 
  onDragStart, 
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

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

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
          {/* Header with company name and order count */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-sm md:text-base truncate">
                {groupedOrder.company_name || 'Cliente'}
              </h4>
              {groupedOrder.orders[0]?.technicianName && (
                <p className="text-xs text-muted-foreground mt-1">
                  Técnico: {groupedOrder.orders[0].technicianName}
                </p>
              )}
              <Badge variant="secondary" className="text-xs mt-1">
                {groupedOrder.orders.length} pedido{groupedOrder.orders.length > 1 ? 's' : ''}
              </Badge>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {isInProduction && (
                <button
                  onClick={handleToggleExpand}
                  className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  title={isExpanded ? "Ocultar detalhes" : "Visualizar detalhes"}
                >
                  {isExpanded ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              )}
              {(isAwaitingShipment || isShipped) && onShipmentClick && (
                <button
                  onClick={handleShipmentClick}
                  className="p-1.5 rounded-md bg-warning text-warning-foreground hover:bg-warning/90 transition-colors shadow-sm"
                  title={isShipped ? "Ver Informações de Envio" : "Preparar Envio"}
                >
                  <Truck className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          
          {/* Stats grid - responsive: show always for non-production, or when expanded for production */}
          {(!isInProduction || isExpanded) && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-primary/10 border border-primary/20 p-2 rounded-md">
                <div className="text-primary font-bold text-sm md:text-base">{groupedOrder.totalVehicles}</div>
                <div className="text-[10px] md:text-xs text-primary leading-tight">Veículos</div>
              </div>
              <div className="bg-success-light border border-success-border p-2 rounded-md">
                <div className="text-success font-bold text-sm md:text-base">{groupedOrder.totalTrackers}</div>
                <div className="text-[10px] md:text-xs text-success leading-tight">Rastreadores</div>
              </div>
              <div className="bg-purple-50 border border-purple-100 p-2 rounded-md">
                <div className="text-purple-700 font-bold text-sm md:text-base">{groupedOrder.totalAccessories}</div>
                <div className="text-[10px] md:text-xs text-purple-600 leading-tight">Acessórios</div>
              </div>
            </div>
          )}
          
          {/* Expandable details - show always for non-production, or when expanded for production */}
          {(!isInProduction || isExpanded) && (
            <Collapsible open={!isInProduction || isExpanded} onOpenChange={setIsExpanded}>
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

          {isInProduction && (
            <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-md">
              <span className="text-primary">🔧</span>
              <p className="text-xs text-primary font-medium">Em Produção</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GroupedOrderCard;