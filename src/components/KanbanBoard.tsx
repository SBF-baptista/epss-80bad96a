
import { useState, useRef } from "react";
import InstallationKanbanColumn from "./InstallationKanbanColumn";
import InstallationOrderModal from "./InstallationOrderModal";
import type { InstallationOrder } from "@/types/installationOrder";
import { updateInstallationOrderStatus } from "@/services/installationOrderService";
import { useToast } from "@/hooks/use-toast";

interface KanbanBoardProps {
  installationOrders: InstallationOrder[];
  onOrderUpdate: () => void;
}

const columns = [
  { id: "scheduled", title: "Agendado", color: "border-blue-300 bg-blue-50/30" },
  { id: "in_progress", title: "Em Andamento", color: "border-yellow-300 bg-yellow-50/30" },
  { id: "completed", title: "Concluído", color: "border-green-300 bg-green-50/30" },
  { id: "cancelled", title: "Cancelado", color: "border-red-300 bg-red-50/30" }
];

const KanbanBoard = ({ installationOrders, onOrderUpdate }: KanbanBoardProps) => {
  const { toast } = useToast();
  const [draggedOrder, setDraggedOrder] = useState<InstallationOrder | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<InstallationOrder | null>(null);
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

  const handleDragStart = (order: InstallationOrder) => {
    setDraggedOrder(order);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (columnId: string) => {
    if (draggedOrder && draggedOrder.status !== columnId) {
      try {
        await updateInstallationOrderStatus(
          draggedOrder.id, 
          columnId as 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
        );
        onOrderUpdate();
        toast({
          title: "Status atualizado",
          description: `Pedido de ${draggedOrder.customer_name} movido para ${columns.find(c => c.id === columnId)?.title}`
        });
      } catch (error) {
        console.error("Error updating installation order status:", error);
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
    return installationOrders.filter(order => order.status === status);
  };

  return (
    <>
      {/* Desktop and Tablet: Grid layout */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        {columns.map(column => (
          <InstallationKanbanColumn
            key={column.id}
            title={column.title}
            installationOrders={getOrdersByStatus(column.id)}
            color={column.color}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
            onOrderClick={setSelectedOrder}
            onDragStart={handleDragStart}
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
              <InstallationKanbanColumn
                title={column.title}
                installationOrders={getOrdersByStatus(column.id)}
                color={column.color}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(column.id)}
                onOrderClick={setSelectedOrder}
                onDragStart={handleDragStart}
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
        <InstallationOrderModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </>
  );
};

export default KanbanBoard;
