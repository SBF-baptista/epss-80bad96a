
import { useState, useRef, useEffect } from "react";
import KanbanColumn from "./KanbanColumn";
import OrderModal from "./OrderModal";
import { KitScheduleWithDetails } from "@/services/kitScheduleService";
import { HomologationKit } from "@/types/homologationKit";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/services/orderService";
import { supabase } from "@/integrations/supabase/client";
import { fetchAccessoriesByVehicleIds, fetchAccessoriesByPlates, aggregateAccessoriesWithoutModulesToObjects, VehicleAccessory } from "@/services/vehicleAccessoryService";
import { logKanbanMove } from "@/services/logService";

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
  const [modalMode, setModalMode] = useState<"scanner" | "details">("scanner");
  const [activeScrollIndex, setActiveScrollIndex] = useState(0);
  const [accessoriesByVehicleId, setAccessoriesByVehicleId] = useState<Map<string, VehicleAccessory[]>>(new Map());
  const [orders, setOrders] = useState<Order[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch real accessories from database by vehicle IDs and fallback to plates
  useEffect(() => {
    const fetchAccessories = async () => {
      const formattedMap = new Map<string, VehicleAccessory[]>();
      
      // First, try to fetch by incoming_vehicle_id
      const vehicleIds = schedules
        .map(s => s.incoming_vehicle_id)
        .filter((id): id is string => !!id);
      
      if (vehicleIds.length > 0) {
        try {
          const accessoriesMap = await fetchAccessoriesByVehicleIds(vehicleIds);
          accessoriesMap.forEach((accessories, vehicleId) => {
            formattedMap.set(vehicleId, accessories);
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
                const syntheticKey = `plate-${schedule.vehicle_plate}`;
                formattedMap.set(syntheticKey, accessories);
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
    
    // Get real accessories from database - use ONLY ONE source to avoid duplication
    let accessoriesList: { name: string; quantity: number }[] = [];
    
    // Priority 1: Get from incoming_vehicle_id
    if (schedule.incoming_vehicle_id) {
      const rawAccessories = accessoriesByVehicleId.get(schedule.incoming_vehicle_id) || [];
      if (rawAccessories.length > 0) {
        accessoriesList = aggregateAccessoriesWithoutModulesToObjects(rawAccessories);
      }
    }
    
    // Priority 2: Fallback to plate-based lookup ONLY if no incoming_vehicle_id data
    if (accessoriesList.length === 0 && schedule.vehicle_plate && schedule.vehicle_plate !== 'Placa pendente') {
      const syntheticKey = `plate-${schedule.vehicle_plate}`;
      const rawAccessories = accessoriesByVehicleId.get(syntheticKey) || [];
      if (rawAccessories.length > 0) {
        accessoriesList = aggregateAccessoriesWithoutModulesToObjects(rawAccessories);
      }
    }
    
    // Priority 3: Use schedule.accessories ONLY if no database data found
    if (accessoriesList.length === 0 && Array.isArray(schedule.accessories) && schedule.accessories.length > 0) {
      // Detect corrupted arrays (duplicated data) - ignore if > 10 items
      const isCorruptedArray = schedule.accessories.length > 10;
      
      if (!isCorruptedArray) {
        accessoriesList = schedule.accessories.map((name) => ({ name, quantity: 1 }));
      }
    }
    
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
      customer_phone: schedule.customer_phone,
      customer_email: schedule.customer_email,
      customer_document_number: schedule.customer_document_number,
      installation_address_street: schedule.installation_address_street,
      installation_address_number: schedule.installation_address_number,
      installation_address_neighborhood: schedule.installation_address_neighborhood,
      installation_address_city: schedule.installation_address_city,
      installation_address_state: schedule.installation_address_state,
      installation_address_postal_code: schedule.installation_address_postal_code,
      installation_address_complement: schedule.installation_address_complement,
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
      // New fields for Kanban cards
      plate: schedule.vehicle_plate || undefined,
      year: schedule.vehicle_year?.toString(),
      scheduledDate: schedule.scheduled_date,
      scheduledTime: schedule.installation_time || undefined,
      configuration: (schedule as any).configuration || kit?.name || undefined,
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
    // Find only the specific schedule being dragged (each vehicle is independent)
    const schedule = schedules.find(s => s.id === order.id);
    setDraggedSchedules(schedule ? [schedule] : []);
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
        const previousStatus = draggedSchedules[0].status;
        
        // Validate tracking code is required before moving to "shipped"
        if (newStatus === 'shipped') {
          const schedulesWithoutTracking = draggedSchedules.filter(s => !s.tracking_code || s.tracking_code.trim() === '');
          if (schedulesWithoutTracking.length > 0) {
            toast({
              title: "Código de rastreio obrigatório",
              description: "Preencha o código de rastreio antes de mover para Enviado",
              variant: "destructive"
            });
            setDraggedSchedules([]);
            return;
          }
        }
        
        const targetColumn = columns.find(c => c.id === columnId);
        const previousColumn = columns.find(c => {
          const reverseMap: Record<string, string> = {
            'scheduled': 'scheduled',
            'in_progress': 'in_progress',
            'completed': 'completed',
            'shipped': 'shipped',
          };
          return reverseMap[previousStatus] === c.id;
        });
        
        // Update all schedules in the group
        const scheduleIds = draggedSchedules.map(s => s.id);
        await supabase
          .from('kit_schedules')
          .update({ status: newStatus })
          .in('id', scheduleIds);
        
        // Log each movement
        for (const schedule of draggedSchedules) {
          await logKanbanMove(
            "Pedidos",
            schedule.id,
            previousColumn?.title || previousStatus,
            targetColumn?.title || columnId,
            schedule.customer_name || "Cliente não identificado"
          );
        }
        
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
              if (schedule) {
                setModalMode("scanner");
                setSelectedSchedule(schedule);
              }
            }}
            onOrderViewDetailsClick={(order) => {
              const schedule = schedules.find(s => s.id === order.id);
              if (schedule) {
                setModalMode("details");
                setSelectedSchedule(schedule);
              }
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
                  if (schedule) {
                    setModalMode("scanner");
                    setSelectedSchedule(schedule);
                  }
                }}
                onOrderViewDetailsClick={(order) => {
                  const schedule = schedules.find(s => s.id === order.id);
                  if (schedule) {
                    setModalMode("details");
                    setSelectedSchedule(schedule);
                  }
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
          viewMode={modalMode}
        />
      )}
    </>
  );
};

export default KanbanBoard;
