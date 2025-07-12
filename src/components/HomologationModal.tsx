
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, TestTube, Database, Edit } from "lucide-react";
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
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto mx-2 md:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 text-left">
            <span className="text-sm md:text-base">
              Homologação: {card.brand} {card.model} {card.year && `(${card.year})`}
            </span>
            <Badge className={`text-xs ${getStatusColor(card.status)} self-start md:self-center`}>
              {getStatusLabel(card.status)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 md:mb-4 text-sm md:text-base">Informações do Veículo</h3>
              <div className="space-y-2 md:space-y-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Marca:</span>
                  <span className="font-medium text-right">{card.brand}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Modelo:</span>
                  <span className="font-medium text-right">{card.model}</span>
                </div>
                {card.year && (
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600">Ano:</span>
                    <span className="font-medium text-right">{card.year}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3 md:mb-4 text-sm md:text-base">Datas</h3>
              <div className="space-y-2 md:space-y-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Criado em:</span>
                  <span className="font-medium text-right">{formatDate(card.created_at)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Atualizado:</span>
                  <span className="font-medium text-right">{formatDate(card.updated_at)}</span>
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
            <h3 className="font-semibold text-gray-900 mb-3 md:mb-4 text-sm md:text-base">Ações do Fluxo de Trabalho</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
              {(card.status === 'em_homologacao' || card.status === 'agendamento_teste') && (
                <Button
                  variant="outline"
                  onClick={() => setShowTestScheduling(true)}
                  className="flex items-center gap-2 w-full justify-start text-sm"
                  size="sm"
                >
                  <Calendar className="h-4 w-4" />
                  {card.test_scheduled_date ? 'Reagendar Teste' : 'Agendar Teste'}
                </Button>
              )}
              
              {(card.status === 'agendamento_teste' || card.status === 'execucao_teste') && 
               !card.test_checklist && (
                <Button
                  variant="outline"
                  onClick={() => setShowTestExecution(true)}
                  className="flex items-center gap-2 w-full justify-start text-sm"
                  size="sm"
                >
                  <TestTube className="h-4 w-4" />
                  Executar Teste
                </Button>
              )}

              {card.status === 'execucao_teste' && (
                <Button
                  variant="outline"
                  disabled
                  className="flex items-center gap-2 w-full justify-start text-sm"
                  size="sm"
                >
                  <Database className="h-4 w-4" />
                  Armazenar na Plataforma
                </Button>
              )}
            </div>
          </div>

          {/* Test Results Display */}
          {card.test_checklist && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Resultados do Teste</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTestExecution(true)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar Execução
                </Button>
              </div>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-3">Teste Executado com Sucesso</h4>
                  
                  {/* Configuration Used */}
                  {card.configuration && (
                    <div className="mb-3">
                      <span className="text-sm font-medium text-gray-700">Configuração Testada: </span>
                      <span className="text-sm text-gray-900">{card.configuration}</span>
                    </div>
                  )}
                  
                  {/* Checklist Results */}
                  <div className="mb-3">
                    <span className="text-sm font-medium text-gray-700 block mb-2">Itens Testados:</span>
                    <div className="space-y-1">
                      {Array.isArray(card.test_checklist) && card.test_checklist.map((item: any, index: number) => (
                        <div key={index} className="flex items-center text-sm">
                          <span className={`mr-2 ${item.completed ? 'text-green-600' : 'text-gray-400'}`}>
                            {item.completed ? '✓' : '○'}
                          </span>
                          <span className="text-gray-700">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {card.chassis_info && (
                      <div>
                        <span className="font-medium text-gray-700">Chassi: </span>
                        <span className="text-gray-900">{card.chassis_info}</span>
                      </div>
                    )}
                    {card.manufacture_year && (
                      <div>
                        <span className="font-medium text-gray-700">Ano de Fabricação: </span>
                        <span className="text-gray-900">{card.manufacture_year}</span>
                      </div>
                    )}
                    {card.electrical_connection_type && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-gray-700">Tipo de Conexão: </span>
                        <span className="text-gray-900">{card.electrical_connection_type}</span>
                      </div>
                    )}
                  </div>

                  {/* Technical Observations */}
                  {card.technical_observations && (
                    <div className="mt-3">
                      <span className="text-sm font-medium text-gray-700 block mb-1">Observações Técnicas:</span>
                      <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                        {card.technical_observations}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <Separator />
          
          <HomologationPhotos 
            cardId={card.id} 
            onUpdate={onUpdate}
          />

          <div className="flex flex-col md:flex-row justify-end gap-2 md:gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="w-full md:w-auto">
              Fechar
            </Button>
            <Button 
              onClick={handleUpdateNotes}
              disabled={isUpdating || notes === card.notes}
              className="w-full md:w-auto"
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
