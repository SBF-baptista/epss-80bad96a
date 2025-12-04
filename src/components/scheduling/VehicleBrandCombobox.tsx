import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useFipeBrands } from '@/hooks/useFipeData';

interface VehicleBrandComboboxProps {
  value: string;
  onValueChange: (code: string, name: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function VehicleBrandCombobox({
  value,
  onValueChange,
  placeholder = 'Selecione a marca...',
  disabled = false,
}: VehicleBrandComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { brands, loading } = useFipeBrands();

  // Filter brands based on search query
  const filteredBrands = useMemo(() => {
    if (!searchQuery) return brands;
    const query = searchQuery.toLowerCase();
    return brands.filter(b => b.name.toLowerCase().includes(query));
  }, [brands, searchQuery]);

  const selectedBrand = brands.find(b => b.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedBrand?.name || placeholder}
          </span>
          {loading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-background border shadow-lg z-50" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Pesquisar marca..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {filteredBrands.length === 0 && (
                  <CommandEmpty>Nenhuma marca encontrada.</CommandEmpty>
                )}
                <CommandGroup>
                  {filteredBrands.map((brand) => (
                    <CommandItem
                      key={brand.code}
                      value={brand.name}
                      onSelect={() => {
                        onValueChange(brand.code, brand.name);
                        setOpen(false);
                        setSearchQuery('');
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === brand.code ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {brand.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
