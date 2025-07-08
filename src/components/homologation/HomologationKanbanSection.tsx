import HomologationKanban from "@/components/HomologationKanban";
import { HomologationCard } from "@/services/homologationService";

interface HomologationKanbanSectionProps {
  cards: HomologationCard[];
  onUpdate: () => void;
}

const HomologationKanbanSection = ({ cards, onUpdate }: HomologationKanbanSectionProps) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
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