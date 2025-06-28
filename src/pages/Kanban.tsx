
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import KanbanBoard from "@/components/KanbanBoard";
import FilterBar from "@/components/FilterBar";
import NewOrderModal from "@/components/NewOrderModal";
import { Button } from "@/components/ui/button";
import { FolderKanban, LogOut, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchOrders, createOrder, Order } from "@/services/orderService";
import { useToast } from "@/hooks/use-toast";

export interface Vehicle {
  brand: string;
  model: string;
  quantity: number;
}

export interface Tracker {
  model: string;
  quantity: number;
}

const Kanban = () => {
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    brand: "",
    model: "",
    configurationType: ""
  });
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  const { data: orders = [], refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
  });

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso."
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Erro",
        description: "Erro ao fazer logout",
        variant: "destructive"
      });
    }
  };

  const handleAddOrder = async (newOrderData: {
    numero_pedido: string;
    vehicles: Vehicle[];
    trackers: Tracker[];
    configurationType: string;
  }) => {
    try {
      await createOrder({
        numero_pedido: newOrderData.numero_pedido,
        vehicles: newOrderData.vehicles,
        trackers: newOrderData.trackers,
        configurationType: newOrderData.configurationType
      });
      
      await refetch();
      setShowNewOrderModal(false);
      
      toast({
        title: "Pedido criado",
        description: "Novo pedido criado com sucesso!"
      });
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar pedido",
        variant: "destructive"
      });
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Setup Flow Kanban</h1>
                <p className="text-sm text-gray-600">Estoque e Expedição - {user?.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setShowNewOrderModal(true)}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Pedido</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <FilterBar filters={filters} onFiltersChange={setFilters} orders={filteredOrders} />
      </div>

      {/* Kanban Board */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <KanbanBoard orders={filteredOrders} onOrderUpdate={refetch} />
      </div>

      {/* New Order Modal */}
      <NewOrderModal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        onAddOrder={handleAddOrder}
      />
    </div>
  );
};

export default Kanban;
