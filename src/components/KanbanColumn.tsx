
import { Card } from "@/components/ui/card";
import OrderCard from "./OrderCard";
import GroupedOrderCard from "./GroupedOrderCard";
import { Order } from "@/services/orderService";
import { GroupedOrder, groupOrdersByCompany } from "@/types/groupedOrder";

interface KanbanColumnProps {
  title: string;
  orders: Order[];
  color: string;
  status: string;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onOrderClick: (order: Order) => void;
  onOrderViewDetailsClick?: (order: Order) => void;
  onDragStart: (order: Order) => void;
  onScanClick?: (order: Order) => void;
  onShipmentClick?: (order: Order) => void;
}

const KanbanColumn = ({
  title,
  orders,
  color,
  status,
  onDragOver,
  onDrop,
  onOrderClick,
  onOrderViewDetailsClick,
  onDragStart,
  onScanClick,
  onShipmentClick
}: KanbanColumnProps) => {
  // Only group orders by company when status is "enviado", otherwise show individually
  const shouldGroup = status === 'enviado';
  const groupedOrders = groupOrdersByCompany(orders, shouldGroup);
  
  const handleGroupClick = (groupedOrder: GroupedOrder) => {
    // Click on the first order in the group
    onOrderClick(groupedOrder.orders[0]);
  };

  const handleGroupViewDetailsClick = (groupedOrder: GroupedOrder) => {
    if (onOrderViewDetailsClick) {
      onOrderViewDetailsClick(groupedOrder.orders[0]);
    }
  };

  const handleGroupDragStart = (groupedOrder: GroupedOrder) => {
    // For drag operations, use the first order in the group
    onDragStart(groupedOrder.orders[0]);
  };

  const handleGroupScanClick = (groupedOrder: GroupedOrder) => {
    // For scan operations, use the first order in the group
    if (onScanClick) {
      onScanClick(groupedOrder.orders[0]);
    }
  };

  const handleGroupShipmentClick = (groupedOrder: GroupedOrder) => {
    // For shipment operations, use the first order in the group
    if (onShipmentClick) {
      onShipmentClick(groupedOrder.orders[0]);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-3 md:mb-4">
        <h3 className="font-semibold text-gray-900 text-base md:text-lg truncate">{title}</h3>
        <p className="text-xs md:text-sm text-gray-600">
          {groupedOrders.length} empresa{groupedOrders.length !== 1 ? 's' : ''} 
          ({orders.length} pedido{orders.length !== 1 ? 's' : ''})
        </p>
      </div>
      
      <Card 
        className={`min-h-80 md:min-h-96 p-2 md:p-3 lg:p-4 border-2 border-dashed ${color} transition-colors overflow-hidden`}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="space-y-2 md:space-y-3 h-full">
          <div className="space-y-2 md:space-y-3 max-h-full overflow-y-auto">
            {groupedOrders.map((groupedOrder, index) => (
              <GroupedOrderCard
                key={`${groupedOrder.company_name}-${index}`}
                groupedOrder={groupedOrder}
                onClick={() => handleGroupClick(groupedOrder)}
                onDragStart={() => handleGroupDragStart(groupedOrder)}
                onViewDetailsClick={onOrderViewDetailsClick ? () => handleGroupViewDetailsClick(groupedOrder) : undefined}
                onScanClick={onScanClick ? () => handleGroupScanClick(groupedOrder) : undefined}
                onShipmentClick={onShipmentClick ? () => handleGroupShipmentClick(groupedOrder) : undefined}
              />
            ))}
          </div>
          {orders.length === 0 && (
            <div className="flex items-center justify-center h-full py-8 md:py-12 text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-sm md:text-base font-medium">Nenhum pedido</p>
                <p className="text-xs md:text-sm">nesta etapa</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default KanbanColumn;
