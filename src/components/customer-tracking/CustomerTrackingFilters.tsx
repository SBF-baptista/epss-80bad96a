import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface CustomerTrackingFiltersProps {
  onSearch: (term: string) => void;
  searchTerm: string;
}

export const CustomerTrackingFilters = ({ onSearch, searchTerm }: CustomerTrackingFiltersProps) => {
  return (
    <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Pesquisar por nome ou CPF/CNPJ..."
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
    </div>
  );
};