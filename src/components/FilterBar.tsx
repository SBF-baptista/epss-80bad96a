
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Order } from "@/services/orderService";

interface FilterBarProps {
  filters: {
    brand: string;
    model: string;
    configurationType: string;
  };
  onFiltersChange: (filters: any) => void;
  orders: Order[];
}

const FilterBar = ({ filters, onFiltersChange, orders }: FilterBarProps) => {
  const updateFilter = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const totalOrders = orders.length;
  const activeFilters = Object.values(filters).filter(value => value.length > 0).length;

  return (
    <Card className="p-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>{totalOrders} pedidos</span>
            {activeFilters > 0 && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
                {activeFilters} filtro{activeFilters > 1 ? 's' : ''} ativo{activeFilters > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brand">Marca</Label>
            <Input
              id="brand"
              placeholder="Filtrar por marca..."
              value={filters.brand}
              onChange={(e) => updateFilter("brand", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Modelo</Label>
            <Input
              id="model"
              placeholder="Filtrar por modelo..."
              value={filters.model}
              onChange={(e) => updateFilter("model", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="configurationType">Tipo de Configuração</Label>
            <Input
              id="configurationType"
              placeholder="Filtrar por configuração..."
              value={filters.configurationType}
              onChange={(e) => updateFilter("configurationType", e.target.value)}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default FilterBar;
