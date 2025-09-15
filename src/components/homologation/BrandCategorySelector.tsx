import { useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronDown, Truck, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVehicleCategories } from '@/hooks/useVehicleCategories';

interface BrandCategorySelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  showCategoryBadges?: boolean;
  allowCustomBrands?: boolean;
}

export const BrandCategorySelector = ({
  value,
  onValueChange,
  placeholder = "Selecione uma marca...",
  showCategoryBadges = true,
  allowCustomBrands = false
}: BrandCategorySelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  
  const { 
    groupedBrands, 
    getBrandCategory, 
    searchBrands 
  } = useVehicleCategories();

  const searchResults = searchBrands(searchValue);
  
  const getCategoryIcon = (category: "HCV" | "LCV" | "BOTH") => {
    switch (category) {
      case "HCV": return <Truck className="h-3 w-3" />;
      case "LCV": return <Car className="h-3 w-3" />;
      case "BOTH": return <span className="text-xs">H/L</span>;
      default: return null;
    }
  };

  const getCategoryColor = (category: "HCV" | "LCV" | "BOTH") => {
    switch (category) {
      case "HCV": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "LCV": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "BOTH": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue === value ? "" : selectedValue);
    setOpen(false);
    setSearchValue('');
  };

  const handleCustomBrand = () => {
    if (allowCustomBrands && searchValue && !searchResults.some(brand => brand.value === searchValue)) {
      onValueChange(searchValue);
      setOpen(false);
      setSearchValue('');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between min-w-[200px]"
        >
          <div className="flex items-center gap-2">
            {value ? (
              <>
                {showCategoryBadges && (
                  <Badge 
                    variant="secondary" 
                    className={cn("text-xs px-1 py-0.5", getCategoryColor(getBrandCategory(value)[0] || "BOTH"))}
                  >
                    {getCategoryIcon(getBrandCategory(value)[0] || "BOTH")}
                  </Badge>
                )}
                <span>{value}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput 
            placeholder="Buscar marca..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {allowCustomBrands && searchValue ? (
                <div className="p-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleCustomBrand}
                    className="w-full text-left justify-start"
                  >
                    Adicionar "{searchValue}" como nova marca
                  </Button>
                </div>
              ) : (
                "Nenhuma marca encontrada."
              )}
            </CommandEmpty>
            
            {/* Veículos Pesados */}
            <CommandGroup heading="Veículos Pesados (HCV)">
              {groupedBrands.HCV
                .filter(brand => !searchValue || brand.toLowerCase().includes(searchValue.toLowerCase()))
                .map((brand) => (
                <CommandItem
                  key={brand}
                  value={brand}
                  onSelect={handleSelect}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === brand ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Truck className="h-3 w-3 text-orange-600" />
                  <span>{brand}</span>
                  {showCategoryBadges && (
                    <Badge variant="secondary" className="ml-auto text-xs bg-orange-100 text-orange-800">
                      HCV
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            {/* Veículos Leves */}
            <CommandGroup heading="Veículos Leves (LCV)">
              {groupedBrands.LCV
                .filter(brand => !searchValue || brand.toLowerCase().includes(searchValue.toLowerCase()))
                .map((brand) => (
                <CommandItem
                  key={brand}
                  value={brand}
                  onSelect={handleSelect}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === brand ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Car className="h-3 w-3 text-blue-600" />
                  <span>{brand}</span>
                  {showCategoryBadges && (
                    <Badge variant="secondary" className="ml-auto text-xs bg-blue-100 text-blue-800">
                      LCV
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            {/* Ambas Categorias */}
            {groupedBrands.BOTH.length > 0 && (
              <CommandGroup heading="Ambas Categorias">
                {groupedBrands.BOTH
                  .filter(brand => !searchValue || brand.toLowerCase().includes(searchValue.toLowerCase()))
                  .map((brand) => (
                  <CommandItem
                    key={brand}
                    value={brand}
                    onSelect={handleSelect}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === brand ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="text-xs font-medium text-purple-600">H/L</span>
                    <span>{brand}</span>
                    {showCategoryBadges && (
                      <Badge variant="secondary" className="ml-auto text-xs bg-purple-100 text-purple-800">
                        BOTH
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};