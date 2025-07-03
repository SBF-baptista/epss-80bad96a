
import { useState } from "react";
import KanbanColumn from "./KanbanColumn";
import OrderModal from "./OrderModal";
import ProductionScannerModal from "./ProductionScannerModal";
import ShipmentPreparationModal from "./ShipmentPreparationModal";
import { Order, updateOrderStatus } from "@/services/orderService";
import { useToast } from "@/hooks/use-toast";

interface KanbanBoardProps {
  orders: Order[];
  onOrderUpdate: () => void;
}

const columns = [
  { id: "novos", title: "Pedidos", color: "bg-blue-100 border-blue-200" },
  { id: "producao", title: "Em Produção", color: "bg-yellow-100 border-yellow-200" },
  { id: "aguardando", title: "Aguardando Envio", color: "bg-orange-100 border-orange-200" },
  { id: "enviado", title: "Enviado", color: "bg-green-100 border-green-200" },
  { id: "standby", title: "Em Stand-by", color: "bg-red-100 border-red-200" }
];

const KanbanBoard = ({ orders, onOrderUpdate }: KanbanBoardProps) => {
  const { toast } = useToast();
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [scannerOrder, setScannerOrder] = useState<Order | null>(null);
  const [shipmentOrder, setShipmentOrder] = useState<Order | null>(null);

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

  const handleScanClick = (order: Order) => {
    setScannerOrder(order);
  };

  const handleShipmentClick = (order: Order) => {
    console.log('Shipment button clicked for order:', order);
    setShipmentOrder(order);
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
            onScanClick={column.id === "producao" ? handleScanClick : undefined}
            onShipmentClick={column.id === "aguardando" || column.id === "enviado" ? handleShipmentClick : undefined}
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

      {scannerOrder && (
        <ProductionScannerModal
          order={scannerOrder}
          isOpen={!!scannerOrder}
          onClose={() => setScannerOrder(null)}
          onUpdate={onOrderUpdate}
        />
      )}

      {shipmentOrder && (
        <ShipmentPreparationModal
          order={shipmentOrder}
          isOpen={!!shipmentOrder}
          onClose={() => setShipmentOrder(null)}
          onUpdate={onOrderUpdate}
        />
      )}
    </>
  );
};

export default KanbanBoard;
