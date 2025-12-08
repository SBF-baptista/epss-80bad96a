
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import KanbanBoard from "@/components/KanbanBoard";
import FilterBar from "@/components/FilterBar";
import ProductionScannerModal from "@/components/ProductionScannerModal";
import ShipmentPreparationModal from "@/components/ShipmentPreparationModal";
import { fetchOrders } from "@/services/orderFetchService";
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

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['kanban-orders'],
    queryFn: fetchOrders,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Setup realtime subscription for automatic synchronization
  useRealtimeSubscription('pedidos', 'kanban-orders');

  const filteredOrders = orders.filter(order => {
    const vehicle = order.vehicles?.[0];
    const matchesBrand = !filters.brand || 
      vehicle?.brand?.toLowerCase().includes(filters.brand.toLowerCase());
    
    const matchesModel = !filters.model || 
      vehicle?.model?.toLowerCase().includes(filters.model.toLowerCase());
    
    const matchesConfig = !filters.configurationType || 
      order.configurationType?.toLowerCase().includes(filters.configurationType.toLowerCase());
    
    return matchesBrand && matchesModel && matchesConfig;
  });

  if (isLoading) {
    return (
      <div className="p-3 md:p-6 bg-background min-h-full">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-6 md:h-8 bg-muted rounded w-48 md:w-64 mb-4 md:mb-6"></div>
            <div className="h-16 md:h-24 bg-muted rounded mb-4 md:mb-6"></div>
            
            {/* Desktop skeleton */}
            <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-80 lg:h-96 bg-muted rounded"></div>
              ))}
            </div>
            
            {/* Mobile skeleton */}
            <div className="md:hidden flex gap-4 overflow-x-auto">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-80 h-80 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 bg-background min-h-full">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Setup Flow Kanban - Gestão de Pedidos</h2>
        </div>

        <FilterBar 
          filters={filters}
          onFiltersChange={setFilters}
          orders={filteredOrders}
        />

        <KanbanBoard 
          orders={filteredOrders}
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
