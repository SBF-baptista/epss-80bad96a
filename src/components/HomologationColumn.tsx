
import { Card } from "@/components/ui/card";
import HomologationCardComponent from "./HomologationCard";
import { HomologationCard } from "@/services/homologationService";

interface HomologationColumnProps {
  title: string;
  cards: HomologationCard[];
  color: string;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onCardClick: (card: HomologationCard) => void;
  onDragStart: (card: HomologationCard) => void;
}

const HomologationColumn = ({
  title,
  cards,
  color,
  onDragOver,
  onDrop,
  onCardClick,
  onDragStart
}: HomologationColumnProps) => {
  return (
    <div className="min-w-80">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
        <p className="text-sm text-gray-600">{cards.length} itens</p>
      </div>
      
      <Card 
        className={`min-h-96 p-4 border-2 border-dashed ${color} transition-colors`}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="space-y-3">
          {cards.map(card => (
            <HomologationCardComponent
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
              onDragStart={() => onDragStart(card)}
            />
          ))}
          {cards.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum item nesta etapa</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default HomologationColumn;
