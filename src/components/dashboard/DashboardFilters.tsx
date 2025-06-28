
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const updateFilter = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({ status: "", brand: "", configurationType: "" });
    onDateRangeChange({ 
      from: new Date(new Date().setDate(new Date().getDate() - 30)), 
      to: new Date() 
    });
  };

  const activeFilters = Object.values(filters).filter(value => value.length > 0).length;

  const statusOptions = [
    { value: "", label: "Todos os status" },
    { value: "novos", label: "Novos Pedidos" },
    { value: "producao", label: "Em Produção" },
    { value: "aguardando", label: "Aguardando Envio" },
    { value: "enviado", label: "Enviado" },
    { value: "standby", label: "Em Stand-by" }
  ];

  return (
    <Card className="w-full max-w-4xl">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Filtros</h3>
            <div className="flex items-center gap-2">
              {activeFilters > 0 && (
                <span className="text-sm text-gray-600">
                  {activeFilters} filtro{activeFilters > 1 ? 's' : ''} ativo{activeFilters > 1 ? 's' : ''}
                </span>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "dd/MM", { locale: ptBR })} - {format(dateRange.to, "dd/MM", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        onDateRangeChange({ from: range.from, to: range.to });
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => updateFilter("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input
                placeholder="Filtrar por marca..."
                value={filters.brand}
                onChange={(e) => updateFilter("brand", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Configuração</Label>
              <Input
                placeholder="Filtrar por configuração..."
                value={filters.configurationType}
                onChange={(e) => updateFilter("configurationType", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Total Filtrado</Label>
              <div className="h-10 flex items-center justify-center bg-gray-50 rounded-md border">
                <span className="font-semibold text-gray-900">
                  {orders.filter(order => {
                    const orderDate = new Date(order.createdAt);
                    const isInDateRange = orderDate >= dateRange.from && orderDate <= dateRange.to;
                    const matchesStatus = !filters.status || order.status === filters.status;
                    const matchesBrand = !filters.brand || 
                      order.vehicles.some(v => v.brand.toLowerCase().includes(filters.brand.toLowerCase()));
                    const matchesConfig = !filters.configurationType || 
                      order.configurationType.toLowerCase().includes(filters.configurationType.toLowerCase());
                    return isInDateRange && matchesStatus && matchesBrand && matchesConfig;
                  }).length} pedidos
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardFilters;
