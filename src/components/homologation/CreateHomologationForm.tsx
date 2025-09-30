import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { createHomologationCard } from "@/services/homologationService";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useFipeBrands, useFipeModels, useFipeYears } from "@/hooks/useFipeData";

interface CreateHomologationFormProps {
  onUpdate: () => void;
}

const CreateHomologationForm = ({ onUpdate }: CreateHomologationFormProps) => {
  const { toast } = useToast();
  const { isInstaller } = useUserRole();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBrandCode, setSelectedBrandCode] = useState("");
  const [selectedBrandName, setSelectedBrandName] = useState("");
  const [selectedModelCode, setSelectedModelCode] = useState("");
  const [selectedModelName, setSelectedModelName] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [nextStep, setNextStep] = useState<"queue" | "execute" | "">(isInstaller() ? "execute" : "");

  const { brands, loading: loadingBrands } = useFipeBrands();
  const { models, loading: loadingModels } = useFipeModels(selectedBrandCode);
  const { years, loading: loadingYears } = useFipeYears(selectedBrandCode, selectedModelCode);

  const handleCreateCard = async () => {
    if (!selectedBrandName || !selectedModelName || (!isInstaller() && !nextStep)) {
      toast({
        title: "Campos obrigatórios",
        description: isInstaller() 
          ? "Por favor, selecione marca e modelo" 
          : "Por favor, selecione marca, modelo e como deseja prosseguir",
        variant: "destructive"
      });
      return;
    }

    const year = selectedYear ? parseInt(selectedYear) : undefined;

    setIsCreating(true);
    try {
      const executeNow = isInstaller() || nextStep === "execute";
      await createHomologationCard(selectedBrandName, selectedModelName, year, undefined, executeNow);
      
      // Reset form
      setSelectedBrandCode("");
      setSelectedBrandName("");
      setSelectedModelCode("");
      setSelectedModelName("");
      setSelectedYear("");
      setNextStep(isInstaller() ? "execute" : "");
      
      onUpdate();
      const statusMessage = executeNow ? " e movido para execução de testes" : " e adicionado à fila";
      toast({
        title: "Card criado",
        description: `Card de homologação criado para ${selectedBrandName} ${selectedModelName}${year ? ` (${year})` : ""}${statusMessage}`
      });
    } catch (error) {
      console.error("Error creating homologation card:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar card de homologação",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleBrandChange = (value: string) => {
    const brand = brands.find(b => b.code === value);
    if (brand) {
      setSelectedBrandCode(brand.code);
      setSelectedBrandName(brand.name);
      setSelectedModelCode("");
      setSelectedModelName("");
      setSelectedYear("");
    }
  };

  const handleModelChange = (value: string) => {
    const model = models.find(m => m.code === value);
    if (model) {
      setSelectedModelCode(model.code);
      setSelectedModelName(model.name);
      setSelectedYear("");
    }
  };

  return (
    <div className="bg-white p-3 md:p-4 lg:p-6 rounded-lg shadow-sm border">
      <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Criar Nova Homologação</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Marca *
            </label>
            <Select
              value={selectedBrandCode}
              onValueChange={handleBrandChange}
              disabled={loadingBrands}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder={loadingBrands ? "Carregando..." : "Selecione a marca"} />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.code} value={brand.code}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modelo *
            </label>
            <Select
              value={selectedModelCode}
              onValueChange={handleModelChange}
              disabled={!selectedBrandCode || loadingModels}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder={
                  !selectedBrandCode ? "Selecione uma marca primeiro" :
                  loadingModels ? "Carregando..." :
                  "Selecione o modelo"
                } />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.code} value={model.code}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ano
            </label>
            <Select
              value={selectedYear}
              onValueChange={setSelectedYear}
              disabled={!selectedModelCode || loadingYears}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder={
                  !selectedModelCode ? "Selecione um modelo primeiro" :
                  loadingYears ? "Carregando..." :
                  "Selecione o ano (opcional)"
                } />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year.code} value={year.code}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
          <Button
            onClick={handleCreateCard}
            disabled={isCreating || loadingBrands}
            className="flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
            size="sm"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Criar Card
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateHomologationForm;