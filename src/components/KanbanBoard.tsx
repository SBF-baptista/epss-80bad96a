
import { useState } from "react";
import KanbanColumn from "./KanbanColumn";
import OrderModal from "./OrderModal";
import { Order } from "@/pages/Kanban";

interface KanbanBoardProps {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
}

const columns = [
  { id: "novos", title: "Novos Pedidos", color: "bg-blue-100 border-blue-200" },
  { id: "producao", title: "Em Produção", color: "bg-yellow-100 border-yellow-200" },
  { id: "aguardando", title: "Aguardando Envio", color: "bg-orange-100 border-orange-200" },
  { id: "enviado", title: "Enviado", color: "bg-green-100 border-green-200" },
  { id: "standby", title: "Em Stand-by", color: "bg-red-100 border-red-200" }
];

const KanbanBoard = ({ orders, setOrders }: KanbanBoardProps) => {
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleDragStart = (order: Order) => {
    setDraggedOrder(order);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (columnId: string) => {
    if (draggedOrder) {
      setOrders(
        orders.map(order =>
          order.id === draggedOrder.id
            ? { ...order, status: columnId as Order["status"] }
            : order
        )
      );
      setDraggedOrder(null);
    }
  };

  const getOrdersByStatus = (status: string) => {
    return orders.filter(order => order.status === status);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 overflow-x-auto">
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
