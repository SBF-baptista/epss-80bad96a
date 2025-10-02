
import { useState, useRef } from "react";
import KanbanColumn from "./KanbanColumn";
import OrderModal from "./OrderModal";
import { KitScheduleWithDetails, updateKitSchedule } from "@/services/kitScheduleService";
import { HomologationKit } from "@/types/homologationKit";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/services/orderService";

interface KanbanBoardProps {
  schedules: KitScheduleWithDetails[];
  kits: HomologationKit[];
  onOrderUpdate: () => void;
  onScanClick?: (order: Order) => void;
  onShipmentClick?: (order: Order) => void;
}

const columns = [
  { id: "scheduled", title: "Pedidos", color: "border-blue-300 bg-blue-50/30" },
  { id: "in_progress", title: "Em Produção", color: "border-yellow-300 bg-yellow-50/30" },
  { id: "completed", title: "Aguardando Envio", color: "border-orange-300 bg-orange-50/30" },
  { id: "shipped", title: "Enviado", color: "border-green-300 bg-green-50/30" },
];

const KanbanBoard = ({ schedules, kits, onOrderUpdate, onScanClick, onShipmentClick }: KanbanBoardProps) => {
  const { toast } = useToast();
  const [draggedSchedule, setDraggedSchedule] = useState<KitScheduleWithDetails | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<KitScheduleWithDetails | null>(null);
  const [activeScrollIndex, setActiveScrollIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Convert schedules to orders format for compatibility
  const convertScheduleToOrder = (schedule: KitScheduleWithDetails): Order => {
    const kit = kits.find(k => k.id === schedule.kit_id);
    
    // Get accessories and supplies directly from schedule fields (not from kit)
    const accessoriesList = Array.isArray(schedule.accessories) && schedule.accessories.length > 0
      ? schedule.accessories.map((name) => ({
          name: name,
          quantity: 1,
        }))
      : [];
    
    return {
      id: schedule.id || '',
      number: schedule.id?.slice(0, 8) || '',
      company_name: schedule.customer_name || 'Cliente',
      status: schedule.status === 'scheduled' ? 'novos' : 
              schedule.status === 'in_progress' ? 'producao' : 
              schedule.status === 'completed' ? 'aguardando' : 'enviado',
      configurationType: kit?.name || 'N/A',
      createdAt: schedule.created_at || new Date().toISOString(),
      vehicles: schedule.vehicle_brand && schedule.vehicle_model ? [{
        brand: schedule.vehicle_brand,
        model: schedule.vehicle_model,
        quantity: 1,
        year: schedule.vehicle_year?.toString(),
      }] : [],
      trackers: kit?.equipment?.map((eq) => ({
        model: eq.item_name,
        quantity: eq.quantity,
      })) || [],
      accessories: accessoriesList,
      technicianName: schedule.technician?.name,
    };
  };

  const orders = schedules.map(convertScheduleToOrder);

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
    const schedule = schedules.find(s => s.id === order.id);
    if (schedule) {
      setDraggedSchedule(schedule);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (columnId: string) => {
    if (draggedSchedule && draggedSchedule.status !== columnId) {
      try {
        const statusMap: Record<string, 'scheduled' | 'in_progress' | 'completed' | 'cancelled'> = {
          'scheduled': 'scheduled',
          'in_progress': 'in_progress',
          'completed': 'completed',
          'shipped': 'completed',
        };
        
        const newStatus = statusMap[columnId] || 'scheduled';
        await updateKitSchedule(draggedSchedule.id!, { 
          kit_id: draggedSchedule.kit_id,
          technician_id: draggedSchedule.technician_id,
          scheduled_date: draggedSchedule.scheduled_date,
          customer_name: draggedSchedule.customer_name || '',
          customer_document_number: draggedSchedule.customer_document_number || '',
          customer_phone: draggedSchedule.customer_phone || '',
          customer_email: draggedSchedule.customer_email || '',
          installation_address_street: draggedSchedule.installation_address_street || '',
          installation_address_number: draggedSchedule.installation_address_number || '',
          installation_address_neighborhood: draggedSchedule.installation_address_neighborhood || '',
          installation_address_city: draggedSchedule.installation_address_city || '',
          installation_address_state: draggedSchedule.installation_address_state || '',
          installation_address_postal_code: draggedSchedule.installation_address_postal_code || '',
        });
        
        // Update status separately via a direct query if needed
        onOrderUpdate();
        toast({
          title: "Status atualizado",
          description: `Pedido movido para ${columns.find(c => c.id === columnId)?.title}`
        });
      } catch (error) {
        console.error("Error updating schedule status:", error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar status do pedido",
          variant: "destructive"
        });
      }
    }
    setDraggedSchedule(null);
  };

  const getOrdersByStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'scheduled': 'novos',
      'in_progress': 'producao',
      'completed': 'aguardando',
      'shipped': 'enviado',
    };
    
    return orders.filter(order => order.status === statusMap[status]);
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
            onOrderClick={(order) => {
              const schedule = schedules.find(s => s.id === order.id);
              if (schedule) setSelectedSchedule(schedule);
            }}
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
                onOrderClick={(order) => {
                  const schedule = schedules.find(s => s.id === order.id);
                  if (schedule) setSelectedSchedule(schedule);
                }}
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
                  ? "bg-blue-500 w-6" 
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
              title={column.title}
            />
          ))}
        </div>
      </div>

      {selectedSchedule && (
        <OrderModal
          order={convertScheduleToOrder(selectedSchedule)}
          isOpen={!!selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
          onUpdate={onOrderUpdate}
          schedule={selectedSchedule}
          kit={kits.find(k => k.id === selectedSchedule.kit_id)}
        />
      )}
    </>
  );
};

export default KanbanBoard;
