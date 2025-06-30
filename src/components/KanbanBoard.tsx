
import { useState } from "react";
import KanbanColumn from "./KanbanColumn";
import OrderModal from "./OrderModal";
import { Order, updateOrderStatus } from "@/services/orderService";
import { useToast } from "@/hooks/use-toast";

interface KanbanBoardProps {
  orders: Order[];
  onOrderUpdate: () => void;
}

const columns = [
  { id: "especificacao", title: "Especificação", color: "bg-blue-100 border-blue-200" },
  { id: "producao", title: "Produção", color: "bg-yellow-100 border-yellow-200" },
  { id: "suporte", title: "Suporte", color: "bg-orange-100 border-orange-200" },
  { id: "suporte_especializado", title: "Suporte Especializado", color: "bg-green-100 border-green-200" }
];

const KanbanBoard = ({ orders, onOrderUpdate }: KanbanBoardProps) => {
  const { toast } = useToast();
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleDragStart = (order: Order) => {
    setDraggedOrder(order);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (columnId: string) => {
    if (draggedOrder && draggedOrder.status !== columnId) {
      try {
        await updateOrderStatus(draggedOrder.id, columnId);
        onOrderUpdate();
        toast({
          title: "Status atualizado",
          description: `Pedido ${draggedOrder.number} movido para ${columns.find(c => c.id === columnId)?.title}`
        });
      } catch (error) {
        console.error("Error updating order status:", error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar status do pedido",
          variant: "destructive"
        });
      }
    }
    setDraggedOrder(null);
  };

  const getOrdersByStatus = (status: string) => {
    return orders.filter(order => order.status === status);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-x-auto">
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            title={column.title}
            orders={getOrdersByStatus(column.id)}
            color={column.color}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
            onOrderClick={setSelectedOrder}
            onDragStart={handleDragStart}
          />
        ))}
      </div>

      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </>
  );
};

export default KanbanBoard;
