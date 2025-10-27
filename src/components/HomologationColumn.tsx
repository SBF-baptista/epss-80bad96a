
import { HomologationCard } from "@/services/homologationService";
import HomologationCardComponent from "./HomologationCard";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      className={`flex-shrink-0 w-64 sm:w-72 lg:w-80 ${color} border rounded-lg p-2 sm:p-3 lg:p-4 relative`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
        <h3 className="font-semibold text-foreground text-xs sm:text-sm lg:text-base line-clamp-2">{title}</h3>
        <span className="bg-card text-muted-foreground px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2">
          {cards.length}
        </span>
      </div>
      
      <ScrollArea className="h-[calc(4*140px+3*0.75rem)] sm:h-[calc(4*140px+3*0.5rem)] lg:h-[calc(4*150px+3*0.75rem)] homologation-column-scroll">
        <div className="space-y-2 sm:space-y-2 lg:space-y-3 pr-3">
          {cards.map((card) => (
            <div key={card.id} className="relative">
              <HomologationCardComponent
                card={card}
                onClick={() => onCardClick(card)}
                onDragStart={() => onDragStart(card)}
                onUpdate={onUpdate}
              />
              {isUpdating === card.id && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default HomologationColumn;
