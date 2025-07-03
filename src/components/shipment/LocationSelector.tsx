import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStates, useCities } from "@/hooks/useIBGEData";
import { Loader2 } from "lucide-react";

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

  // Handle state change and reset city selection
  const handleUFChange = (value: string) => {
    onUFChange(value);
    onCityChange(''); // Reset city when state changes
  };

  return (
    <div className="space-y-4">
      {/* UF Selection */}
      <div className="space-y-2">
        <Label>UF (Estado)</Label>
        <Select value={selectedUF} onValueChange={handleUFChange} disabled={disabled || statesLoading}>
          <SelectTrigger>
            <SelectValue placeholder={statesLoading ? "Carregando estados..." : "Selecione o estado"} />
          </SelectTrigger>
          <SelectContent>
            {statesError ? (
              <SelectItem value="" disabled>
                Erro ao carregar estados
              </SelectItem>
            ) : (
              states.map((state) => (
                <SelectItem key={state.sigla} value={state.sigla}>
                  {state.sigla} - {state.nome}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* City Selection */}
      {selectedUF && (
        <div className="space-y-2">
          <Label>Cidade</Label>
          <Select value={selectedCity} onValueChange={onCityChange} disabled={disabled || citiesLoading}>
            <SelectTrigger>
              <SelectValue 
                placeholder={
                  citiesLoading 
                    ? "Carregando cidades..." 
                    : citiesError 
                    ? "Erro ao carregar cidades" 
                    : "Selecione a cidade"
                } 
              />
              {citiesLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </SelectTrigger>
            <SelectContent>
              {citiesError ? (
                <SelectItem value="" disabled>
                  Erro ao carregar cidades
                </SelectItem>
              ) : (
                cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;