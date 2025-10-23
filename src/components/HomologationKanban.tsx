
import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import HomologationColumn from "./HomologationColumn";
import HomologationModal from "./HomologationModal";
import HomologationErrorBoundary from "./homologation/HomologationErrorBoundary";
import { HomologationCard, updateHomologationStatus } from "@/services/homologationService";
import { useHomologationToast } from "@/hooks/useHomologationToast";
import { Button } from "@/components/ui/button";

interface HomologationKanbanProps {
  cards: HomologationCard[];
  onUpdate: () => void;
}

const columns = [
  { id: "homologar", title: "A Homologar", color: "bg-error-light border-error-border" },
  { id: "em_homologacao", title: "Em Homologação", color: "bg-warning-light border-warning-border" },
  { id: "agendamento_teste", title: "Agendamento de Teste", color: "bg-warning-light border-warning-border" },
  { id: "execucao_teste", title: "Execução de Teste", color: "bg-purple-100 border-purple-200" },
  { id: "em_testes_finais", title: "Em Testes Finais", color: "bg-primary/10 border-primary/20" },
  { id: "armazenamento_plataforma", title: "Armazenamento na Plataforma", color: "bg-teal-100 border-teal-200" },
  { id: "homologado", title: "Homologado", color: "bg-success-light border-success-border" }
];

const HomologationKanban = ({ cards, onUpdate }: HomologationKanbanProps) => {
  const { showSuccess, showError } = useHomologationToast();
  const [draggedCard, setDraggedCard] = useState<HomologationCard | null>(null);
  const [selectedCard, setSelectedCard] = useState<HomologationCard | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  // Navegação lateral com botões
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

  // Navegação lateral com botões - Funções
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
      setActiveScrollIndex(index);
    }
  };

  // Navegação com botões
  const navigateLeft = () => {
    const newIndex = Math.max(0, activeScrollIndex - 1);
    scrollToColumn(newIndex);
  };

  const navigateRight = () => {
    const newIndex = Math.min(columns.length - 1, activeScrollIndex + 1);
    scrollToColumn(newIndex);
  };

  const canNavigateLeft = activeScrollIndex > 0;
  const canNavigateRight = activeScrollIndex < columns.length - 1;

  return (
    <HomologationErrorBoundary>
      <div className="w-full relative">
        {/* Botões de navegação lateral */}
        <div className="relative">
          {/* Botão de navegação esquerda */}
          <Button
            variant="outline"
            size="icon"
            className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 kanban-nav-button ${
              canNavigateLeft 
                ? 'opacity-100' 
                : 'opacity-40 cursor-not-allowed'
            }`}
            onClick={navigateLeft}
            disabled={!canNavigateLeft}
            aria-label="Navegar para a esquerda"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Botão de navegação direita */}
          <Button
            variant="outline"
            size="icon"
            className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 kanban-nav-button ${
              canNavigateRight 
                ? 'opacity-100' 
                : 'opacity-40 cursor-not-allowed'
            }`}
            onClick={navigateRight}
            disabled={!canNavigateRight}
            aria-label="Navegar para a direita"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Container do Kanban */}
          <div 
            ref={scrollContainerRef}
            className="w-full overflow-x-auto overflow-y-hidden no-scrollbar"
            onScroll={handleScroll}
            style={{ scrollBehavior: 'smooth' }}
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
            Use as setas laterais ou clique nos indicadores para navegar
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
