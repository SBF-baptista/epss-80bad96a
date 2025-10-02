import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GroupedOrder } from "@/types/groupedOrder";
import { Scan, Truck, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

  const handleScanClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onScanClick?.();
  };

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
          ? "border-l-red-500 border-red-200 bg-red-50/50" 
          : isInProduction
          ? "border-l-blue-500 border-blue-200 bg-blue-50/50"
          : isAwaitingShipment
          ? "border-l-orange-500 border-orange-200 bg-orange-50/50"
          : isShipped
          ? "border-l-green-500 border-green-200 bg-green-50/50"
          : "border-l-gray-300 hover:border-l-blue-400"
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
              <h4 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                {groupedOrder.company_name || 'Cliente'}
              </h4>
              {groupedOrder.orders[0]?.technicianName && (
                <p className="text-xs text-gray-600 mt-1">
                  Técnico: {groupedOrder.orders[0].technicianName}
                </p>
              )}
              <Badge variant="secondary" className="text-xs mt-1">
                {groupedOrder.orders.length} pedido{groupedOrder.orders.length > 1 ? 's' : ''}
              </Badge>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {isInProduction && onScanClick && (
                <button
                  onClick={handleScanClick}
                  className="p-1.5 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                  title="Abrir Scanner de Produção"
                >
                  <Scan className="h-3.5 w-3.5" />
                </button>
              )}
              {(isAwaitingShipment || isShipped) && onShipmentClick && (
                <button
                  onClick={handleShipmentClick}
                  className="p-1.5 rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm"
                  title={isShipped ? "Ver Informações de Envio" : "Preparar Envio"}
                >
                  <Truck className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={handleToggleExpand}
                className="p-1.5 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                title={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
              >
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          
          {/* Stats grid - responsive */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-blue-50 border border-blue-100 p-2 rounded-md">
              <div className="text-blue-700 font-bold text-sm md:text-base">{groupedOrder.totalVehicles}</div>
              <div className="text-[10px] md:text-xs text-blue-600 leading-tight">Veículos</div>
            </div>
            <div className="bg-green-50 border border-green-100 p-2 rounded-md">
              <div className="text-green-700 font-bold text-sm md:text-base">{groupedOrder.totalTrackers}</div>
              <div className="text-[10px] md:text-xs text-green-600 leading-tight">Rastreadores</div>
            </div>
            <div className="bg-purple-50 border border-purple-100 p-2 rounded-md">
              <div className="text-purple-700 font-bold text-sm md:text-base">{groupedOrder.totalAccessories}</div>
              <div className="text-[10px] md:text-xs text-purple-600 leading-tight">Acessórios</div>
            </div>
          </div>
          
          {/* Configurations */}
          <div className="space-y-2">
            <span className="text-gray-600 font-medium text-xs md:text-sm">Configurações:</span>
            <div className="flex flex-wrap gap-1">
              {groupedOrder.configurations.slice(0, 4).map((config, index) => (
                <Badge key={index} variant="outline" className="text-[10px] md:text-xs px-1.5 py-0.5">
                  {config}
                </Badge>
              ))}
              {groupedOrder.configurations.length > 4 && (
                <Badge variant="outline" className="text-[10px] md:text-xs px-1.5 py-0.5">
                  +{groupedOrder.configurations.length - 4} mais
                </Badge>
              )}
            </div>
          </div>

          {/* Expandable details */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleContent className="space-y-2">
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="text-xs text-gray-500 mb-2">Detalhes dos pedidos:</div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {groupedOrder.orders.map((order, index) => (
                    <div key={order.id} className="bg-gray-50 border border-gray-100 p-2 rounded text-xs">
                      <div className="font-medium text-gray-700 mb-1">Pedido {order.number}</div>
                      <div className="space-y-1 text-[11px]">
                        {order.vehicles.map((vehicle, vIndex) => (
                          <div key={vIndex} className="flex justify-between items-center">
                            <span className="text-blue-600 truncate pr-2">{vehicle.brand} {vehicle.model}</span>
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">{vehicle.quantity}x</span>
                          </div>
                        ))}
                        {order.trackers.map((tracker, tIndex) => (
                          <div key={tIndex} className="flex justify-between items-center">
                            <span className="text-green-600 truncate pr-2">{tracker.model}</span>
                            <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px]">{tracker.quantity}x</span>
                          </div>
                        ))}
                        {order.accessories && order.accessories.length > 0 && (
                          order.accessories.map((accessory, aIndex) => (
                            <div key={aIndex} className="flex justify-between items-center">
                              <span className="text-purple-600 truncate pr-2">{accessory.name}</span>
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

          {/* Status indicators */}
          {isStandby && (
            <div className="flex items-center gap-2 p-2 bg-red-100 border border-red-200 rounded-md">
              <span className="text-red-600">⚠️</span>
              <p className="text-xs text-red-800 font-medium">Em Stand-by</p>
            </div>
          )}

          {isInProduction && (
            <div className="flex items-center gap-2 p-2 bg-blue-100 border border-blue-200 rounded-md">
              <span className="text-blue-600">🔧</span>
              <p className="text-xs text-blue-800 font-medium">Em Produção</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GroupedOrderCard;