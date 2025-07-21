
import { HomologationCard } from "@/services/homologationService";
import HomologationCardComponent from "./HomologationCard";
import { Loader2 } from "lucide-react";

interface HomologationColumnProps {
  title: string;
  cards: HomologationCard[];
  color: string;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onCardClick: (card: HomologationCard) => void;
  onDragStart: (card: HomologationCard) => void;
  onUpdate: () => void;
  isUpdating?: string | null;
}

const HomologationColumn = ({ 
  title, 
  cards, 
  color, 
  onDragOver, 
  onDrop, 
  onCardClick, 
  onDragStart, 
  onUpdate,
  isUpdating 
}: HomologationColumnProps) => {
  return (
    <div 
      className={`flex-shrink-0 w-72 md:w-80 ${color} border rounded-lg p-3 md:p-4 relative`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h3 className="font-semibold text-gray-800 text-sm md:text-base">{title}</h3>
        <span className="bg-white text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
          {cards.length}
        </span>
      </div>
      
      <div className="space-y-2 md:space-y-3 min-h-[300px] md:min-h-[400px]">
        {cards.map((card) => (
          <div key={card.id} className="relative">
            <HomologationCardComponent
              card={card}
              onClick={() => onCardClick(card)}
              onDragStart={() => onDragStart(card)}
              onUpdate={onUpdate}
            />
            {isUpdating === card.id && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomologationColumn;
