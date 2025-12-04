import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useFipeBrands, useFipeModels } from '@/hooks/useFipeData';
import { getCustomVehicleModels, createCustomVehicleModel, CustomVehicleModel } from '@/services/customVehicleModelService';
import { toast } from 'sonner';

interface VehicleModelComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  brandCode?: string;
  brandName?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function VehicleModelCombobox({
  value,
  onValueChange,
  brandCode,
  brandName,
  placeholder = 'Selecione o modelo...',
  disabled = false,
}: VehicleModelComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customModels, setCustomModels] = useState<CustomVehicleModel[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [creating, setCreating] = useState(false);

  const { models: fipeModels, loading: loadingFipe } = useFipeModels(brandCode || '');

  // Load custom models when brand changes
  useEffect(() => {
    const loadCustomModels = async () => {
      if (!brandCode) {
        setCustomModels([]);
        return;
      }
      
      setLoadingCustom(true);
      try {
        const models = await getCustomVehicleModels(brandCode);
        setCustomModels(models);
      } catch (error) {
        console.error('Error loading custom models:', error);
      } finally {
        setLoadingCustom(false);
      }
    };

    loadCustomModels();
  }, [brandCode]);

  // Combine FIPE models with custom models
  const allModels = useMemo(() => {
    const fipeModelList = fipeModels.map(m => ({
      code: m.code,
      name: m.name,
      isCustom: false,
    }));

    const customModelList = customModels.map(m => ({
      code: `custom_${m.id}`,
      name: m.model_name,
      isCustom: true,
    }));

    // Merge and remove duplicates (custom overrides FIPE if same name)
    const merged = [...fipeModelList];
    customModelList.forEach(custom => {
      const exists = merged.some(m => m.name.toLowerCase() === custom.name.toLowerCase());
      if (!exists) {
        merged.push(custom);
      }
    });

    return merged.sort((a, b) => a.name.localeCompare(b.name));
  }, [fipeModels, customModels]);

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    if (!searchQuery) return allModels;
    const query = searchQuery.toLowerCase();
    return allModels.filter(m => m.name.toLowerCase().includes(query));
  }, [allModels, searchQuery]);

  // Check if we should show "Create new" option
  const showCreateOption = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return false;
    const query = searchQuery.toLowerCase();
    return !allModels.some(m => m.name.toLowerCase() === query);
  }, [searchQuery, allModels]);

  const handleCreateModel = async () => {
    if (!brandCode || !brandName || !searchQuery) return;

    setCreating(true);
    try {
      const newModel = await createCustomVehicleModel(brandCode, brandName, searchQuery);
      if (newModel) {
        setCustomModels(prev => [...prev, newModel]);
        onValueChange(searchQuery);
        setOpen(false);
        setSearchQuery('');
        toast.success(`Modelo "${searchQuery}" criado com sucesso!`);
      } else {
        // Model already exists, just select it
        onValueChange(searchQuery);
        setOpen(false);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Error creating model:', error);
      toast.error('Erro ao criar modelo');
    } finally {
      setCreating(false);
    }
  };

  const isLoading = loadingFipe || loadingCustom;

  const selectedLabel = value || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled || !brandCode}
        >
          <span className="truncate">
            {value || placeholder}
          </span>
          {isLoading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-background border shadow-lg z-50" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Pesquisar modelo..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {filteredModels.length === 0 && !showCreateOption && (
                  <CommandEmpty>Nenhum modelo encontrado.</CommandEmpty>
                )}

                {filteredModels.length > 0 && (
                  <CommandGroup heading="Modelos disponíveis">
                    {filteredModels.slice(0, 100).map((model) => (
                      <CommandItem
                        key={model.code}
                        value={model.name}
                        onSelect={() => {
                          onValueChange(model.name);
                          setOpen(false);
                          setSearchQuery('');
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === model.name ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="flex-1 truncate">{model.name}</span>
                        {model.isCustom && (
                          <span className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            Customizado
                          </span>
                        )}
                      </CommandItem>
                    ))}
                    {filteredModels.length > 100 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        Mostrando 100 de {filteredModels.length} resultados. Digite para filtrar.
                      </div>
                    )}
                  </CommandGroup>
                )}

                {showCreateOption && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Criar novo modelo">
                      <CommandItem
                        onSelect={handleCreateModel}
                        className="cursor-pointer"
                        disabled={creating}
                      >
                        {creating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        <span>Criar "{searchQuery}"</span>
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
