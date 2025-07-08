
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, TestTube, Database } from "lucide-react";
import { HomologationCard, updateHomologationNotes } from "@/services/homologationService";
import { useToast } from "@/hooks/use-toast";
import HomologationPhotos from "./HomologationPhotos";
import TestSchedulingModal from "./TestSchedulingModal";
import TestExecutionModal from "./TestExecutionModal";

interface HomologationModalProps {
  card: HomologationCard | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const HomologationModal = ({ card, isOpen, onClose, onUpdate }: HomologationModalProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState(card?.notes || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showTestScheduling, setShowTestScheduling] = useState(false);
  const [showTestExecution, setShowTestExecution] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "homologar":
        return "bg-red-100 text-red-800 border-red-200";
      case "em_homologacao":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "agendamento_teste":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "execucao_teste":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "em_testes_finais":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "armazenamento_plataforma":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "homologado":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "homologar":
        return "A Homologar";
      case "em_homologacao":
        return "Em Homologação";
      case "agendamento_teste":
        return "Agendamento de Teste";
      case "execucao_teste":
        return "Execução de Teste";
      case "em_testes_finais":
        return "Em Testes Finais";
      case "armazenamento_plataforma":
        return "Armazenamento na Plataforma";
      case "homologado":
        return "Homologado";
      default:
        return status;
    }
  };

  const handleUpdateNotes = async () => {
    if (!card) return;

    setIsUpdating(true);
    try {
      await updateHomologationNotes(card.id, notes);
      onUpdate();
      toast({
        title: "Notas atualizadas",
        description: "As notas do card foram atualizadas com sucesso"
      });
    } catch (error) {
      console.error("Error updating notes:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar as notas",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (!card) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Homologação: {card.brand} {card.model} {card.year && `(${card.year})`}
            <Badge className={`text-xs ${getStatusColor(card.status)}`}>
              {getStatusLabel(card.status)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Informações do Veículo</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Marca:</span>
                  <span className="font-medium">{card.brand}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Modelo:</span>
                  <span className="font-medium">{card.model}</span>
                </div>
                {card.year && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ano:</span>
                    <span className="font-medium">{card.year}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Datas</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Criado em:</span>
                  <span className="font-medium">{formatDate(card.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Atualizado em:</span>
                  <span className="font-medium">{formatDate(card.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Notas</h3>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione notas sobre o processo de homologação..."
              rows={4}
              className="w-full"
            />
          </div>

          <Separator />

          {/* Workflow Action Buttons */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Ações do Fluxo de Trabalho</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(card.status === 'em_homologacao' || card.status === 'agendamento_teste') && (
                <Button
                  variant="outline"
                  onClick={() => setShowTestScheduling(true)}
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  {card.test_scheduled_date ? 'Reagendar Teste' : 'Agendar Teste'}
                </Button>
              )}
              
              {(card.status === 'agendamento_teste' || card.status === 'execucao_teste') && (
                <Button
                  variant="outline"
                  onClick={() => setShowTestExecution(true)}
                  className="flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  Executar Teste
                </Button>
              )}

              {card.status === 'execucao_teste' && (
                <Button
                  variant="outline"
                  disabled
                  className="flex items-center gap-2"
                >
                  <Database className="h-4 w-4" />
                  Armazenar na Plataforma
                </Button>
              )}
            </div>
          </div>

          <Separator />
          
          <HomologationPhotos 
            cardId={card.id} 
            onUpdate={onUpdate}
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button 
              onClick={handleUpdateNotes}
              disabled={isUpdating || notes === card.notes}
            >
              {isUpdating ? "Salvando..." : "Salvar Notas"}
            </Button>
          </div>
        </div>

      </DialogContent>

      {/* Workflow Modals */}
      {showTestScheduling && (
        <TestSchedulingModal
          card={card}
          isOpen={showTestScheduling}
          onClose={() => setShowTestScheduling(false)}
          onUpdate={onUpdate}
        />
      )}

      {showTestExecution && (
        <TestExecutionModal
          card={card}
          isOpen={showTestExecution}
          onClose={() => setShowTestExecution(false)}
          onUpdate={onUpdate}
        />
      )}
    </Dialog>
  );
};

export default HomologationModal;
