
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrders } from "@/services/orderService";
import DashboardKPIs from "@/components/dashboard/DashboardKPIs";
import OrdersByStatus from "@/components/dashboard/OrdersByStatus";
import OrdersByPeriod from "@/components/dashboard/OrdersByPeriod";
import VehicleDistribution from "@/components/dashboard/VehicleDistribution";
import TrackerDistribution from "@/components/dashboard/TrackerDistribution";
import ConfigurationTypes from "@/components/dashboard/ConfigurationTypes";
import StandbyAnalysis from "@/components/dashboard/StandbyAnalysis";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const Dashboard = () => {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  
  const [filters, setFilters] = useState({
    status: "",
    brand: "",
    configurationType: ""
  });

  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    staleTime: 30000, // Cache por 30 segundos
    retry: 2,
  });

  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    const isInDateRange = orderDate >= dateRange.from && orderDate <= dateRange.to;
    
    const matchesStatus = !filters.status || order.status === filters.status;
    const matchesBrand = !filters.brand || 
      order.vehicles.some(v => v.brand.toLowerCase().includes(filters.brand.toLowerCase()));
    const matchesConfig = !filters.configurationType || 
      order.configurationType.toLowerCase().includes(filters.configurationType.toLowerCase());
    
    return isInDateRange && matchesStatus && matchesBrand && matchesConfig;
  });

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-full">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-full">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Erro ao carregar dados
              </h3>
              <p className="text-red-700 mb-4">
                Não foi possível carregar os dados do dashboard. Por favor, tente novamente.
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Tentar Novamente
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 bg-gray-50 min-h-full">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Dashboard Analítico</h2>
        </div>

        <DashboardFilters 
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          filters={filters}
          onFiltersChange={setFilters}
          orders={orders}
        />

        <DashboardKPIs orders={filteredOrders} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <OrdersByStatus orders={filteredOrders} />
          <OrdersByPeriod orders={filteredOrders} dateRange={dateRange} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <VehicleDistribution orders={filteredOrders} />
          <TrackerDistribution orders={filteredOrders} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <ConfigurationTypes orders={filteredOrders} />
          <StandbyAnalysis orders={filteredOrders} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
