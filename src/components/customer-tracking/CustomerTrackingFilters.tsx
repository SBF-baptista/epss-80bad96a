import { Input } from "@/components/ui/input";
import { Search, Car } from "lucide-react";

interface CustomerTrackingFiltersProps {
  onSearch: (term: string) => void;
  searchTerm: string;
  onPlateSearch: (term: string) => void;
  plateSearchTerm: string;
}

export const CustomerTrackingFilters = ({ 
  onSearch, 
  searchTerm, 
  onPlateSearch, 
  plateSearchTerm 
}: CustomerTrackingFiltersProps) => {
  return (
    <div className="bg-card p-4 rounded-xl shadow-sm border border-border/50">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Pesquisar por nome ou CPF/CNPJ..."
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10 h-10 bg-background border-border/60"
          />
        </div>
        <div className="w-full sm:w-64 relative">
          <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Pesquisar por placa..."
            value={plateSearchTerm}
            onChange={(e) => onPlateSearch(e.target.value)}
            className="pl-10 h-10 bg-background border-border/60"
          />
        </div>
      </div>
    </div>
  );
};