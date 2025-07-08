import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TestTube, Settings, FileText, Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateTestExecution, HomologationCard } from "@/services/homologationService";

interface TestExecutionModalProps {
  card: HomologationCard;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const DEFAULT_CHECKLIST = [
  { id: 'velocidade', label: 'Velocidade', completed: false },
  { id: 'rpm', label: 'RPM', completed: false },
  { id: 'odometro', label: 'Odômetro', completed: false },
  { id: 'combustivel_consumido', label: 'Combustível consumido', completed: false },
  { id: 'nivel_combustivel', label: 'Nível de combustível (Can ou analógica)', completed: false }
];

const CONFIGURATION_OPTIONS = [
  'J1939',
  'FMS250', 
  'OBD-II',
  'Analógica',
  'CAN Bus Direto',
  'Outros'
];

const TestExecutionModal = ({ card, isOpen, onClose, onUpdate }: TestExecutionModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    chassisInfo: card.chassis_info || '',
    manufactureYear: card.manufacture_year || new Date().getFullYear(),
    electricalConnectionType: card.electrical_connection_type || '',
    technicalObservations: card.technical_observations || '',
    testConfiguration: card.configuration || ''
  });
  
  const [checklist, setChecklist] = useState(
    card.test_checklist || DEFAULT_CHECKLIST
  );

  const handleChecklistChange = (itemId: string, completed: boolean) => {
    setChecklist(checklist.map(item => 
      item.id === itemId ? { ...item, completed } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    try {
      await updateTestExecution(
        card.id,
        formData.chassisInfo,
        formData.manufactureYear,
        formData.electricalConnectionType,
        formData.technicalObservations,
        checklist,
        formData.testConfiguration
      );
      
      toast({
        title: "Teste executado",
        description: "Dados de execução do teste salvos com sucesso"
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating test execution:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar dados do teste",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const completedItems = checklist.filter(item => item.completed).length;
  const completionPercentage = Math.round((completedItems / checklist.length) * 100);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Execução de Teste
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="font-medium text-gray-900">{card.brand} {card.model}</p>
            {card.year && <p className="text-sm text-gray-600">Ano: {card.year}</p>}
            {card.test_scheduled_date && (
              <p className="text-sm text-gray-600">
                Agendado para: {new Date(card.test_scheduled_date).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>

          {/* Test Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Checklist de Testes
                <span className="ml-auto text-sm font-normal">
                  {completedItems}/{checklist.length} ({completionPercentage}%)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={item.id}
                    checked={item.completed}
                    onCheckedChange={(checked) => 
                      handleChecklistChange(item.id, checked as boolean)
                    }
                  />
                  <Label htmlFor={item.id} className="text-sm">
                    {item.label}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Configuration Definition */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                Configuração Testada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testConfiguration">Configuração Utilizada no Teste *</Label>
                <Select
                  value={formData.testConfiguration}
                  onValueChange={(value) => setFormData({ ...formData, testConfiguration: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a configuração testada" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONFIGURATION_OPTIONS.map((config) => (
                      <SelectItem key={config} value={config}>
                        {config}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {formData.testConfiguration === 'Outros' && (
                <div className="space-y-2">
                  <Label htmlFor="customConfiguration">Especificar Configuração</Label>
                  <Input
                    id="customConfiguration"
                    placeholder="Descreva a configuração utilizada"
                    onChange={(e) => setFormData({ ...formData, testConfiguration: e.target.value })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Car className="h-5 w-5" />
                Informações do Veículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chassisInfo">Informações do Chassi</Label>
                  <Input
                    id="chassisInfo"
                    value={formData.chassisInfo}
                    onChange={(e) => setFormData({ ...formData, chassisInfo: e.target.value })}
                    placeholder="Número do chassi, tipo, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manufactureYear">Ano de Fabricação</Label>
                  <Input
                    id="manufactureYear"
                    type="number"
                    value={formData.manufactureYear}
                    onChange={(e) => setFormData({ ...formData, manufactureYear: parseInt(e.target.value) })}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="electricalConnectionType">Tipo de Conexão Elétrica</Label>
                <Input
                  id="electricalConnectionType"
                  value={formData.electricalConnectionType}
                  onChange={(e) => setFormData({ ...formData, electricalConnectionType: e.target.value })}
                  placeholder="Ex: OBD-II, fios diretos, etc."
                />
              </div>
            </CardContent>
          </Card>

          {/* Technical Observations */}
          <div className="space-y-2">
            <Label htmlFor="technicalObservations">Observações Técnicas</Label>
            <Textarea
              id="technicalObservations"
              value={formData.technicalObservations}
              onChange={(e) => setFormData({ ...formData, technicalObservations: e.target.value })}
              placeholder="Descreva detalhes da instalação, problemas encontrados, soluções aplicadas, etc."
              rows={4}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Salvando..." : "Salvar Execução"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TestExecutionModal;