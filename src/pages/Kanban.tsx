
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import KanbanBoard from "@/components/KanbanBoard";
import FilterBar from "@/components/FilterBar";
import NewOrderModal from "@/components/NewOrderModal";
import AutoOrderTestPanel from "@/components/AutoOrderTestPanel";
import { fetchOrders } from "@/services/orderService";
import { Button } from "@/components/ui/button";
import { Plus, TestTube } from "lucide-react";

const Kanban = () => {
  const [filters, setFilters] = useState({
    brand: "",
    model: "",
    configurationType: ""
  });
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
  });

  const filteredOrders = orders.filter(order => {
    const matchesBrand = !filters.brand || 
      order.vehicles.some(vehicle => 
        vehicle.brand.toLowerCase().includes(filters.brand.toLowerCase())
      );
    
    const matchesModel = !filters.model || 
      order.vehicles.some(vehicle => 
        vehicle.model.toLowerCase().includes(filters.model.toLowerCase())
      );
    
    const matchesConfig = !filters.configurationType || 
      order.configurationType.toLowerCase().includes(filters.configurationType.toLowerCase());
    
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
    <div className="p-3 md:p-6 bg-gray-50 min-h-full">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Setup Flow Kanban - Gestão de Pedidos</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => setShowTestPanel(!showTestPanel)}
              variant="outline"
              className="flex items-center gap-2 flex-1 sm:flex-none text-sm"
            >
              <TestTube className="h-4 w-4" />
              {showTestPanel ? "Ocultar" : "Testes"}
            </Button>
            <Button 
              onClick={() => setShowNewOrderModal(true)}
              className="flex items-center gap-2 flex-1 sm:flex-none text-sm"
            >
              <Plus className="h-4 w-4" />
              Novo Pedido
            </Button>
          </div>
        </div>

        {showTestPanel && (
          <AutoOrderTestPanel />
        )}

        <FilterBar 
          filters={filters}
          onFiltersChange={setFilters}
          orders={filteredOrders}
        />

        <KanbanBoard 
          orders={filteredOrders} 
          onOrderUpdate={refetch}
        />

        <NewOrderModal
          isOpen={showNewOrderModal}
          onClose={() => setShowNewOrderModal(false)}
          onOrderCreated={() => {
            setShowNewOrderModal(false);
            refetch();
          }}
        />
      </div>
    </div>
  );
};

export default Kanban;
