
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import OrderCard from "./OrderCard";
import GroupedOrderCard from "./GroupedOrderCard";
import { Order } from "@/services/orderService";
import { GroupedOrder, groupOrdersByCompany } from "@/types/groupedOrder";
import { ClipboardList, Cog, Clock, Truck, Package } from "lucide-react";

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

const statusIcons: Record<string, React.ElementType> = {
  "scheduled": ClipboardList,
  "in_progress": Cog,
  "completed": Clock,
  "shipped": Truck,
};

const statusColors: Record<string, { badge: string; icon: string }> = {
  "scheduled": { badge: "bg-primary/10 text-primary border-primary/20", icon: "text-primary" },
  "in_progress": { badge: "bg-warning/10 text-warning border-warning/20", icon: "text-warning" },
  "completed": { badge: "bg-orange-100 text-orange-600 border-orange-200", icon: "text-orange-500" },
  "shipped": { badge: "bg-success/10 text-success border-success/20", icon: "text-success" },
};

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
  // Group orders in 'scheduled' (Pedidos), 'in_progress' (Em Produção) and 'shipped' (Enviado)
  // Keep individual in 'completed' (Aguardando envio)
  const shouldGroup = status === 'scheduled' || status === 'in_progress' || status === 'shipped';
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
    // For drag operations, pass the first order - KanbanBoard will find all orders for same company
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

  const Icon = statusIcons[status] || ClipboardList;
  const colors = statusColors[status] || statusColors.scheduled;

  return (
    <div className="w-full">
      {/* Enhanced column header */}
      <div className="mb-4 md:mb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <Icon className={`h-4 w-4 md:h-5 md:w-5 ${colors.icon}`} />
          <h3 className="font-semibold text-foreground text-base md:text-lg">{title}</h3>
          <Badge 
            variant="outline" 
            className={`ml-auto ${colors.badge} text-xs font-medium px-2 py-0.5`}
          >
            {orders.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground/70 pl-6 md:pl-7">
          {groupedOrders.length} empresa{groupedOrders.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      <Card 
        className={`min-h-80 md:min-h-96 p-3 md:p-4 lg:p-5 border border-border/40 ${color} transition-all duration-200 overflow-hidden rounded-xl shadow-sm`}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="space-y-2.5 md:space-y-3 h-full">
          <div className="space-y-2.5 md:space-y-3 max-h-full overflow-y-auto kanban-scroll pr-1">
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
            <div className="flex items-center justify-center h-full py-10 md:py-14">
              <div className="text-center opacity-50">
                <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground/60">Nenhum pedido</p>
                <p className="text-xs text-muted-foreground/40">nesta etapa</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default KanbanColumn;
