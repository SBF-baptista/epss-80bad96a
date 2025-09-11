
import { useState, useRef, useCallback } from "react";
import HomologationColumn from "./HomologationColumn";
import HomologationModal from "./HomologationModal";
import HomologationErrorBoundary from "./homologation/HomologationErrorBoundary";
import { HomologationCard, updateHomologationStatus } from "@/services/homologationService";
import { useHomologationToast } from "@/hooks/useHomologationToast";

interface HomologationKanbanProps {
  cards: HomologationCard[];
  onUpdate: () => void;
}

const columns = [
  { id: "homologar", title: "A Homologar", color: "bg-red-100 border-red-200" },
  { id: "em_homologacao", title: "Em Homologação", color: "bg-yellow-100 border-yellow-200" },
  { id: "agendamento_teste", title: "Agendamento de Teste", color: "bg-orange-100 border-orange-200" },
  { id: "execucao_teste", title: "Execução de Teste", color: "bg-purple-100 border-purple-200" },
  { id: "em_testes_finais", title: "Em Testes Finais", color: "bg-blue-100 border-blue-200" },
  { id: "armazenamento_plataforma", title: "Armazenamento na Plataforma", color: "bg-teal-100 border-teal-200" },
  { id: "homologado", title: "Homologado", color: "bg-green-100 border-green-200" }
];

const HomologationKanban = ({ cards, onUpdate }: HomologationKanbanProps) => {
  const { showSuccess, showError } = useHomologationToast();
  const [draggedCard, setDraggedCard] = useState<HomologationCard | null>(null);
  const [selectedCard, setSelectedCard] = useState<HomologationCard | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  // Navegação lateral contínua
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, scrollLeft: 0 });
  const [activeScrollIndex, setActiveScrollIndex] = useState(0);

  const handleDragStart = (card: HomologationCard) => {
    try {
      setDraggedCard(card);
    } catch (error) {
      showError(error as Error, {
        action: 'drag_start',
        component: 'HomologationKanban',
        cardId: card.id
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (columnId: string) => {
    if (!draggedCard || draggedCard.status === columnId) {
      setDraggedCard(null);
      return;
    }

    const cardId = draggedCard.id;
    const previousStatus = draggedCard.status;
    const targetColumn = columns.find(c => c.id === columnId);
    
    setIsUpdating(cardId);
    
    try {
      console.log(`Attempting to move card ${cardId} from ${previousStatus} to ${columnId}`);
      
      await updateHomologationStatus(cardId, columnId as HomologationCard['status']);
      
      console.log(`Successfully moved card ${cardId} to ${columnId}`);
      
      showSuccess(
        "Status atualizado",
        `${draggedCard.brand} ${draggedCard.model} movido para ${targetColumn?.title}`
      );
      
      onUpdate();
    } catch (error) {
      console.error("Error updating homologation status:", error);
      
      showError(error as Error, {
        action: 'update_status',
        component: 'HomologationKanban',
        cardId: cardId,
        additionalContext: {
          previousStatus,
          targetStatus: columnId,
          cardBrand: draggedCard.brand,
          cardModel: draggedCard.model
        }
      }, `Erro ao mover ${draggedCard.brand} ${draggedCard.model} para ${targetColumn?.title}`);
    } finally {
      setDraggedCard(null);
      setIsUpdating(null);
    }
  };

  const getCardsByStatus = (status: string) => {
    try {
      return cards.filter(card => card.status === status);
    } catch (error) {
      showError(error as Error, {
        action: 'filter_cards',
        component: 'HomologationKanban',
        additionalContext: { status }
      });
      return [];
    }
  };

  const handleCardClick = (card: HomologationCard) => {
    try {
      setSelectedCard(card);
    } catch (error) {
      showError(error as Error, {
        action: 'open_modal',
        component: 'HomologationKanban',
        cardId: card.id
      });
    }
  };

  const handleModalClose = () => {
    try {
      setSelectedCard(null);
    } catch (error) {
      showError(error as Error, {
        action: 'close_modal',
        component: 'HomologationKanban'
      });
    }
  };

  const handleUpdate = () => {
    try {
      onUpdate();
    } catch (error) {
      showError(error as Error, {
        action: 'refresh_data',
        component: 'HomologationKanban'
      });
    }
  };

  // Navegação lateral contínua - Funções
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollLeft = container.scrollLeft;
      const columnWidth = 320; // Largura aproximada de cada coluna + gap
      const activeIndex = Math.round(scrollLeft / columnWidth);
      setActiveScrollIndex(Math.min(activeIndex, columns.length - 1));
    }
  }, []);

  const scrollToColumn = (index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const columnWidth = 320;
      container.scrollTo({
        left: index * columnWidth,
        behavior: 'smooth'
      });
    }
  };

  // Mouse drag para desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.pageX - scrollContainerRef.current.offsetLeft,
      scrollLeft: scrollContainerRef.current.scrollLeft
    });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - dragStart.x) * 2; // Sensibilidade do drag
    scrollContainerRef.current.scrollLeft = dragStart.scrollLeft - walk;
  }, [isDragging, dragStart]);

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Touch drag para mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollContainerRef.current) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].pageX - scrollContainerRef.current.offsetLeft,
      scrollLeft: scrollContainerRef.current.scrollLeft
    });
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    
    const x = e.touches[0].pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - dragStart.x) * 2;
    scrollContainerRef.current.scrollLeft = dragStart.scrollLeft - walk;
  }, [isDragging, dragStart]);

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <HomologationErrorBoundary>
      <div className="w-full relative">
        {/* Navegação lateral contínua */}
        <div 
          ref={scrollContainerRef}
          className={`w-full overflow-x-auto no-scrollbar select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onScroll={handleScroll}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex gap-2 sm:gap-4 lg:gap-6 pb-4 min-h-[300px] sm:min-h-[400px] lg:min-h-[600px]" style={{ minWidth: 'max-content' }}>
            {columns.map(column => (
              <HomologationColumn
                key={column.id}
                title={column.title}
                cards={getCardsByStatus(column.id)}
                color={column.color}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(column.id)}
                onCardClick={handleCardClick}
                onDragStart={handleDragStart}
                onUpdate={handleUpdate}
                isUpdating={isUpdating}
              />
            ))}
          </div>
        </div>

        {/* Indicadores de navegação */}
        <div className="flex justify-center mt-4 gap-2">
          {columns.map((column, index) => (
            <button
              key={index}
              onClick={() => scrollToColumn(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 hover:scale-110 ${
                index === activeScrollIndex 
                  ? "bg-primary w-6 shadow-md" 
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              title={column.title}
              aria-label={`Navegar para ${column.title}`}
            />
          ))}
        </div>

        {/* Dica de navegação */}
        <div className="text-center mt-2">
          <p className="text-xs text-muted-foreground">
            Clique e arraste para navegar lateralmente ou use os indicadores
          </p>
        </div>
      </div>

      {selectedCard && (
        <HomologationModal
          card={selectedCard}
          isOpen={!!selectedCard}
          onClose={handleModalClose}
          onUpdate={handleUpdate}
        />
      )}
    </HomologationErrorBoundary>
  );
};

export default HomologationKanban;
