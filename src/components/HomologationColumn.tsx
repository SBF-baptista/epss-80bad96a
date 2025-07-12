
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
  onUpdate: () => void;
}

const HomologationColumn = ({
  title,
  cards,
  color,
  onDragOver,
  onDrop,
  onCardClick,
  onDragStart,
  onUpdate
}: HomologationColumnProps) => {
  return (
    <div className="min-w-[260px] md:min-w-80 flex-shrink-0 w-[260px] md:w-auto">
      <div className="mb-2 md:mb-4 px-1">
        <h3 className="font-semibold text-gray-900 text-xs md:text-lg leading-tight truncate">{title}</h3>
        <p className="text-xs text-gray-600">{cards.length} {cards.length === 1 ? 'item' : 'itens'}</p>
      </div>
      
      <Card 
        className={`min-h-64 md:min-h-96 p-2 md:p-4 border-2 border-dashed ${color} transition-colors`}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="space-y-2 md:space-y-3">
          {cards.map(card => (
            <HomologationCardComponent
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
              onDragStart={() => onDragStart(card)}
              onUpdate={onUpdate}
            />
          ))}
          {cards.length === 0 && (
            <div className="text-center py-6 md:py-8 text-gray-500">
              <p className="text-sm">Nenhum item nesta etapa</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default HomologationColumn;
