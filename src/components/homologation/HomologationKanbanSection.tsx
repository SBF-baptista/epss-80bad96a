import HomologationKanban from "@/components/HomologationKanban";
import { HomologationCard, type HomologationFilters as HomologationFiltersType } from "@/services/homologationService";
import HomologationFiltersComponent from "./HomologationFilters";

interface HomologationKanbanSectionProps {
  cards: HomologationCard[];
  onUpdate: () => void;
  filters?: HomologationFiltersType;
  onFiltersChange?: (filters: HomologationFiltersType) => void;
  allCards?: HomologationCard[];
}

const HomologationKanbanSection = ({ 
  cards, 
  onUpdate, 
  filters, 
  onFiltersChange,
  allCards 
}: HomologationKanbanSectionProps) => {
  return (
    <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm border">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 lg:mb-6 gap-3">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
          Kanban de Homologação ({cards.length} itens)
        </h2>
      </div>

      {onFiltersChange && allCards && (
        <div className="mb-4">
          <HomologationFiltersComponent 
            cards={allCards}
            onFiltersChange={onFiltersChange}
          />
        </div>
      )}

      <HomologationKanban 
        cards={cards} 
        onUpdate={onUpdate}
      />
    </div>
  );
};

export default HomologationKanbanSection;