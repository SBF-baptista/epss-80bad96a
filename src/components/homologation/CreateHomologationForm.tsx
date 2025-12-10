import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { createHomologationCard } from "@/services/homologationService";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useFipeBrands, useFipeModels, useFipeYears } from "@/hooks/useFipeData";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { logCreate } from "@/services/logService";

interface CreateHomologationFormProps {
  onUpdate: () => void;
}

const CreateHomologationForm = ({ onUpdate }: CreateHomologationFormProps) => {
  const { toast } = useToast();
  const { isOperadorHomologacao } = useUserRole();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBrandCode, setSelectedBrandCode] = useState("");
  const [selectedBrandName, setSelectedBrandName] = useState("");
  const [selectedModelCode, setSelectedModelCode] = useState("");
  const [selectedModelName, setSelectedModelName] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [nextStep, setNextStep] = useState<"queue" | "execute" | "">(isOperadorHomologacao() ? "execute" : "");
  const [openBrand, setOpenBrand] = useState(false);
  const [openModel, setOpenModel] = useState(false);
  const [openYear, setOpenYear] = useState(false);

  const { brands, loading: loadingBrands } = useFipeBrands();
  const { models, loading: loadingModels } = useFipeModels(selectedBrandCode);
  const { years, loading: loadingYears } = useFipeYears(selectedBrandCode, selectedModelCode);

  const handleCreateCard = async () => {
    if (!selectedBrandName || !selectedModelName || (!isOperadorHomologacao() && !nextStep)) {
      toast({
        title: "Campos obrigatórios",
        description: isOperadorHomologacao() 
          ? "Por favor, selecione marca e modelo" 
          : "Por favor, selecione marca, modelo e como deseja prosseguir",
        variant: "destructive"
      });
      return;
    }

    const year = selectedYear ? parseInt(selectedYear) : undefined;

    setIsCreating(true);
    try {
      const executeNow = isOperadorHomologacao() || nextStep === "execute";
      const newCard = await createHomologationCard(selectedBrandName, selectedModelName, year, undefined, executeNow);
      
      // Registrar log da criação
      await logCreate(
        "Homologação",
        "card de homologação",
        newCard.id
      );
      
      // Reset form
      setSelectedBrandCode("");
      setSelectedBrandName("");
      setSelectedModelCode("");
      setSelectedModelName("");
      setSelectedYear("");
      setNextStep(isOperadorHomologacao() ? "execute" : "");
      
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
      setOpenBrand(false);
    }
  };

  const handleModelChange = (value: string) => {
    const model = models.find(m => m.code === value);
    if (model) {
      setSelectedModelCode(model.code);
      setSelectedModelName(model.name);
      setSelectedYear("");
      setOpenModel(false);
    }
  };

  const handleYearChange = (value: string) => {
    setSelectedYear(value);
    setOpenYear(false);
  };

  return (
    <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Marca *
            </label>
            <Popover open={openBrand} onOpenChange={setOpenBrand}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openBrand}
                  className="w-full justify-between text-sm"
                  disabled={loadingBrands}
                >
                  {selectedBrandName || (loadingBrands ? "Carregando..." : "Selecione a marca")}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Pesquisar ou criar marca..." 
                    className="h-9"
                    value={selectedBrandName}
                    onValueChange={(value) => {
                      setSelectedBrandName(value);
                      setSelectedBrandCode("");
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="py-6 text-center text-sm">
                        <p className="mb-2">Marca não encontrada na FIPE</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedBrandName.trim()) {
                              setOpenBrand(false);
                              setSelectedModelCode("");
                              setSelectedModelName("");
                              setSelectedYear("");
                            }
                          }}
                        >
                          Criar "{selectedBrandName}" manualmente
                        </Button>
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {brands
                        .filter(brand => 
                          brand.name.toLowerCase().includes(selectedBrandName.toLowerCase())
                        )
                        .map((brand) => (
                          <CommandItem
                            key={brand.code}
                            value={brand.name}
                            onSelect={() => handleBrandChange(brand.code)}
                          >
                            {brand.name}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedBrandCode === brand.code ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modelo *
            </label>
            <Popover open={openModel} onOpenChange={setOpenModel}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openModel}
                  className="w-full justify-between text-sm"
                  disabled={!selectedBrandCode || loadingModels}
                >
                  {selectedModelName || 
                    (!selectedBrandCode ? "Selecione uma marca primeiro" :
                    loadingModels ? "Carregando..." :
                    "Selecione o modelo")}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Pesquisar ou criar modelo..." 
                    className="h-9"
                    value={selectedModelName}
                    onValueChange={(value) => {
                      setSelectedModelName(value);
                      setSelectedModelCode("");
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="py-6 text-center text-sm">
                        <p className="mb-2">Modelo não encontrado na FIPE</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedModelName.trim()) {
                              setOpenModel(false);
                              setSelectedYear("");
                            }
                          }}
                        >
                          Criar "{selectedModelName}" manualmente
                        </Button>
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {models
                        .filter(model => 
                          model.name.toLowerCase().includes(selectedModelName.toLowerCase())
                        )
                        .map((model) => (
                          <CommandItem
                            key={model.code}
                            value={model.name}
                            onSelect={() => handleModelChange(model.code)}
                          >
                            {model.name}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedModelCode === model.code ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ano
            </label>
            <Popover open={openYear} onOpenChange={setOpenYear}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openYear}
                  className="w-full justify-between text-sm"
                  disabled={!selectedModelCode || loadingYears}
                >
                  {selectedYear ? years.find(y => y.code === selectedYear)?.name : 
                    (!selectedModelCode ? "Selecione um modelo primeiro" :
                    loadingYears ? "Carregando..." :
                    "Selecione o ano (opcional)")}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Pesquisar ou criar ano..." 
                    className="h-9"
                    value={selectedYear}
                    onValueChange={(value) => {
                      setSelectedYear(value);
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="py-6 text-center text-sm">
                        <p className="mb-2">Ano não encontrado na FIPE</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedYear.trim() && /^\d{4}$/.test(selectedYear)) {
                              setOpenYear(false);
                            }
                          }}
                        >
                          Criar "{selectedYear}" manualmente
                        </Button>
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {years
                        .filter(year => 
                          year.name.toLowerCase().includes(selectedYear.toLowerCase())
                        )
                        .map((year) => (
                          <CommandItem
                            key={year.code}
                            value={year.name}
                            onSelect={() => handleYearChange(year.code)}
                          >
                            {year.name}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedYear === year.code ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        {!isOperadorHomologacao() && (
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-3">
              Como deseja prosseguir? *
            </Label>
            <RadioGroup
              value={nextStep}
              onValueChange={(value) => setNextStep(value as "queue" | "execute")}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="queue" id="queue" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="queue" className="font-medium cursor-pointer">
                    Adicionar à fila
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Card será adicionado na coluna "A Homologar" para processamento posterior
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="execute" id="execute" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="execute" className="font-medium cursor-pointer">
                    Executar agora
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Card será enviado diretamente para "Agendamento de Teste"
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
        )}
        
        {isOperadorHomologacao() && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 font-medium">
              Como operador de homologação, este card será automaticamente direcionado para execução de testes.
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
  );
};

export default CreateHomologationForm;