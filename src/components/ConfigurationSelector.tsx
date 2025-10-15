
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchAutomationConfigurations, createAutomationRule, updateHomologationConfiguration } from "@/services/homologationService";

interface ConfigurationSelectorProps {
  cardId: string;
  currentConfiguration: string | null;
  brand: string;
  model: string;
  isEditable: boolean;
  onUpdate: () => void;
}

const ConfigurationSelector = ({ 
  cardId, 
  currentConfiguration, 
  brand, 
  model, 
  isEditable, 
  onUpdate 
}: ConfigurationSelectorProps) => {
  const { toast } = useToast();
  const [configurations, setConfigurations] = useState<string[]>([]);
  const [selectedConfiguration, setSelectedConfiguration] = useState(currentConfiguration || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isNewConfigOpen, setIsNewConfigOpen] = useState(false);
  const [newConfiguration, setNewConfiguration] = useState("");
  const [newTrackerModel, setNewTrackerModel] = useState("");

  useEffect(() => {
    loadConfigurations();
  }, []);

  useEffect(() => {
    setSelectedConfiguration(currentConfiguration || "");
  }, [currentConfiguration]);

  const loadConfigurations = async () => {
    try {
      const configs = await fetchAutomationConfigurations();
      setConfigurations(configs || []);
    } catch (error) {
      console.error("Error loading configurations:", error);
      // Set empty array instead of showing error toast on initial load
      setConfigurations([]);
    }
  };

  const handleConfigurationChange = async (value: string) => {
    if (!isEditable) return;
    
    setIsLoading(true);
    try {
      await updateHomologationConfiguration(cardId, value);
      setSelectedConfiguration(value);
      onUpdate();
      toast({
        title: "Configuração atualizada",
        description: "A configuração foi atualizada com sucesso"
      });
    } catch (error) {
      console.error("Error updating configuration:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar configuração",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewConfiguration = async () => {
    if (!newConfiguration.trim() || !newTrackerModel.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create the automation rule
      await createAutomationRule(
        brand,
        model,
        newConfiguration.trim(),
        newTrackerModel.trim()
      );

      // Update the homologation card with the new configuration
      await updateHomologationConfiguration(cardId, newConfiguration.trim());
      
      // Refresh configurations list
      await loadConfigurations();
      
      setSelectedConfiguration(newConfiguration.trim());
      setNewConfiguration("");
      setNewTrackerModel("");
      setIsNewConfigOpen(false);
      onUpdate();
      
      toast({
        title: "Configuração criada",
        description: "Nova configuração criada e aplicada com sucesso"
      });
    } catch (error) {
      console.error("Error creating configuration:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar nova configuração",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isEditable && !selectedConfiguration) {
    return (
      <div className="text-sm text-gray-500">
        Nenhuma configuração definida
      </div>
    );
  }

  if (!isEditable) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Configuração</Label>
        <div className="text-sm font-medium text-gray-900 p-2 bg-gray-50 border border-gray-200 rounded">
          {selectedConfiguration}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">Configuração</Label>
      <div className="flex gap-2">
        <Select
          value={selectedConfiguration}
          onValueChange={handleConfigurationChange}
          disabled={isLoading}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecione uma configuração..." />
          </SelectTrigger>
          <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
            {configurations.map((config) => (
              <SelectItem key={config} value={config}>
                {config}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Dialog open={isNewConfigOpen} onOpenChange={setIsNewConfigOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Nova Configuração</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="vehicle-info" className="text-sm font-medium text-gray-700">
                  Veículo
                </Label>
                <div className="text-sm text-gray-600 p-2 bg-gray-50 border border-gray-200 rounded">
                  {brand} {model}
                </div>
              </div>
              
              <div>
                <Label htmlFor="new-configuration" className="text-sm font-medium text-gray-700">
                  Nome da Configuração *
                </Label>
                <Input
                  id="new-configuration"
                  value={newConfiguration}
                  onChange={(e) => setNewConfiguration(e.target.value)}
                  placeholder="Ex: Configuração Básica"
                />
              </div>
              
              <div>
                <Label htmlFor="tracker-model" className="text-sm font-medium text-gray-700">
                  Modelo do Rastreador *
                </Label>
                <Input
                  id="tracker-model"
                  value={newTrackerModel}
                  onChange={(e) => setNewTrackerModel(e.target.value)}
                  placeholder="Ex: TR-200"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsNewConfigOpen(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateNewConfiguration}
                  disabled={isLoading}
                >
                  {isLoading ? "Criando..." : "Criar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ConfigurationSelector;
