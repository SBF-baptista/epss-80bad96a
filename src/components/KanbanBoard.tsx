
import { useState, useRef, useEffect } from "react";
import KanbanColumn from "./KanbanColumn";
import OrderModal from "./OrderModal";
import { KitScheduleWithDetails } from "@/services/kitScheduleService";
import { HomologationKit } from "@/types/homologationKit";
import { Order } from "@/services/orderService";
import { supabase } from "@/integrations/supabase/client";
import { fetchAccessoriesByVehicleIds, fetchAccessoriesByPlates, aggregateAccessoriesWithoutModulesToObjects, VehicleAccessory } from "@/services/vehicleAccessoryService";
import { logKanbanMove } from "@/services/logService";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const FREE_DRAG_EMAILS = ["pedro.albuquerque@segsat.com"];
const STATUS_TITLES: Record<string, string> = { scheduled: "Pedidos", counting: "Contagem", in_progress: "Em Produção", verifying: "Em Verificação", completed: "Aguardando Envio", shipped: "Enviado" };

interface KanbanBoardProps {
  schedules: KitScheduleWithDetails[];
  kits: HomologationKit[];
  onOrderUpdate: () => void;
  onScanClick?: (order: Order) => void;
  onShipmentClick?: (order: Order) => void;
  onCheckClick?: (order: Order, stage: "counting" | "verification") => void;
  mode?: "production" | "expedition";
}

const productionColumns = [
  { id: "scheduled", title: "Pedidos", color: "bg-primary/5 hover:bg-primary/8" },
  { id: "counting", title: "Contagem", color: "bg-warning-light/40 hover:bg-warning-light/50" },
  { id: "in_progress", title: "Em Produção", color: "bg-warning-light/40 hover:bg-warning-light/50" },
  { id: "verifying", title: "Em Verificação", color: "bg-primary/5 hover:bg-primary/8" },
];

const expeditionColumns = [
  { id: "completed", title: "Aguardando Envio", color: "bg-warning-light/40 hover:bg-warning-light/50" },
  { id: "shipped", title: "Enviado", color: "bg-success-light/40 hover:bg-success-light/50" },
];

const KanbanBoard = ({ schedules, kits, onOrderUpdate, onScanClick, onShipmentClick, onCheckClick, mode = "production" }: KanbanBoardProps) => {
  const columns = mode === "production" ? productionColumns : expeditionColumns;
  const [selectedSchedule, setSelectedSchedule] = useState<KitScheduleWithDetails | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalMode, setModalMode] = useState<"scanner" | "details">("scanner");
  const [activeScrollIndex, setActiveScrollIndex] = useState(0);
  const [accessoriesByVehicleId, setAccessoriesByVehicleId] = useState<Map<string, VehicleAccessory[]>>(new Map());
  const [orders, setOrders] = useState<Order[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const canFreeDrag = !!user?.email && FREE_DRAG_EMAILS.includes(user.email.toLowerCase());
  const draggedRef = useRef<Order | null>(null);

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
              schedule.status === 'counting' ? 'contagem' :
              schedule.status === 'in_progress' ? 'producao' :
              schedule.status === 'verifying' ? 'verificacao' :
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
      modules: kit?.modules?.map((item) => ({ name: item.item_name, quantity: item.quantity })) || [],
      supplies: kit?.supplies?.map((item) => ({ name: item.item_name, quantity: item.quantity })) || [],
      technicianName: schedule.technician?.name,
      // New fields for Kanban cards
      plate: schedule.vehicle_plate || undefined,
      year: schedule.vehicle_year?.toString(),
      scheduledDate: schedule.scheduled_date,
      scheduledTime: schedule.installation_time || undefined,
      configuration: (schedule as any).configuration || kit?.name || undefined,
      trackingCode: schedule.tracking_code || undefined,
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetStatus: string) => {
    const order = draggedRef.current;
    draggedRef.current = null;
    if (!canFreeDrag || !order) return;
    const schedule = schedules.find(s => s.id === order.id);
    if (!schedule || schedule.status === targetStatus) return;
    const { error } = await supabase.from("kit_schedules").update({ status: targetStatus }).eq("id", order.id);
    if (error) { toast.error("Não foi possível mover o card"); return; }
    await logKanbanMove(mode === "production" ? "Produção" : "Expedição", order.id, STATUS_TITLES[schedule.status || ""] || schedule.status || "", STATUS_TITLES[targetStatus] || targetStatus, order.company_name || "Cliente não identificado");
    toast.success(`Card movido para ${STATUS_TITLES[targetStatus] || targetStatus}`);
    onOrderUpdate();
  };

  const handleWorkflow = async (order: Order, status: string) => {
    if (status === "scheduled") {
      const { error } = await supabase.from("kit_schedules").update({ status: "counting" }).eq("id", order.id);
      if (error) throw error;
      await logKanbanMove("Produção", order.id, "Pedidos", "Contagem", order.company_name || "Cliente não identificado");
      onOrderUpdate();
      return;
    }
    if (status === "counting") onCheckClick?.(order, "counting");
    if (status === "in_progress") onScanClick?.(order);
    if (status === "verifying") onCheckClick?.(order, "verification");
    if (status === "completed" || status === "shipped") onShipmentClick?.(order);
  };

  const getOrdersByStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'scheduled': 'novos',
      'counting': 'contagem',
      'in_progress': 'producao',
      'verifying': 'verificacao',
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
            status={column.id}
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
            onDragStart={(o) => { draggedRef.current = o; }}
            canDrag={canFreeDrag}
            onScanClick={onScanClick}
            onShipmentClick={onShipmentClick}
            onWorkflowClick={(order) => handleWorkflow(order, column.id)}
            workflowLabel={column.id === "scheduled" ? "Iniciar contagem" : column.id === "counting" ? "Conferir itens" : column.id === "in_progress" ? "Registrar produção" : column.id === "verifying" ? "Fazer verificação" : column.id === "completed" ? "Preparar envio" : "Ver envio"}
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
                status={column.id}
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
                onDragStart={(o) => { draggedRef.current = o; }}
            canDrag={canFreeDrag}
                onScanClick={onScanClick}
                onShipmentClick={onShipmentClick}
                onWorkflowClick={(order) => handleWorkflow(order, column.id)}
                workflowLabel={column.id === "scheduled" ? "Iniciar contagem" : column.id === "counting" ? "Conferir itens" : column.id === "in_progress" ? "Registrar produção" : column.id === "verifying" ? "Fazer verificação" : column.id === "completed" ? "Preparar envio" : "Ver envio"}
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
