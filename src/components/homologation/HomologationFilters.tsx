import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter, Truck, Car } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HomologationCard, type HomologationFilters } from "@/services/homologationService";
import { useVehicleCategories } from "@/hooks/useVehicleCategories";
import { cn } from "@/lib/utils";

interface HomologationFiltersProps {
  cards: HomologationCard[];
  onFiltersChange: (filters: HomologationFilters) => void;
}

const HomologationFilters = ({ cards, onFiltersChange }: HomologationFiltersProps) => {
  const [filters, setFilters] = useState<HomologationFilters>({
    brand: "",
    year: "",
    searchText: "",
    category: ""
  });
  
  const [brandOpen, setBrandOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  
  const { groupedBrands, getBrandCategory } = useVehicleCategories();

  // Extract unique brands from cards, combined with standard brands
  const availableBrands = useMemo(() => {
    const cardBrands = [...new Set(cards.map(card => card.brand))].filter(Boolean);
    const allBrands = [...new Set([...Object.values(groupedBrands).flat(), ...cardBrands])];
    
    // Filter by category if selected
    if (filters.category && (filters.category === "HCV" || filters.category === "LCV")) {
      return allBrands.filter(brand => {
        const brandCategories = getBrandCategory(brand);
        return brandCategories.includes(filters.category as "HCV" | "LCV");
      }).sort();
    }
    
    return allBrands.sort();
  }, [cards, groupedBrands, getBrandCategory, filters.category]);

  // Extract years for selected brand
  const availableYears = useMemo(() => {
    if (!filters.brand) return [];
    const years = [...new Set(
      cards
        .filter(card => card.brand === filters.brand && card.year)
        .map(card => card.year)
    )].filter(Boolean);
    return years.sort((a, b) => (b as number) - (a as number));
  }, [cards, filters.brand]);

  // Reset year when brand changes
  useEffect(() => {
    if (filters.brand && !availableYears.includes(filters.year as any)) {
      setFilters(prev => ({ ...prev, year: "" }));
    }
  }, [filters.brand, availableYears]);

  // Notify parent component when filters change
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const updateFilter = (key: keyof HomologationFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      brand: "",
      year: "",
      searchText: "",
      category: ""
    });
  };

  const hasActiveFilters = filters.brand || filters.year || filters.searchText || filters.category;

  return (
    <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">Filtrar por</h3>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Category Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Categoria</label>
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={categoryOpen}
                  className="w-full justify-between text-left font-normal h-9 border-border/50 hover:border-border"
                >
                  <div className="flex items-center gap-2">
                    {filters.category === "HCV" && (
                      <>
                        <Truck className="h-4 w-4 text-orange-600" />
                        <span>Pesados (HCV)</span>
                      </>
                    )}
                    {filters.category === "LCV" && (
                      <>
                        <Car className="h-4 w-4 text-blue-600" />
                        <span>Leves (LCV)</span>
                      </>
                    )}
                    {!filters.category && (
                      <span className="text-muted-foreground">Todas as categorias...</span>
                    )}
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-background border shadow-md z-50" align="start">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      <CommandItem
                        value=""
                        onSelect={() => {
                          updateFilter("category", "");
                          setCategoryOpen(false);
                        }}
                      >
                        <span>Todas as categorias</span>
                      </CommandItem>
                      <CommandItem
                        value="HCV"
                        onSelect={() => {
                          updateFilter("category", "HCV");
                          setCategoryOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-orange-600" />
                          <span>Pesados (HCV)</span>
                          <Badge variant="secondary" className="ml-auto text-xs bg-orange-100 text-orange-800">
                            {groupedBrands.HCV.length} marcas
                          </Badge>
                        </div>
                      </CommandItem>
                      <CommandItem
                        value="LCV"
                        onSelect={() => {
                          updateFilter("category", "LCV");
                          setCategoryOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-blue-600" />
                          <span>Leves (LCV)</span>
                          <Badge variant="secondary" className="ml-auto text-xs bg-blue-100 text-blue-800">
                            {groupedBrands.LCV.length} marcas
                          </Badge>
                        </div>
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          {/* Brand Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Marca</label>
            <Popover open={brandOpen} onOpenChange={setBrandOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={brandOpen}
                  className="w-full justify-between text-left font-normal h-9 border-border/50 hover:border-border"
                >
                  <span className={filters.brand ? "text-foreground" : "text-muted-foreground"}>
                    {filters.brand || "Selecione..."}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-background border shadow-md z-50" align="start">
                <Command>
                  <CommandInput placeholder="Buscar marca..." />
                  <CommandEmpty>Nenhuma marca encontrada.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {availableBrands.map((brand) => {
                        const brandCategories = getBrandCategory(brand);
                        const categoryLabel = brandCategories.length > 1 ? "BOTH" : brandCategories[0] || "OTHER";
                        
                        return (
                          <CommandItem
                            key={brand}
                            value={brand}
                            onSelect={() => {
                              updateFilter("brand", brand);
                              setBrandOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2 w-full">
                              {categoryLabel === "HCV" && <Truck className="h-3 w-3 text-orange-600" />}
                              {categoryLabel === "LCV" && <Car className="h-3 w-3 text-blue-600" />}
                              {categoryLabel === "BOTH" && <span className="text-xs font-medium text-purple-600">H/L</span>}
                              <span>{brand}</span>
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "ml-auto text-xs",
                                  categoryLabel === "HCV" && "bg-orange-100 text-orange-800",
                                  categoryLabel === "LCV" && "bg-blue-100 text-blue-800",
                                  categoryLabel === "BOTH" && "bg-purple-100 text-purple-800"
                                )}
                              >
                                {categoryLabel === "BOTH" ? "H/L" : categoryLabel}
                              </Badge>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Year Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Ano</label>
            <Popover open={yearOpen} onOpenChange={setYearOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={yearOpen}
                  className="w-full justify-between text-left font-normal h-9 border-border/50 hover:border-border"
                  disabled={!filters.brand || availableYears.length === 0}
                >
                  <span className={filters.year ? "text-foreground" : "text-muted-foreground"}>
                    {filters.year || "Selecione..."}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-background border shadow-md z-50" align="start">
                <Command>
                  <CommandInput placeholder="Buscar ano..." />
                  <CommandEmpty>Nenhum ano encontrado.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {availableYears.map((year) => (
                        <CommandItem
                          key={year}
                          value={year?.toString()}
                          onSelect={() => {
                            updateFilter("year", year?.toString() || "");
                            setYearOpen(false);
                          }}
                        >
                          {year}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Search Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Busca geral</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 h-3.5 w-3.5" />
              <Input
                placeholder="Modelo, configuração..."
                value={filters.searchText}
                onChange={(e) => updateFilter("searchText", e.target.value)}
                className="pl-8 h-9 border-border/50 focus:border-border text-sm"
              />
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {filters.category && (
              <span className={cn(
                "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium gap-1",
                filters.category === "HCV" && "bg-orange-100 text-orange-800",
                filters.category === "LCV" && "bg-blue-100 text-blue-800"
              )}>
                {filters.category === "HCV" && <Truck className="h-3 w-3" />}
                {filters.category === "LCV" && <Car className="h-3 w-3" />}
                Categoria: {filters.category === "HCV" ? "Pesados" : "Leves"}
                <button
                  onClick={() => updateFilter("category", "")}
                  className={cn(
                    "ml-1 rounded-full p-0.5",
                    filters.category === "HCV" && "hover:bg-orange-200",
                    filters.category === "LCV" && "hover:bg-blue-200"
                  )}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.brand && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Marca: {filters.brand}
                <button
                  onClick={() => updateFilter("brand", "")}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.year && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Ano: {filters.year}
                <button
                  onClick={() => updateFilter("year", "")}
                  className="ml-1 hover:bg-green-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.searchText && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Busca: {filters.searchText}
                <button
                  onClick={() => updateFilter("searchText", "")}
                  className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>
  );
};

export default HomologationFilters;