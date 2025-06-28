
import { useState } from "react";
import KanbanBoard from "@/components/KanbanBoard";
import FilterBar from "@/components/FilterBar";
import NewOrderModal from "@/components/NewOrderModal";
import { Button } from "@/components/ui/button";
import { FolderKanban, LogOut, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface Vehicle {
  brand: string;
  model: string;
  quantity: number;
}

export interface Tracker {
  model: string;
  quantity: number;
}

export interface Order {
  id: string;
  number: string;
  vehicles: Vehicle[];
  trackers: Tracker[];
  configurationType: string;
  status: "novos" | "producao" | "aguardando" | "enviado" | "standby";
  priority?: "high" | "medium" | "low";
  createdAt: string;
  estimatedDelivery?: string;
}

const mockOrders: Order[] = [
  {
    id: "1",
    number: "001",
    vehicles: [
      { brand: "Mercedes-Benz", model: "75001", quantity: 2 },
      { brand: "Volvo", model: "FH540", quantity: 3 }
    ],
    trackers: [
      { model: "Ruptella Smart5", quantity: 4 },
      { model: "Queclink GV75", quantity: 1 }
    ],
    configurationType: "HCV MERCEDES",
    status: "novos",
    priority: "high",
    createdAt: "2024-01-15",
    estimatedDelivery: "2024-01-25"
  },
  {
    id: "2",
    number: "002",
    vehicles: [
      { brand: "Volvo", model: "FH540", quantity: 1 }
    ],
    trackers: [
      { model: "Ruptella ECO4", quantity: 1 }
    ],
    configurationType: "HCV VOLVO",
    status: "novos",
    priority: "medium",
    createdAt: "2024-01-16"
  },
  {
    id: "3",
    number: "003",
    vehicles: [
      { brand: "Scania", model: "R450", quantity: 1 }
    ],
    trackers: [
      { model: "Ruptella Smart5", quantity: 1 }
    ],
    configurationType: "HCV SCANIA",
    status: "producao",
    priority: "high",
    createdAt: "2024-01-14",
    estimatedDelivery: "2024-01-22"
  },
  {
    id: "4",
    number: "004",
    vehicles: [
      { brand: "Mercedes-Benz", model: "Actros", quantity: 1 }
    ],
    trackers: [
      { model: "Ruptella ECO4", quantity: 1 }
    ],
    configurationType: "HCV MERCEDES",
    status: "aguardando",
    priority: "low",
    createdAt: "2024-01-12"
  },
  {
    id: "5",
    number: "005",
    vehicles: [
      { brand: "DAF", model: "XF480", quantity: 1 }
    ],
    trackers: [
      { model: "Ruptella Smart5", quantity: 1 }
    ],
    configurationType: "HCV DAF",
    status: "enviado",
    priority: "medium",
    createdAt: "2024-01-10",
    estimatedDelivery: "2024-01-20"
  },
  {
    id: "6",
    number: "006",
    vehicles: [
      { brand: "Iveco", model: "Stralis", quantity: 1 }
    ],
    trackers: [
      { model: "Ruptella ECO4", quantity: 1 }
    ],
    configurationType: "HCV IVECO",
    status: "standby",
    priority: "high",
    createdAt: "2024-01-13"
  }
];

const Kanban = () => {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [filters, setFilters] = useState({
    brand: "",
    model: "",
    configurationType: ""
  });
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/");
  };

  const handleAddOrder = (newOrder: Omit<Order, "id" | "createdAt">) => {
    const order: Order = {
      ...newOrder,
      id: (orders.length + 1).toString(),
      createdAt: new Date().toISOString().split('T')[0],
      status: "novos"
    };
    setOrders([...orders, order]);
    setShowNewOrderModal(false);
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
                <p className="text-sm text-gray-600">Estoque e Expedição</p>
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
        <FilterBar filters={filters} onFiltersChange={setFilters} orders={orders} />
      </div>

      {/* Kanban Board */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <KanbanBoard orders={filteredOrders} setOrders={setOrders} />
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
