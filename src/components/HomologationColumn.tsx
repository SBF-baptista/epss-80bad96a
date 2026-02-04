import { useState } from "react";
import { HomologationCard } from "@/services/homologationService";
import HomologationCardComponent from "./HomologationCard";
import { Loader2, ChevronDown, ChevronRight, Clock, Settings, Calendar, Car, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const columnIcons: Record<string, React.ElementType> = {
  "A Homologar": Clock,
  "Em Homologação": Settings,
  "Agendamento de Teste": Calendar,
  "Execução de Teste": Car,
  "Homologado": CheckCircle2,
};

const columnColors: Record<string, { header: string; bg: string; badge: string }> = {
  "A Homologar": { 
    header: "text-red-700", 
    bg: "bg-red-50/50", 
    badge: "bg-red-100 text-red-700 border-red-200" 
  },
  "Em Homologação": { 
    header: "text-amber-700", 
    bg: "bg-amber-50/50", 
    badge: "bg-amber-100 text-amber-700 border-amber-200" 
  },
  "Agendamento de Teste": { 
    header: "text-orange-700", 
    bg: "bg-orange-50/50", 
    badge: "bg-orange-100 text-orange-700 border-orange-200" 
  },
  "Execução de Teste": { 
    header: "text-purple-700", 
    bg: "bg-purple-50/50", 
    badge: "bg-purple-100 text-purple-700 border-purple-200" 
  },
  "Homologado": { 
    header: "text-green-700", 
    bg: "bg-green-50/50", 
    badge: "bg-green-100 text-green-700 border-green-200" 
  },
};

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
  
  const Icon = columnIcons[title] || Clock;
  const colors = columnColors[title] || columnColors["A Homologar"];

  if (isCollapsed) {
    return (
      <div 
        className={cn(
          "w-full min-w-0 h-12 border border-border/40 rounded-xl p-2",
          "relative flex items-center justify-center gap-2 cursor-pointer",
          "hover:bg-muted/50 transition-all duration-200",
          colors.bg
        )}
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
        <span className={cn("text-xs font-semibold truncate", colors.header)}>
          {title}
        </span>
        <span className={cn(
          "px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0",
          colors.badge
        )}>
          {cards.length}
        </span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "w-full min-w-0 border border-border/40 rounded-xl p-3 sm:p-4",
        "relative flex flex-col shadow-sm",
        colors.bg
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-white/50"
            onClick={() => setIsCollapsed(true)}
            title="Recolher coluna"
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Icon className={cn("h-4 w-4", colors.header)} />
          <h3 className={cn(
            "font-semibold text-xs sm:text-sm line-clamp-1",
            colors.header
          )}>
            {title}
          </h3>
        </div>
        <span className={cn(
          "px-2.5 py-1 rounded-full text-xs font-bold border",
          colors.badge
        )}>
          {cards.length}
        </span>
      </div>
      
      {/* Cards Container */}
      <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-20rem)] pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {cards.map((card) => (
          <div key={card.id} className="relative">
            <HomologationCardComponent
              card={card}
              onClick={() => onCardClick(card)}
              onDragStart={(e) => onDragStart(card, e)}
              onUpdate={onUpdate}
            />
            {isUpdating === card.id && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-xl">
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
