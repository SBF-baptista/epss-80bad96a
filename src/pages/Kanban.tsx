
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import KanbanBoard from "@/components/KanbanBoard";
import { fetchInstallationOrders } from "@/services/installationOrderService";

const Kanban = () => {
  const { data: installationOrders = [], isLoading, refetch } = useQuery({
    queryKey: ['installation-orders'],
    queryFn: fetchInstallationOrders,
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
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Kanban de Instalações</h2>
        </div>

        <KanbanBoard 
          installationOrders={installationOrders} 
          onOrderUpdate={refetch}
        />
      </div>
    </div>
  );
};

export default Kanban;
