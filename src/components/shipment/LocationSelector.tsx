import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LocationSelectorProps {
  selectedUF: string;
  selectedCity: string;
  onUFChange: (value: string) => void;
  onCityChange: (value: string) => void;
  disabled?: boolean;
}

const brazilianStates = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const citiesByState: Record<string, string[]> = {
  "SP": ["São Paulo", "Campinas", "Santos", "Ribeirão Preto", "Sorocaba"],
  "RJ": ["Rio de Janeiro", "Niterói", "Duque de Caxias", "Nova Iguaçu", "São Gonçalo"],
  "MG": ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora", "Betim"],
  "RS": ["Porto Alegre", "Caxias do Sul", "Pelotas", "Canoas", "Santa Maria"],
  "PR": ["Curitiba", "Londrina", "Maringá", "Ponta Grossa", "Cascavel"],
};

const LocationSelector = ({
  selectedUF,
  selectedCity,
  onUFChange,
  onCityChange,
  disabled = false,
}: LocationSelectorProps) => {
  const getAvailableCities = () => {
    if (!selectedUF) return [];
    return citiesByState[selectedUF] || [];
  };

  return (
    <div className="space-y-4">
      {/* UF Selection */}
      <div className="space-y-2">
        <Label>UF (Estado)</Label>
        <Select value={selectedUF} onValueChange={onUFChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o estado" />
          </SelectTrigger>
          <SelectContent>
            {brazilianStates.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* City Selection */}
      {selectedUF && (
        <div className="space-y-2">
          <Label>Cidade</Label>
          <Select value={selectedCity} onValueChange={onCityChange} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a cidade" />
            </SelectTrigger>
            <SelectContent>
              {getAvailableCities().map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;