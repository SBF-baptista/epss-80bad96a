
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Order } from "@/services/orderService";

interface DashboardFiltersProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  filters: {
    status: string;
    brand: string;
    configurationType: string;
  };
  onFiltersChange: (filters: any) => void;
  orders: Order[];
}

const DashboardFilters = ({ 
  dateRange, 
  onDateRangeChange, 
  filters, 
  onFiltersChange,
  orders 
}: DashboardFiltersProps) => {
  const [showCalendar, setShowCalendar] = useState(false);

  // Extract unique values for filters
  const statuses = [...new Set(orders.map(order => order.status))].filter(Boolean);
  const brands = [...new Set(orders.flatMap(order => 
    order.vehicles.map(v => v.brand)
  ))].filter(Boolean);
  const configTypes = [...new Set(orders.map(order => order.configurationType))].filter(Boolean);

  const clearFilters = () => {
    onFiltersChange({
      status: "",
      brand: "",
      configurationType: ""
    });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value === "all" ? "" : value
    });
  };

  const handleBrandChange = (value: string) => {
    onFiltersChange({
      ...filters,
      brand: value === "all" ? "" : value
    });
  };

  const handleConfigTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      configurationType: value === "all" ? "" : value
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <div className="flex gap-4 flex-wrap">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Período</label>
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-60 justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        onDateRangeChange({ from: range.from, to: range.to });
                        setShowCalendar(false);
                      }
                    }}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status || "all"} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Marca</label>
              <Select value={filters.brand || "all"} onValueChange={handleBrandChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todas as marcas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Configuração</label>
              <Select value={filters.configurationType || "all"} onValueChange={handleConfigTypeChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas as configurações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {configTypes.map((config) => (
                    <SelectItem key={config} value={config}>
                      {config}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearFilters}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Limpar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardFilters;
