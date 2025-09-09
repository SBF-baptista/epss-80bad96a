import HomologationKanban from "@/components/HomologationKanban";
import { HomologationCard } from "@/services/homologationService";

interface HomologationKanbanSectionProps {
  cards: HomologationCard[];
  onUpdate: () => void;
}

const HomologationKanbanSection = ({ cards, onUpdate }: HomologationKanbanSectionProps) => {
  return (
    <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm border">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 lg:mb-6 gap-3">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
          Kanban de Homologação ({cards.length} itens)
        </h2>
      </div>

      <HomologationKanban 
        cards={cards} 
        onUpdate={onUpdate}
      />
    </div>
  );
};

export default HomologationKanbanSection;