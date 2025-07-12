import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TestTube, Settings, FileText, Car, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateTestExecution, HomologationCard, uploadHomologationPhoto, getPhotoUrl } from "@/services/homologationService";

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
  { id: 'nivel_combustivel', label: 'Nível de combustível (Can ou analógica)', completed: false },
  { id: 'outros', label: 'Outros', completed: false }
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
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [chassisPhoto, setChassisPhoto] = useState<string | null>(null);
  const [vehiclePhoto, setVehiclePhoto] = useState<string | null>(null);
  const [canConnectionLocationPhoto, setCanConnectionLocationPhoto] = useState<string | null>(null);
  const [canConnectionWiresPhoto, setCanConnectionWiresPhoto] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    chassisInfo: card.chassis_info || '',
    manufactureYear: card.manufacture_year || new Date().getFullYear(),
    electricalConnectionType: card.electrical_connection_type || '',
    technicalObservations: card.technical_observations || '',
    testConfiguration: card.configuration || ''
  });
  
  const [customConfiguration, setCustomConfiguration] = useState('');
  
  const [checklist, setChecklist] = useState(
    card.test_checklist || DEFAULT_CHECKLIST
  );

  const [outrosText, setOutrosText] = useState('');

  const handleChecklistChange = (itemId: string, completed: boolean) => {
    setChecklist(checklist.map(item => 
      item.id === itemId ? { ...item, completed } : item
    ));
  };

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>, 
    photoType: 'chassis' | 'vehicle' | 'canLocation' | 'canWires'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione apenas arquivos de imagem",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      // Create descriptive filename based on photo type
      const originalName = file.name;
      const extension = originalName.substring(originalName.lastIndexOf('.'));
      
      let newFileName;
      switch (photoType) {
        case 'chassis':
          newFileName = `chassi_${card.brand}_${card.model}${extension}`;
          break;
        case 'vehicle':
          newFileName = `veiculo_${card.brand}_${card.model}${extension}`;
          break;
        case 'canLocation':
          newFileName = `can_location_${card.brand}_${card.model}${extension}`;
          break;
        case 'canWires':
          newFileName = `can_wires_${card.brand}_${card.model}${extension}`;
          break;
        default:
          newFileName = originalName;
      }
      
      // Create a new file with the descriptive name
      const renamedFile = new File([file], newFileName, { type: file.type });
      
      // Determine photo type based on the upload type
      let dbPhotoType;
      switch (photoType) {
        case 'chassis':
          dbPhotoType = 'chassi';
          break;
        case 'vehicle':
          dbPhotoType = 'veiculo';
          break;
        case 'canLocation':
          dbPhotoType = 'can_location';
          break;
        case 'canWires':
          dbPhotoType = 'can_wires';
          break;
        default:
          dbPhotoType = 'outros';
      }
      
      const { url } = await uploadHomologationPhoto(card.id, renamedFile, dbPhotoType);
      
      switch (photoType) {
        case 'chassis':
          setChassisPhoto(url);
          break;
        case 'vehicle':
          setVehiclePhoto(url);
          break;
        case 'canLocation':
          setCanConnectionLocationPhoto(url);
          break;
        case 'canWires':
          setCanConnectionWiresPhoto(url);
          break;
      }
      
      const photoLabels = {
        chassis: 'chassi',
        vehicle: 'veículo',
        canLocation: 'local de conexão CAN',
        canWires: 'fios de conexão CAN'
      };
      
      toast({
        title: "Foto enviada",
        description: `A foto do ${photoLabels[photoType]} foi enviada com sucesso`
      });
    } catch (error) {
      console.error(`Error uploading ${photoType} photo:`, error);
      toast({
        title: "Erro",
        description: `Erro ao enviar foto do ${photoType === 'chassis' ? 'chassi' : photoType === 'vehicle' ? 'veículo' : photoType === 'canLocation' ? 'local de conexão CAN' : 'fios de conexão CAN'}`,
        variant: "destructive"
      });
    } finally {
      setIsUploadingPhoto(false);
      // Reset input
      event.target.value = '';
    }
  };

  const removePhoto = (photoType: 'chassis' | 'vehicle' | 'canLocation' | 'canWires') => {
    switch (photoType) {
      case 'chassis':
        setChassisPhoto(null);
        break;
      case 'vehicle':
        setVehiclePhoto(null);
        break;
      case 'canLocation':
        setCanConnectionLocationPhoto(null);
        break;
      case 'canWires':
        setCanConnectionWiresPhoto(null);
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    try {
      // Use custom configuration text if "Outros" is selected and custom text is provided
      const finalConfiguration = formData.testConfiguration === 'Outros' && customConfiguration.trim() 
        ? customConfiguration.trim() 
        : formData.testConfiguration;
      
      await updateTestExecution(
        card.id,
        formData.chassisInfo,
        formData.manufactureYear,
        formData.electricalConnectionType,
        formData.technicalObservations,
        checklist,
        finalConfiguration
      );
      
      toast({
        title: card.test_checklist ? "Execução atualizada" : "Teste executado",
        description: card.test_checklist ? "Dados de execução do teste atualizados com sucesso" : "Dados de execução do teste salvos com sucesso"
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
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto mx-2 md:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm md:text-base">
            <TestTube className="h-4 w-4 md:h-5 md:w-5" />
            <span className="truncate">
              {card.test_checklist ? "Editar Execução de Teste" : "Execução de Teste"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
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
              <CardTitle className="flex flex-col md:flex-row md:items-center gap-2 text-base md:text-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 md:h-5 md:w-5" />
                  Checklist de Testes
                </div>
                <span className="text-xs md:text-sm font-normal text-gray-600">
                  {completedItems}/{checklist.length} ({completionPercentage}%)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 md:space-y-3">
              {checklist.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center space-x-2">
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
                  {item.id === 'outros' && item.completed && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="outrosText" className="text-sm">
                        Especificar:
                      </Label>
                      <Input
                        id="outrosText"
                        value={outrosText}
                        onChange={(e) => setOutrosText(e.target.value)}
                        placeholder="Descreva o que foi testado..."
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Configuration Definition */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Settings className="h-4 w-4 md:h-5 md:w-5" />
                Configuração Testada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
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
                    value={customConfiguration}
                    placeholder="Descreva a configuração utilizada"
                    onChange={(e) => setCustomConfiguration(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Car className="h-4 w-4 md:h-5 md:w-5" />
                Informações do Veículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chassisInfo" className="text-sm">Informações do Chassi</Label>
                  <Input
                    id="chassisInfo"
                    value={formData.chassisInfo}
                    onChange={(e) => setFormData({ ...formData, chassisInfo: e.target.value })}
                    placeholder="Número do chassi, tipo, etc."
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manufactureYear" className="text-sm">Ano de Fabricação</Label>
                  <Input
                    id="manufactureYear"
                    type="number"
                    value={formData.manufactureYear}
                    onChange={(e) => setFormData({ ...formData, manufactureYear: parseInt(e.target.value) })}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="text-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="electricalConnectionType" className="text-sm">Tipo de Conexão Elétrica</Label>
                <Input
                  id="electricalConnectionType"
                  value={formData.electricalConnectionType}
                  onChange={(e) => setFormData({ ...formData, electricalConnectionType: e.target.value })}
                  placeholder="Ex: OBD-II, fios diretos, etc."
                  className="text-sm"
                />
              </div>

              {/* Photo Uploads */}
              <div className="space-y-6">
                {/* Vehicle Photo */}
                <div className="space-y-2">
                  <Label>Foto do Veículo</Label>
                  {vehiclePhoto ? (
                    <div className="relative">
                      <img 
                        src={vehiclePhoto} 
                        alt="Foto do veículo" 
                        className="w-full max-w-md h-48 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removePhoto('vehicle')}
                        className="absolute top-2 right-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, 'vehicle')}
                        disabled={isUploadingPhoto}
                        className="hidden"
                        id="vehicle-photo-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('vehicle-photo-upload')?.click()}
                        disabled={isUploadingPhoto}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {isUploadingPhoto ? "Enviando..." : "Adicionar Foto do Veículo"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* CAN Connection Location Photo */}
                <div className="space-y-2">
                  <Label>Local de Conexão CAN</Label>
                  {canConnectionLocationPhoto ? (
                    <div className="relative">
                      <img 
                        src={canConnectionLocationPhoto} 
                        alt="Local de conexão CAN" 
                        className="w-full max-w-md h-48 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removePhoto('canLocation')}
                        className="absolute top-2 right-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, 'canLocation')}
                        disabled={isUploadingPhoto}
                        className="hidden"
                        id="can-location-photo-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('can-location-photo-upload')?.click()}
                        disabled={isUploadingPhoto}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {isUploadingPhoto ? "Enviando..." : "Adicionar Foto do Local CAN"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* CAN Connection Wires Photo */}
                <div className="space-y-2">
                  <Label>Fios de Conexão CAN</Label>
                  {canConnectionWiresPhoto ? (
                    <div className="relative">
                      <img 
                        src={canConnectionWiresPhoto} 
                        alt="Fios de conexão CAN" 
                        className="w-full max-w-md h-48 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removePhoto('canWires')}
                        className="absolute top-2 right-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, 'canWires')}
                        disabled={isUploadingPhoto}
                        className="hidden"
                        id="can-wires-photo-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('can-wires-photo-upload')?.click()}
                        disabled={isUploadingPhoto}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {isUploadingPhoto ? "Enviando..." : "Adicionar Foto dos Fios CAN"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Chassis Photo */}
                <div className="space-y-2">
                  <Label>Foto do Chassi</Label>
                  {chassisPhoto ? (
                    <div className="relative">
                      <img 
                        src={chassisPhoto} 
                        alt="Foto do chassi" 
                        className="w-full max-w-md h-48 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removePhoto('chassis')}
                        className="absolute top-2 right-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, 'chassis')}
                        disabled={isUploadingPhoto}
                        className="hidden"
                        id="chassis-photo-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('chassis-photo-upload')?.click()}
                        disabled={isUploadingPhoto}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {isUploadingPhoto ? "Enviando..." : "Adicionar Foto do Chassi"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Observations */}
          <div className="space-y-2">
            <Label htmlFor="technicalObservations" className="text-sm">Observações Técnicas</Label>
            <Textarea
              id="technicalObservations"
              value={formData.technicalObservations}
              onChange={(e) => setFormData({ ...formData, technicalObservations: e.target.value })}
              placeholder="Descreva detalhes da instalação, problemas encontrados, soluções aplicadas, etc."
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-2 md:gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="w-full md:flex-1 order-2 md:order-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full md:flex-1 order-1 md:order-2">
              {isLoading ? "Salvando..." : card.test_checklist ? "Atualizar Execução" : "Salvar Execução"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TestExecutionModal;