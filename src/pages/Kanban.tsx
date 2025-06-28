
import { useState } from "react";
import KanbanBoard from "@/components/KanbanBoard";
import FilterBar from "@/components/FilterBar";
import { Button } from "@/components/ui/button";
import { FolderKanban, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface Order {
  id: string;
  number: string;
  brand: string;
  model: string;
  tracker: string;
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
    brand: "Mercedes-Benz",
    model: "75001",
    tracker: "Ruptella Smart5",
    configurationType: "HCV MERCEDES",
    status: "novos",
    priority: "high",
    createdAt: "2024-01-15",
    estimatedDelivery: "2024-01-25"
  },
  {
    id: "2",
    number: "002",
    brand: "Volvo",
    model: "FH540",
    tracker: "Ruptella ECO4",
    configurationType: "HCV VOLVO",
    status: "novos",
    priority: "medium",
    createdAt: "2024-01-16"
  },
  {
    id: "3",
    number: "003",
    brand: "Scania",
    model: "R450",
    tracker: "Ruptella Smart5",
    configurationType: "HCV SCANIA",
    status: "producao",
    priority: "high",
    createdAt: "2024-01-14",
    estimatedDelivery: "2024-01-22"
  },
  {
    id: "4",
    number: "004",
    brand: "Mercedes-Benz",
    model: "Actros",
    tracker: "Ruptella ECO4",
    configurationType: "HCV MERCEDES",
    status: "aguardando",
    priority: "low",
    createdAt: "2024-01-12"
  },
  {
    id: "5",
    number: "005",
    brand: "DAF",
    model: "XF480",
    tracker: "Ruptella Smart5",
    configurationType: "HCV DAF",
    status: "enviado",
    priority: "medium",
    createdAt: "2024-01-10",
    estimatedDelivery: "2024-01-20"
  },
  {
    id: "6",
    number: "006",
    brand: "Iveco",
    model: "Stralis",
    tracker: "Ruptella ECO4",
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
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/");
  };

  const filteredOrders = orders.filter(order => {
    return (
      (!filters.brand || order.brand.toLowerCase().includes(filters.brand.toLowerCase())) &&
      (!filters.model || order.model.toLowerCase().includes(filters.model.toLowerCase())) &&
      (!filters.configurationType || order.configurationType.toLowerCase().includes(filters.configurationType.toLowerCase()))
    );
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
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <FilterBar filters={filters} onFiltersChange={setFilters} orders={orders} />
      </div>

      {/* Kanban Board */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <KanbanBoard orders={filteredOrders} setOrders={setOrders} />
      </div>
    </div>
  );
};

export default Kanban;
