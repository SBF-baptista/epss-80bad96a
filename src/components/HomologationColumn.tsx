
import { useState } from "react";
import { HomologationCard } from "@/services/homologationService";
import HomologationCardComponent from "./HomologationCard";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HomologationColumnProps {
  title: string;
  cards: HomologationCard[];
  color: string;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onCardClick: (card: HomologationCard) => void;
  onDragStart: (card: HomologationCard, e: React.DragEvent) => void;
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <div 
        className={`w-full min-w-0 h-12 ${color} border rounded-lg p-2 relative flex items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity`}
        onClick={() => setIsCollapsed(false)}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(false);
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-xs font-semibold text-foreground truncate">
          {title}
        </span>
        <span className="bg-card text-muted-foreground px-2 py-1 rounded-full text-xs font-medium flex-shrink-0">
          {cards.length}
        </span>
      </div>
    );
  }

  return (
    <div 
      className={`w-full min-w-0 ${color} border rounded-lg p-2 sm:p-3 lg:p-4 relative flex flex-col`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsCollapsed(true)}
            title="Recolher coluna"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold text-foreground text-xs sm:text-sm lg:text-base line-clamp-2">{title}</h3>
        </div>
        <span className="bg-card text-muted-foreground px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2">
          {cards.length}
        </span>
      </div>
      
      <div className="space-y-2 sm:space-y-2 lg:space-y-3 overflow-y-auto max-h-[calc(100vh-20rem)] pr-1">
        {cards.map((card) => (
          <div key={card.id} className="relative">
            <HomologationCardComponent
              card={card}
              onClick={() => onCardClick(card)}
              onDragStart={(e) => onDragStart(card, e)}
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
    </div>
  );
};

export default HomologationColumn;
