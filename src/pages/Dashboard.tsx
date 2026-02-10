
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrders } from "@/services/orderService";
import DashboardKPIs from "@/components/dashboard/DashboardKPIs";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import ExecutiveSummary from "@/components/dashboard/ExecutiveSummary";
import OrdersByStatus from "@/components/dashboard/OrdersByStatus";
import OrdersByPeriod from "@/components/dashboard/OrdersByPeriod";
import ProcessFunnel from "@/components/dashboard/ProcessFunnel";
import AverageTimeByStage from "@/components/dashboard/AverageTimeByStage";
import OperationalIndicators from "@/components/dashboard/OperationalIndicators";
import OperationalInsights from "@/components/dashboard/OperationalInsights";
import TrackerDistribution from "@/components/dashboard/TrackerDistribution";
import StandbyAnalysis from "@/components/dashboard/StandbyAnalysis";
import ConfigurationTypes from "@/components/dashboard/ConfigurationTypes";
import VehicleDistribution from "@/components/dashboard/VehicleDistribution";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, BarChart3, AlertCircle } from "lucide-react";

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
    staleTime: 30000,
    retry: 2,
  });

  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    const isInDateRange = orderDate >= dateRange.from && orderDate <= dateRange.to;
    const matchesStatus = !filters.status || order.status === filters.status;
    const matchesBrand = !filters.brand || order.vehicles.some(v => v.brand.toLowerCase().includes(filters.brand.toLowerCase()));
    const matchesConfig = !filters.configurationType || order.configurationType.toLowerCase().includes(filters.configurationType.toLowerCase());
    return isInDateRange && matchesStatus && matchesBrand && matchesConfig;
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 bg-background min-h-full">
        <div className="max-w-[1400px] mx-auto space-y-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-background min-h-full flex items-center justify-center">
        <Card className="max-w-md w-full border-destructive/30">
          <CardContent className="p-6 text-center">
            <div className="p-3 rounded-full bg-destructive/10 w-fit mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Erro ao carregar dados</h3>
            <p className="text-sm text-muted-foreground mb-4">Não foi possível carregar os dados do dashboard.</p>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" /> Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5 bg-background min-h-full">
      <div className="max-w-[1400px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Dashboard Analítico
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Visão operacional da logística</p>
          </div>
          <Button onClick={() => refetch()} variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground">
            <RefreshCw className="h-3 w-3" /> Atualizar
          </Button>
        </div>

        {/* Filters */}
        <DashboardFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          filters={filters}
          onFiltersChange={setFilters}
          orders={orders}
        />

        {/* Executive Summary */}
        <ExecutiveSummary orders={filteredOrders} />

        {/* KPIs */}
        <DashboardKPIs orders={filteredOrders} />

        {/* Row 1: Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <OrdersByStatus orders={filteredOrders} />
          <OrdersByPeriod orders={filteredOrders} dateRange={dateRange} />
        </div>

        {/* Row 2: Funnel + Time by Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ProcessFunnel orders={filteredOrders} />
          <AverageTimeByStage orders={filteredOrders} />
        </div>

        {/* Row 3: Operational */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <OperationalIndicators orders={filteredOrders} />
          <OperationalInsights orders={filteredOrders} />
          <StandbyAnalysis orders={filteredOrders} />
        </div>

        {/* Row 4: Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <VehicleDistribution orders={filteredOrders} />
          <TrackerDistribution orders={filteredOrders} />
          <ConfigurationTypes orders={filteredOrders} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
