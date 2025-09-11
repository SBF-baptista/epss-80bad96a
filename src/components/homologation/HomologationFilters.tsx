import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Filter } from "lucide-react";
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

interface HomologationFiltersProps {
  cards: HomologationCard[];
  onFiltersChange: (filters: HomologationFilters) => void;
}

const HomologationFilters = ({ cards, onFiltersChange }: HomologationFiltersProps) => {
  const [filters, setFilters] = useState<HomologationFilters>({
    brand: "",
    year: "",
    searchText: ""
  });
  
  const [brandOpen, setBrandOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  // Extract unique brands from cards
  const availableBrands = useMemo(() => {
    const brands = [...new Set(cards.map(card => card.brand))].filter(Boolean);
    return brands.sort();
  }, [cards]);

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
      searchText: ""
    });
  };

  const hasActiveFilters = filters.brand || filters.year || filters.searchText;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
      <div className="flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
          </div>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Brand Filter */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Marca</label>
            <Popover open={brandOpen} onOpenChange={setBrandOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={brandOpen}
                  className="w-full justify-between text-left font-normal"
                >
                  {filters.brand || "Selecione uma marca..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar marca..." />
                  <CommandEmpty>Nenhuma marca encontrada.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {availableBrands.map((brand) => (
                        <CommandItem
                          key={brand}
                          value={brand}
                          onSelect={() => {
                            updateFilter("brand", brand);
                            setBrandOpen(false);
                          }}
                        >
                          {brand}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Year Filter */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Ano</label>
            <Popover open={yearOpen} onOpenChange={setYearOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={yearOpen}
                  className="w-full justify-between text-left font-normal"
                  disabled={!filters.brand || availableYears.length === 0}
                >
                  {filters.year || "Selecione um ano..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
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
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Busca Geral</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por modelo, configuração..."
                value={filters.searchText}
                onChange={(e) => updateFilter("searchText", e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
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
    </div>
  );
};

export default HomologationFilters;