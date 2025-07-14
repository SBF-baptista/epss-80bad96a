
import { Card } from "@/components/ui/card";
import OrderCard from "./OrderCard";
import GroupedOrderCard from "./GroupedOrderCard";
import { Order } from "@/services/orderService";
import { GroupedOrder, groupOrdersByCompany } from "@/types/groupedOrder";

interface KanbanColumnProps {
  title: string;
  orders: Order[];
  color: string;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onOrderClick: (order: Order) => void;
  onDragStart: (order: Order) => void;
  onScanClick?: (order: Order) => void;
  onShipmentClick?: (order: Order) => void;
}

const KanbanColumn = ({
  title,
  orders,
  color,
  onDragOver,
  onDrop,
  onOrderClick,
  onDragStart,
  onScanClick,
  onShipmentClick
}: KanbanColumnProps) => {
  // Group orders by company
  const groupedOrders = groupOrdersByCompany(orders);
  
  const handleGroupClick = (groupedOrder: GroupedOrder) => {
    // For now, click on the first order in the group
    // You can modify this to show a modal with all orders if needed
    onOrderClick(groupedOrder.orders[0]);
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
    <div className="min-w-80">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
        <p className="text-sm text-gray-600">
          {groupedOrders.length} empresa{groupedOrders.length !== 1 ? 's' : ''} 
          ({orders.length} pedido{orders.length !== 1 ? 's' : ''})
        </p>
      </div>
      
      <Card 
        className={`min-h-96 p-4 border-2 border-dashed ${color} transition-colors`}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="space-y-3">
          {groupedOrders.map((groupedOrder, index) => (
            <GroupedOrderCard
              key={`${groupedOrder.company_name}-${index}`}
              groupedOrder={groupedOrder}
              onClick={() => handleGroupClick(groupedOrder)}
              onDragStart={() => handleGroupDragStart(groupedOrder)}
              onScanClick={onScanClick ? () => handleGroupScanClick(groupedOrder) : undefined}
              onShipmentClick={onShipmentClick ? () => handleGroupShipmentClick(groupedOrder) : undefined}
            />
          ))}
          {orders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum pedido nesta etapa</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default KanbanColumn;
