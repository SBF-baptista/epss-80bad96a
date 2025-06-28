
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  // Extract unique values for filters
  const brands = [...new Set(orders.flatMap(order => 
    order.vehicles.map(v => v.brand)
  ))].filter(Boolean);
  
  const models = [...new Set(orders.flatMap(order => 
    order.vehicles.map(v => v.model)
  ))].filter(Boolean);
  
  const configTypes = [...new Set(orders.map(order => order.configurationType))].filter(Boolean);

  const clearFilters = () => {
    onFiltersChange({
      brand: "",
      model: "",
      configurationType: ""
    });
  };

  const handleBrandChange = (value: string) => {
    onFiltersChange({
      ...filters,
      brand: value === "all" ? "" : value
    });
  };

  const handleModelChange = (value: string) => {
    onFiltersChange({
      ...filters,
      model: value === "all" ? "" : value
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
              <label className="text-sm font-medium">Modelo</label>
              <Select value={filters.model || "all"} onValueChange={handleModelChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos os modelos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
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
            Limpar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilterBar;
