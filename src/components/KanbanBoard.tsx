
import { useState, useRef, useEffect } from "react";
import KanbanColumn from "./KanbanColumn";
import OrderModal from "./OrderModal";
import { KitScheduleWithDetails } from "@/services/kitScheduleService";
import { HomologationKit } from "@/types/homologationKit";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/services/orderService";
import { supabase } from "@/integrations/supabase/client";
import { fetchAccessoriesByVehicleIds, fetchAccessoriesByPlates, aggregateAccessoriesWithoutModules } from "@/services/vehicleAccessoryService";

interface KanbanBoardProps {
  schedules: KitScheduleWithDetails[];
  kits: HomologationKit[];
  onOrderUpdate: () => void;
  onScanClick?: (order: Order) => void;
  onShipmentClick?: (order: Order) => void;
}

const columns = [
  { id: "scheduled", title: "Pedidos", color: "border-primary/30 bg-primary/5" },
  { id: "in_progress", title: "Em Produção", color: "border-warning/30 bg-warning-light/30" },
  { id: "completed", title: "Aguardando Envio", color: "border-warning/30 bg-warning-light/30" },
  { id: "shipped", title: "Enviado", color: "border-success/30 bg-success-light/30" },
];

const KanbanBoard = ({ schedules, kits, onOrderUpdate, onScanClick, onShipmentClick }: KanbanBoardProps) => {
  const { toast } = useToast();
  const [draggedSchedules, setDraggedSchedules] = useState<KitScheduleWithDetails[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<KitScheduleWithDetails | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeScrollIndex, setActiveScrollIndex] = useState(0);
  const [accessoriesByVehicleId, setAccessoriesByVehicleId] = useState<Map<string, string[]>>(new Map());
  const [orders, setOrders] = useState<Order[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch real accessories from database by vehicle IDs and fallback to plates
  useEffect(() => {
    const fetchAccessories = async () => {
      const formattedMap = new Map<string, string[]>();
      
      // First, try to fetch by incoming_vehicle_id
      const vehicleIds = schedules
        .map(s => s.incoming_vehicle_id)
        .filter((id): id is string => !!id);
      
      if (vehicleIds.length > 0) {
        try {
          const accessoriesMap = await fetchAccessoriesByVehicleIds(vehicleIds);
          
          accessoriesMap.forEach((accessories, vehicleId) => {
            formattedMap.set(vehicleId, aggregateAccessoriesWithoutModules(accessories));
          });
        } catch (error) {
          console.error('Error fetching accessories by vehicle IDs:', error);
        }
      }
      
      // Fallback: fetch by plates for schedules without incoming_vehicle_id
      const schedulesWithoutVehicleId = schedules.filter(s => !s.incoming_vehicle_id && s.vehicle_plate && s.vehicle_plate !== 'Placa pendente');
      const plates = schedulesWithoutVehicleId.map(s => s.vehicle_plate!);
      
      if (plates.length > 0) {
        try {
          const accessoriesByPlate = await fetchAccessoriesByPlates(plates);
          
          // Map plate-based accessories to schedules
          schedulesWithoutVehicleId.forEach(schedule => {
            if (schedule.vehicle_plate) {
              const accessories = accessoriesByPlate.get(schedule.vehicle_plate);
              if (accessories) {
                // Use a synthetic key since we don't have incoming_vehicle_id
                const syntheticKey = `plate-${schedule.vehicle_plate}`;
                formattedMap.set(syntheticKey, aggregateAccessoriesWithoutModules(accessories));
              }
            }
          });
        } catch (error) {
          console.error('Error fetching accessories by plates:', error);
        }
      }
      
      setAccessoriesByVehicleId(formattedMap);
    };

    fetchAccessories();
  }, [schedules]);

  const convertScheduleToOrder = async (schedule: KitScheduleWithDetails): Promise<Order> => {
    const kit = kits.find(k => k.id === schedule.kit_id);
    
    // Priority 1: Get real accessories from database by incoming_vehicle_id
    let formattedAccessories = schedule.incoming_vehicle_id
      ? accessoriesByVehicleId.get(schedule.incoming_vehicle_id) || []
      : [];
    
    // Priority 2: Fallback to plate-based lookup if no incoming_vehicle_id
    if (formattedAccessories.length === 0 && schedule.vehicle_plate && schedule.vehicle_plate !== 'Placa pendente') {
      const syntheticKey = `plate-${schedule.vehicle_plate}`;
      formattedAccessories = accessoriesByVehicleId.get(syntheticKey) || [];
    }
    
    // Detect corrupted arrays (duplicated data) - ignore if > 10 items
    const isCorruptedArray = Array.isArray(schedule.accessories) && schedule.accessories.length > 10;
    
    // Priority 3: Use schedule.accessories only if not corrupted
    const accessoriesList = formattedAccessories.length > 0
      ? formattedAccessories.map((formatted) => {
          const match = formatted.match(/^(.+?)\s*\((\d+)x\)$/);
          return match
            ? { name: match[1], quantity: parseInt(match[2]) }
            : { name: formatted, quantity: 1 };
        })
      : (!isCorruptedArray && Array.isArray(schedule.accessories) && schedule.accessories.length > 0
        ? schedule.accessories.map((name) => ({ name, quantity: 1 }))
        : []);
    
    // Fetch selected kit names if selected_kit_ids exists
    let selectedKitNames: string[] = [];
    const scheduleWithIds = schedule as any;
    if (scheduleWithIds.selected_kit_ids && Array.isArray(scheduleWithIds.selected_kit_ids) && scheduleWithIds.selected_kit_ids.length > 0) {
      const kitNames = await Promise.all(
        scheduleWithIds.selected_kit_ids.map(async (kitId: string) => {
          const { data } = await supabase
            .from('homologation_kits')
            .select('name')
            .eq('id', kitId)
            .single();
          return data?.name || 'Kit desconhecido';
        })
      );
      selectedKitNames = kitNames;
    }

    return {
      id: schedule.id || '',
      number: schedule.id?.slice(0, 8) || '',
      company_name: schedule.customer_name || 'Cliente',
      status: schedule.status === 'scheduled' ? 'novos' : 
              schedule.status === 'in_progress' ? 'producao' : 
              schedule.status === 'completed' ? 'aguardando' : 'enviado',
      configurationType: (schedule as any).configuration || kit?.name || 'N/A',
      selectedKitNames,
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

  // Convert schedules to orders asynchronously
  useEffect(() => {
    const convertSchedules = async () => {
      const convertedOrders = await Promise.all(schedules.map(convertScheduleToOrder));
      setOrders(convertedOrders);
    };
    
    convertSchedules();
  }, [schedules, kits, accessoriesByVehicleId]);

  // Convert selected schedule to order when it changes
  useEffect(() => {
    const convertSelected = async () => {
      if (selectedSchedule) {
        const order = await convertScheduleToOrder(selectedSchedule);
        setSelectedOrder(order);
      } else {
        setSelectedOrder(null);
      }
    };
    
    convertSelected();
  }, [selectedSchedule, kits, accessoriesByVehicleId]);

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
    // Find all schedules with the same customer_name (same group)
    const customerName = order.company_name;
    const groupSchedules = schedules.filter(s => s.customer_name === customerName);
    setDraggedSchedules(groupSchedules);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (columnId: string) => {
    if (draggedSchedules.length > 0) {
      try {
        const statusMap: Record<string, string> = {
          'scheduled': 'scheduled',
          'in_progress': 'in_progress',
          'completed': 'completed',
          'shipped': 'shipped',
        };
        
        const newStatus = statusMap[columnId] || 'scheduled';
        
        // Update all schedules in the group
        const scheduleIds = draggedSchedules.map(s => s.id);
        await supabase
          .from('kit_schedules')
          .update({ status: newStatus })
          .in('id', scheduleIds);
        
        onOrderUpdate();
        toast({
          title: "Status atualizado",
          description: `${draggedSchedules.length} pedido${draggedSchedules.length > 1 ? 's movidos' : ' movido'} para ${columns.find(c => c.id === columnId)?.title}`
        });
      } catch (error) {
        console.error("Error updating schedule status:", error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar status dos pedidos",
          variant: "destructive"
        });
      }
    }
    setDraggedSchedules([]);
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
                  ? "bg-primary w-6" 
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              title={column.title}
            />
          ))}
        </div>
      </div>

      {selectedSchedule && selectedOrder && (
        <OrderModal
          order={selectedOrder}
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
