
import { Card } from "@/components/ui/card";
import OrderCard from "./OrderCard";
import { Order } from "@/services/orderService";

interface KanbanColumnProps {
  title: string;
  orders: Order[];
  color: string;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onOrderClick: (order: Order) => void;
  onDragStart: (order: Order) => void;
  onScanClick?: (order: Order) => void;
}

const KanbanColumn = ({
  title,
  orders,
  color,
  onDragOver,
  onDrop,
  onOrderClick,
  onDragStart,
  onScanClick
}: KanbanColumnProps) => {
  return (
    <div className="min-w-80">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
        <p className="text-sm text-gray-600">{orders.length} pedidos</p>
      </div>
      
      <Card 
        className={`min-h-96 p-4 border-2 border-dashed ${color} transition-colors`}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="space-y-3">
          {orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => onOrderClick(order)}
              onDragStart={() => onDragStart(order)}
              onScanClick={onScanClick ? () => onScanClick(order) : undefined}
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
