
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
    <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm">
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
          <div className="flex gap-3 md:gap-4 flex-wrap flex-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Marca
              </label>
              <Select value={filters.brand || "all"} onValueChange={handleBrandChange}>
                <SelectTrigger className="w-36 md:w-40 h-10 border-border/60 bg-background focus:ring-2 focus:ring-primary/20 transition-all">
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

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Modelo
              </label>
              <Select value={filters.model || "all"} onValueChange={handleModelChange}>
                <SelectTrigger className="w-36 md:w-40 h-10 border-border/60 bg-background focus:ring-2 focus:ring-primary/20 transition-all">
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

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Configuração
              </label>
              <Select value={filters.configurationType || "all"} onValueChange={handleConfigTypeChange}>
                <SelectTrigger className="w-40 md:w-48 h-10 border-border/60 bg-background focus:ring-2 focus:ring-primary/20 transition-all">
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
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 h-10 px-3"
          >
            <X className="h-3.5 w-3.5" />
            <span className="text-sm">Limpar</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilterBar;
