
import { useState } from "react";
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

  return (
    <HomologationErrorBoundary>
      <div className="w-full overflow-x-auto no-scrollbar">
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
