
import { useState, useRef } from "react";
import KanbanColumn from "./KanbanColumn";
import OrderModal from "./OrderModal";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/services/orderService";
import { supabase } from "@/integrations/supabase/client";
import { logKanbanMove } from "@/services/logService";

interface KanbanBoardProps {
  orders: Order[];
  onOrderUpdate: () => void;
  onScanClick?: (order: Order) => void;
  onShipmentClick?: (order: Order) => void;
}

const columns = [
  { id: "novos", title: "Pedidos", color: "border-primary/30 bg-primary/5" },
  { id: "producao", title: "Em Produção", color: "border-warning/30 bg-warning-light/30" },
  { id: "aguardando", title: "Aguardando Envio", color: "border-warning/30 bg-warning-light/30" },
  { id: "enviado", title: "Enviado", color: "border-success/30 bg-success-light/30" },
];

const KanbanBoard = ({ orders, onOrderUpdate, onScanClick, onShipmentClick }: KanbanBoardProps) => {
  const { toast } = useToast();
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeScrollIndex, setActiveScrollIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Handle scroll to update active indicator
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollLeft = container.scrollLeft;
      const cardWidth = 320;
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
    if (draggedOrder) {
      try {
        const previousStatus = draggedOrder.status;
        const targetColumn = columns.find(c => c.id === columnId);
        const previousColumn = columns.find(c => c.id === previousStatus);
        
        // Update the order status in pedidos table
        const { error } = await supabase
          .from('pedidos')
          .update({ status: columnId as any })
          .eq('id', draggedOrder.id);

        if (error) throw error;
        
        // Log the movement
        await logKanbanMove(
          "Pedidos",
          draggedOrder.id,
          previousColumn?.title || previousStatus,
          targetColumn?.title || columnId,
          draggedOrder.company_name || "Cliente não identificado"
        );
        
        onOrderUpdate();
        toast({
          title: "Status atualizado",
          description: `Pedido movido para ${targetColumn?.title}`
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
      {/* Desktop and Tablet: Grid layout */}
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            title={column.title}
            orders={getOrdersByStatus(column.id)}
            color={column.color}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
            onOrderClick={(order) => setSelectedOrder(order)}
            onDragStart={handleDragStart}
            onScanClick={onScanClick}
            onShipmentClick={onShipmentClick}
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
                onOrderClick={(order) => setSelectedOrder(order)}
                onDragStart={handleDragStart}
                onScanClick={onScanClick}
                onShipmentClick={onShipmentClick}
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
                  ? "bg-primary w-6" 
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
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
    </>
  );
};

export default KanbanBoard;
