import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Button } from "@/components/ui/button";
import { useStates, useCities } from "@/hooks/useIBGEData";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface LocationSelectorProps {
  selectedUF: string;
  selectedCity: string;
  onUFChange: (value: string) => void;
  onCityChange: (value: string) => void;
  disabled?: boolean;
}

const LocationSelector = ({
  selectedUF,
  selectedCity,
  onUFChange,
  onCityChange,
  disabled = false,
}: LocationSelectorProps) => {
  const { states, loading: statesLoading, error: statesError } = useStates();
  const { cities, loading: citiesLoading, error: citiesError } = useCities(selectedUF);
  const [openUF, setOpenUF] = useState(false);
  const [openCity, setOpenCity] = useState(false);

  // Handle state change and reset city selection
  const handleUFChange = (value: string) => {
    onUFChange(value);
    onCityChange(''); // Reset city when state changes
    setOpenUF(false);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* UF Selection */}
      <div className="space-y-2">
        <Label>UF (Estado)</Label>
        <Popover open={openUF} onOpenChange={setOpenUF}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openUF}
              className="w-full justify-between"
              disabled={disabled || statesLoading}
            >
              {selectedUF
                ? states.find((state) => state.sigla === selectedUF)?.sigla + " - " + states.find((state) => state.sigla === selectedUF)?.nome
                : statesLoading ? "Carregando..." : "Selecione ou digite..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Digite para buscar ou escrever..." 
                value={selectedUF}
                onValueChange={(value) => {
                  onUFChange(value.toUpperCase());
                }}
              />
              <CommandList>
                <CommandEmpty>
                  {selectedUF ? `"${selectedUF}" será usado` : "Nenhum estado encontrado"}
                </CommandEmpty>
                <CommandGroup>
                  {states.map((state) => (
                    <CommandItem
                      key={state.sigla}
                      value={state.sigla}
                      onSelect={(value) => handleUFChange(value.toUpperCase())}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedUF === state.sigla ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {state.sigla} - {state.nome}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* City Selection */}
      <div className="space-y-2">
        <Label>Cidade</Label>
        <Popover open={openCity} onOpenChange={setOpenCity}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openCity}
              className="w-full justify-between"
              disabled={disabled}
            >
              {selectedCity || (citiesLoading ? "Carregando..." : "Selecione ou digite...")}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Digite para buscar ou escrever..." 
                value={selectedCity}
                onValueChange={(value) => {
                  onCityChange(value);
                }}
              />
              <CommandList>
                <CommandEmpty>
                  {selectedCity ? `"${selectedCity}" será usado` : selectedUF ? "Nenhuma cidade encontrada" : "Selecione um estado primeiro"}
                </CommandEmpty>
                {selectedUF && cities.length > 0 && (
                  <CommandGroup>
                    {cities.map((city) => (
                      <CommandItem
                        key={city}
                        value={city}
                        onSelect={(value) => {
                          onCityChange(value);
                          setOpenCity(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCity === city ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {city}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default LocationSelector;