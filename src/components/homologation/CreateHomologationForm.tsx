import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { createHomologationCard } from "@/services/homologationService";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

interface CreateHomologationFormProps {
  onUpdate: () => void;
}

const CreateHomologationForm = ({ onUpdate }: CreateHomologationFormProps) => {
  const { toast } = useToast();
  const { isInstaller } = useUserRole();
  const [isCreating, setIsCreating] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newYear, setNewYear] = useState("");
  const [nextStep, setNextStep] = useState<"queue" | "execute" | "">(isInstaller() ? "execute" : "");

  const handleCreateCard = async () => {
    if (!newBrand.trim() || !newModel.trim() || (!isInstaller() && !nextStep)) {
      toast({
        title: "Campos obrigatórios",
        description: isInstaller() 
          ? "Por favor, preencha marca e modelo" 
          : "Por favor, preencha marca, modelo e como deseja prosseguir",
        variant: "destructive"
      });
      return;
    }

    const year = newYear.trim() ? parseInt(newYear.trim()) : undefined;
    if (newYear.trim() && (isNaN(year!) || year! < 1900 || year! > new Date().getFullYear() + 1)) {
      toast({
        title: "Ano inválido",
        description: "Por favor, insira um ano válido",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const executeNow = isInstaller() || nextStep === "execute";
      await createHomologationCard(newBrand.trim(), newModel.trim(), year, undefined, executeNow);
      setNewBrand("");
      setNewModel("");
      setNewYear("");
      setNextStep(isInstaller() ? "execute" : "");
      onUpdate();
      const statusMessage = executeNow ? " e movido para execução de testes" : " e adicionado à fila";
      toast({
        title: "Card criado",
        description: `Card de homologação criado para ${newBrand} ${newModel}${year ? ` (${year})` : ""}${statusMessage}`
      });
    } catch (error) {
      console.error("Error creating homologation card:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar card de homologação",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white p-3 md:p-6 rounded-lg shadow-sm border">
      <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Criar Nova Homologação</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Marca *
          </label>
          <Input
            value={newBrand}
            onChange={(e) => setNewBrand(e.target.value)}
            placeholder="Ex: Toyota"
            className="text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modelo *
          </label>
          <Input
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
            placeholder="Ex: Corolla"
            className="text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ano
          </label>
          <Input
            type="number"
            value={newYear}
            onChange={(e) => setNewYear(e.target.value)}
            placeholder="Ex: 2024"
            min="1900"
            max={new Date().getFullYear() + 1}
            className="text-sm"
          />
        </div>
        </div>
        
        {!isInstaller() && (
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-3">
              Como deseja prosseguir? *
            </Label>
            <RadioGroup 
              value={nextStep} 
              onValueChange={(value: "queue" | "execute") => setNextStep(value)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="queue" id="queue" />
                <Label htmlFor="queue" className="text-sm cursor-pointer">
                  Adicionar à fila (fluxo padrão)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="execute" id="execute" />
                <Label htmlFor="execute" className="text-sm cursor-pointer">
                  Executar testes agora (urgente)
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}
        
        {isInstaller() && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 font-medium">
              Como instalador, este card será automaticamente direcionado para execução de testes.
            </p>
          </div>
        )}
        
        <div className="flex justify-end">
          <Button
            onClick={handleCreateCard}
            disabled={isCreating}
            className="flex items-center gap-2 text-sm"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            {isCreating ? "Criando..." : "Criar Card"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateHomologationForm;