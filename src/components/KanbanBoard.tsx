
import { useState, useRef, useEffect } from "react";
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
  { id: "novos", title: "Pedidos", color: "border-blue-300 bg-blue-50/30" },
  { id: "producao", title: "Em Produção", color: "border-yellow-300 bg-yellow-50/30" },
  { id: "aguardando", title: "Aguardando Envio", color: "border-orange-300 bg-orange-50/30" },
  { id: "enviado", title: "Enviado", color: "border-green-300 bg-green-50/30" },
  { id: "standby", title: "Em Stand-by", color: "border-red-300 bg-red-50/30" }
];

const KanbanBoard = ({ orders, onOrderUpdate }: KanbanBoardProps) => {
  const { toast } = useToast();
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [scannerOrder, setScannerOrder] = useState<Order | null>(null);
  const [shipmentOrder, setShipmentOrder] = useState<Order | null>(null);
  const [activeScrollIndex, setActiveScrollIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Handle scroll to update active indicator
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollLeft = container.scrollLeft;
      const cardWidth = 320; // w-80 = 320px + gap
      const activeIndex = Math.round(scrollLeft / cardWidth);
      setActiveScrollIndex(Math.min(activeIndex, columns.length - 1));
    }
  };

  const scrollToColumn = (index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = 320;
      container.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      });
    }
  };

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
      {/* Desktop and Tablet: Grid layout */}
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
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

      {/* Mobile: Horizontal scroll */}
      <div className="md:hidden">
        <div 
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory kanban-scroll"
          onScroll={handleScroll}
        >
          {columns.map(column => (
            <div key={column.id} className="flex-shrink-0 w-80 snap-start">
              <KanbanColumn
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
            </div>
          ))}
        </div>
        
        {/* Mobile scroll indicator - clickable */}
        <div className="flex justify-center mt-2 gap-2">
          {columns.map((column, index) => (
            <button
              key={index}
              onClick={() => scrollToColumn(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === activeScrollIndex 
                  ? "bg-blue-500 w-6" 
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
              title={column.title}
            />
          ))}
        </div>
      </div>

      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={onOrderUpdate}
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
