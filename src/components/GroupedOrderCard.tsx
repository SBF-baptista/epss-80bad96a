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
            <div className="flex items-center gap-2 flex-1">
              <h4 className="font-semibold text-gray-900">
                {groupedOrder.company_name}
              </h4>
              <Badge variant="secondary" className="text-xs">
                {groupedOrder.orders.length} pedido{groupedOrder.orders.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {isInProduction && onScanClick && (
                <button
                  onClick={handleScanClick}
                  className="p-1 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                  title="Abrir Scanner de Produção"
                >
                  <Scan className="h-4 w-4" />
                </button>
              )}
              {(isAwaitingShipment || isShipped) && onShipmentClick && (
                <button
                  onClick={handleShipmentClick}
                  className="p-2 rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm"
                  title={isShipped ? "Ver Informações de Envio" : "Preparar Envio"}
                >
                  <Truck className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={handleToggleExpand}
                className="p-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                title={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 p-2 rounded">
                <div className="text-blue-600 font-semibold">{groupedOrder.totalVehicles}</div>
                <div className="text-xs text-blue-600">Veículos</div>
              </div>
              <div className="bg-green-50 p-2 rounded">
                <div className="text-green-600 font-semibold">{groupedOrder.totalTrackers}</div>
                <div className="text-xs text-green-600">Rastreadores</div>
              </div>
              <div className="bg-purple-50 p-2 rounded">
                <div className="text-purple-600 font-semibold">{groupedOrder.totalAccessories}</div>
                <div className="text-xs text-purple-600">Acessórios</div>
              </div>
            </div>
            
            <div>
              <span className="text-gray-600 font-medium">Configurações:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {groupedOrder.configurations.map((config, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {config}
                  </Badge>
                ))}
              </div>
            </div>

            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleContent className="space-y-3">
                <div className="border-t pt-3 mt-3">
                  <div className="text-xs text-gray-500 mb-2">Detalhes dos pedidos:</div>
                  {groupedOrder.orders.map((order, index) => (
                    <div key={order.id} className="bg-gray-50 p-2 rounded text-xs space-y-1">
                      <div className="font-medium text-gray-700">Pedido {order.number}</div>
                      <div className="space-y-1">
                        {order.vehicles.map((vehicle, vIndex) => (
                          <div key={vIndex} className="flex justify-between">
                            <span>{vehicle.brand} {vehicle.model}</span>
                            <span>{vehicle.quantity}x</span>
                          </div>
                        ))}
                        {order.trackers.map((tracker, tIndex) => (
                          <div key={tIndex} className="flex justify-between text-green-600">
                            <span>{tracker.model}</span>
                            <span>{tracker.quantity}x</span>
                          </div>
                        ))}
                        {order.accessories && order.accessories.length > 0 && (
                          order.accessories.map((accessory, aIndex) => (
                            <div key={aIndex} className="flex justify-between text-purple-600">
                              <span>{accessory.name}</span>
                              <span>{accessory.quantity}x</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
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

export default GroupedOrderCard;