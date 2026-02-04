
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import KanbanBoard from "@/components/KanbanBoard";
import FilterBar from "@/components/FilterBar";
import ProductionScannerModal from "@/components/ProductionScannerModal";
import ShipmentPreparationModal from "@/components/ShipmentPreparationModal";
import { getKitSchedules } from "@/services/kitScheduleService";
import { fetchHomologationKits } from "@/services/homologationKitService";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Order } from "@/services/orderService";

const Kanban = () => {
  const [filters, setFilters] = useState({
    brand: "",
    model: "",
    configurationType: ""
  });
  
  const [selectedOrderForScanner, setSelectedOrderForScanner] = useState<Order | null>(null);
  const [selectedOrderForShipment, setSelectedOrderForShipment] = useState<Order | null>(null);

  const { data: schedules = [], isLoading, refetch } = useQuery({
    queryKey: ['kit-schedules'],
    queryFn: getKitSchedules,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: kits = [] } = useQuery({
    queryKey: ['homologation-kits'],
    queryFn: () => fetchHomologationKits(),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Setup realtime subscription for automatic synchronization
  useRealtimeSubscription('kit_schedules', 'kit-schedules');
  useRealtimeSubscription('homologation_kits', 'homologation-kits');

  const filteredSchedules = schedules.filter(schedule => {
    const matchesBrand = !filters.brand || 
      schedule.vehicle_brand?.toLowerCase().includes(filters.brand.toLowerCase());
    
    const matchesModel = !filters.model || 
      schedule.vehicle_model?.toLowerCase().includes(filters.model.toLowerCase());
    
    const matchesConfig = !filters.configurationType || 
      schedule.kit?.name?.toLowerCase().includes(filters.configurationType.toLowerCase());
    
    return matchesBrand && matchesModel && matchesConfig;
  });

  if (isLoading) {
    return (
      <div className="p-3 md:p-6 bg-gray-50 min-h-full">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-6 md:h-8 bg-gray-200 rounded w-48 md:w-64 mb-4 md:mb-6"></div>
            <div className="h-16 md:h-24 bg-gray-200 rounded mb-4 md:mb-6"></div>
            
            {/* Desktop skeleton */}
            <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-80 lg:h-96 bg-gray-200 rounded"></div>
              ))}
            </div>
            
            {/* Mobile skeleton */}
            <div className="md:hidden flex gap-4 overflow-x-auto">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-80 h-80 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-muted/30 min-h-full">
      <div className="max-w-7xl mx-auto space-y-5 md:space-y-6">
        {/* Enhanced page header */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Setup Flow Kanban
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Gestão de Pedidos
          </p>
        </div>

        <FilterBar 
          filters={filters}
          onFiltersChange={setFilters}
          orders={[]}
        />

        <KanbanBoard 
          schedules={filteredSchedules}
          kits={kits}
          onOrderUpdate={refetch}
          onScanClick={setSelectedOrderForScanner}
          onShipmentClick={setSelectedOrderForShipment}
        />
      </div>

      {/* Production Scanner Modal */}
      <ProductionScannerModal
        order={selectedOrderForScanner}
        isOpen={!!selectedOrderForScanner}
        onClose={() => setSelectedOrderForScanner(null)}
        onUpdate={refetch}
      />

      {/* Shipment Preparation Modal */}
      {selectedOrderForShipment && (
        <ShipmentPreparationModal
          order={selectedOrderForShipment}
          isOpen={!!selectedOrderForShipment}
          onClose={() => setSelectedOrderForShipment(null)}
          onUpdate={refetch}
        />
      )}
    </div>
  );
};

export default Kanban;
