
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, TestTube, Edit, Play } from "lucide-react";
import { HomologationCard, updateHomologationNotes, updateHomologationStatus } from "@/services/homologationService";
import { useToast } from "@/hooks/use-toast";
import HomologationPhotos from "./HomologationPhotos";
import TestSchedulingModal from "./TestSchedulingModal";
import TestExecutionModal from "./TestExecutionModal";
import KitManagementSection from "./homologation/KitManagementSection";
import { logUpdate } from "@/services/logService";

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
  const [isStartingTest, setIsStartingTest] = useState(false);
  const [isExecutingTest, setIsExecutingTest] = useState(false);

  const handleStartTest = async () => {
    if (!card) return;
    
    setIsStartingTest(true);
    try {
      await updateHomologationStatus(card.id, 'em_homologacao');
      await logUpdate("Homologação", "status", card.id, "Iniciou teste - Status alterado para Em Homologação");
      onUpdate();
      toast({
        title: "Teste iniciado",
        description: "O card foi movido para 'Em Homologação'"
      });
      onClose();
    } catch (error) {
      console.error("Error starting test:", error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar o teste",
        variant: "destructive"
      });
    } finally {
      setIsStartingTest(false);
    }
  };

  const handleExecuteTest = async () => {
    if (!card) return;
    
    setIsExecutingTest(true);
    try {
      await updateHomologationStatus(card.id, 'execucao_teste');
      await logUpdate("Homologação", "status", card.id, "Executar teste - Status alterado para Execução de Teste");
      onUpdate();
      toast({
        title: "Execução iniciada",
        description: "O card foi movido para 'Execução de Teste'"
      });
      onClose();
    } catch (error) {
      console.error("Error executing test:", error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar a execução do teste",
        variant: "destructive"
      });
    } finally {
      setIsExecutingTest(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "homologar":
        return "bg-error-light text-error border-error-border";
      case "em_homologacao":
        return "bg-warning-light text-warning border-warning-border";
      case "agendamento_teste":
        return "bg-warning-light text-warning border-warning-border";
      case "execucao_teste":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "em_testes_finais":
        return "bg-primary/10 text-primary border-primary/20";
      case "armazenamento_plataforma":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "homologado":
        return "bg-success-light text-success border-success-border";
      default:
        return "bg-muted text-muted-foreground border-border";
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
      
      // Registrar log da edição
      await logUpdate(
        "Homologação",
        "card de homologação",
        card.id,
        "Notas atualizadas"
      );
      
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
              <h3 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">Informações do Veículo</h3>
              <div className="space-y-2 md:space-y-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Marca:</span>
                  <span className="font-medium text-right">{card.brand}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Modelo:</span>
                  <span className="font-medium text-right">{card.model}</span>
                </div>
                {card.year && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Ano:</span>
                    <span className="font-medium text-right">{card.year}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">Datas</h3>
              <div className="space-y-2 md:space-y-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Criado em:</span>
                  <span className="font-medium text-right">{formatDate(card.created_at)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Atualizado:</span>
                  <span className="font-medium text-right">{formatDate(card.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-foreground mb-4">Notas</h3>
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
            <h3 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">Ações do Fluxo de Trabalho</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
              {/* Etapa 1: Botão Iniciar Teste no status 'homologar' */}
              {card.status === 'homologar' && (
                <Button
                  variant="outline"
                  onClick={handleStartTest}
                  disabled={isStartingTest}
                  className="flex items-center gap-2 w-full justify-start text-sm"
                  size="sm"
                >
                  <Play className="h-4 w-4" />
                  {isStartingTest ? 'Iniciando...' : 'Iniciar Teste'}
                </Button>
              )}

              {/* Etapa 2: Botão Agendar Teste no status 'em_homologacao' */}
              {card.status === 'em_homologacao' && (
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

              {/* Etapa 3: Exibir data agendada e botão Executar Teste no status 'agendamento_teste' */}
              {card.status === 'agendamento_teste' && card.test_scheduled_date && (
                <>
                  <div className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-md px-3 py-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Agendado para: {new Date(card.test_scheduled_date).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleExecuteTest}
                    disabled={isExecutingTest}
                    className="flex items-center gap-2 w-full justify-start text-sm"
                    size="sm"
                  >
                    <TestTube className="h-4 w-4" />
                    {isExecutingTest ? 'Iniciando...' : 'Executar Teste'}
                  </Button>
                </>
              )}

              {/* No status 'execucao_teste', mostrar apenas botão de editar execução se já tiver checklist */}
              {card.status === 'execucao_teste' && !card.test_checklist && (
                <Button
                  variant="outline"
                  onClick={() => setShowTestExecution(true)}
                  className="flex items-center gap-2 w-full justify-start text-sm"
                  size="sm"
                >
                  <TestTube className="h-4 w-4" />
                  Registrar Execução
                </Button>
              )}
            </div>
          </div>

          {/* Test Results Display */}
          {card.test_checklist && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Resultados do Teste</h3>
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
                <div className="bg-success-light border border-success-border rounded-lg p-4">
                  <h4 className="font-medium text-success mb-3">Teste Executado com Sucesso</h4>
                  
                  {/* Configuration Used */}
                  {card.configuration && (
                    <div className="mb-3">
                      <span className="text-sm font-medium text-muted-foreground">Configuração Testada: </span>
                      <span className="text-sm text-foreground">{card.configuration}</span>
                    </div>
                  )}
                  
                  {/* Checklist Results */}
                  <div className="mb-3">
                    <span className="text-sm font-medium text-muted-foreground block mb-2">Itens Testados:</span>
                    <div className="space-y-1">
                      {Array.isArray(card.test_checklist) && card.test_checklist.map((item: any, index: number) => (
                        <div key={index} className="flex items-center text-sm">
                          <span className={`mr-2 ${item.completed ? 'text-success' : 'text-muted-foreground/50'}`}>
                            {item.completed ? '✓' : '○'}
                          </span>
                          <span className="text-foreground">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {card.manufacture_year && (
                      <div>
                        <span className="font-medium text-muted-foreground">Ano de Fabricação: </span>
                        <span className="text-foreground">{card.manufacture_year}</span>
                      </div>
                    )}
                    {card.electrical_connection_type && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-muted-foreground">Tipo de Conexão: </span>
                        <span className="text-foreground">{card.electrical_connection_type}</span>
                      </div>
                    )}
                  </div>

                  {/* Technical Observations */}
                  {card.technical_observations && (
                    <div className="mt-3">
                      <span className="text-sm font-medium text-muted-foreground block mb-1">Observações Técnicas:</span>
                      <p className="text-sm text-foreground bg-background p-2 rounded border">
                        {card.technical_observations}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


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
          onCloseParent={onClose}
        />
      )}

      {showTestExecution && (
        <TestExecutionModal
          card={card}
          isOpen={showTestExecution}
          onClose={() => setShowTestExecution(false)}
          onUpdate={onUpdate}
          onCloseParent={onClose}
        />
      )}
    </Dialog>
  );
};

export default HomologationModal;
