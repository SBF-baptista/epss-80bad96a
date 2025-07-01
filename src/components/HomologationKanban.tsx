
import { useState } from "react";
import HomologationColumn from "./HomologationColumn";
import HomologationModal from "./HomologationModal";
import { HomologationCard, updateHomologationStatus } from "@/services/homologationService";
import { useToast } from "@/hooks/use-toast";

interface HomologationKanbanProps {
  cards: HomologationCard[];
  onUpdate: () => void;
}

const columns = [
  { id: "homologar", title: "A Homologar", color: "bg-red-100 border-red-200" },
  { id: "em_homologacao", title: "Em Homologação", color: "bg-yellow-100 border-yellow-200" },
  { id: "em_testes_finais", title: "Em Testes Finais", color: "bg-blue-100 border-blue-200" },
  { id: "homologado", title: "Homologado", color: "bg-green-100 border-green-200" }
];

const HomologationKanban = ({ cards, onUpdate }: HomologationKanbanProps) => {
  const { toast } = useToast();
  const [draggedCard, setDraggedCard] = useState<HomologationCard | null>(null);
  const [selectedCard, setSelectedCard] = useState<HomologationCard | null>(null);

  const handleDragStart = (card: HomologationCard) => {
    setDraggedCard(card);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (columnId: string) => {
    if (draggedCard && draggedCard.status !== columnId) {
      try {
        await updateHomologationStatus(draggedCard.id, columnId as HomologationCard['status']);
        onUpdate();
        toast({
          title: "Status atualizado",
          description: `${draggedCard.brand} ${draggedCard.model} movido para ${columns.find(c => c.id === columnId)?.title}`
        });
      } catch (error) {
        console.error("Error updating homologation status:", error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar status da homologação",
          variant: "destructive"
        });
      }
    }
    setDraggedCard(null);
  };

  const getCardsByStatus = (status: string) => {
    return cards.filter(card => card.status === status);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-x-auto">
        {columns.map(column => (
          <HomologationColumn
            key={column.id}
            title={column.title}
            cards={getCardsByStatus(column.id)}
            color={column.color}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
            onCardClick={setSelectedCard}
            onDragStart={handleDragStart}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      {selectedCard && (
        <HomologationModal
          card={selectedCard}
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
};

export default HomologationKanban;
