import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Check, ChevronsUpDown } from "lucide-react";
import { useFipeBrands, useFipeModels, useFipeYears } from "@/hooks/useFipeData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { logUpdate } from "@/services/logService";

interface EditVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  currentBrand: string;
  currentModel: string;
  currentYear?: number;
  saleSummaryId: number;
  onSuccess: () => void;
}

export const EditVehicleModal = ({
  open,
  onOpenChange,
  vehicleId,
  currentBrand,
  currentModel,
  currentYear,
  saleSummaryId,
  onSuccess,
}: EditVehicleModalProps) => {
  const [selectedBrandCode, setSelectedBrandCode] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState(currentBrand);
  const [selectedModelCode, setSelectedModelCode] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState(currentModel);
  const [selectedYearCode, setSelectedYearCode] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number | undefined>(currentYear);
  const [saving, setSaving] = useState(false);
  
  // Popover states
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  const { brands, loading: loadingBrands } = useFipeBrands();
  const { models, loading: loadingModels } = useFipeModels(selectedBrandCode);
  const { years, loading: loadingYears } = useFipeYears(selectedBrandCode, selectedModelCode);

  // Initialize brand selection when modal opens
  useEffect(() => {
    if (open && brands.length > 0 && currentBrand) {
      const matchingBrand = brands.find(
        b => b.name.toUpperCase().trim() === currentBrand.toUpperCase().trim()
      );
      if (matchingBrand) {
        setSelectedBrandCode(matchingBrand.code);
      }
    }
  }, [open, brands, currentBrand]);

  // Initialize model selection when models load
  useEffect(() => {
    if (models.length > 0 && currentModel && selectedBrandCode) {
      const normalizeText = (text: string) => 
        text.normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase()
          .trim();
      
      const currentModelNormalized = normalizeText(currentModel);
      
      const matchingModel = models.find(m => {
        const modelNormalized = normalizeText(m.name);
        return modelNormalized.includes(currentModelNormalized) || 
               currentModelNormalized.includes(modelNormalized);
      });
      
      if (matchingModel) {
        setSelectedModelCode(matchingModel.code);
      }
    }
  }, [models, currentModel, selectedBrandCode]);

  // Initialize year selection when years load
  useEffect(() => {
    if (years.length > 0 && currentYear && selectedModelCode) {
      const matchingYear = years.find(
        y => y.name.includes(currentYear.toString())
      );
      if (matchingYear) {
        setSelectedYearCode(matchingYear.code);
      }
    }
  }, [years, currentYear, selectedModelCode]);

  const handleBrandChange = (brandCode: string) => {
    setSelectedBrandCode(brandCode);
    const brand = brands.find(b => b.code === brandCode);
    if (brand) {
      setSelectedBrand(brand.name);
    }
    // Reset model and year when brand changes
    setSelectedModelCode("");
    setSelectedModel("");
    setSelectedYearCode("");
    setSelectedYear(undefined);
    setBrandOpen(false);
  };

  const handleModelChange = (modelCode: string) => {
    setSelectedModelCode(modelCode);
    const model = models.find(m => m.code === modelCode);
    if (model) {
      setSelectedModel(model.name);
    }
    // Reset year when model changes
    setSelectedYearCode("");
    setSelectedYear(undefined);
    setModelOpen(false);
  };

  const handleYearChange = (yearCode: string) => {
    setSelectedYearCode(yearCode);
    const year = years.find(y => y.code === yearCode);
    if (year) {
      // Extract year number from name (e.g., "2024 Gasolina" -> 2024)
      const yearMatch = year.name.match(/^\d{4}/);
      if (yearMatch) {
        setSelectedYear(parseInt(yearMatch[0]));
      }
    }
    setYearOpen(false);
  };

  const handleSave = async () => {
    if (!selectedBrand || !selectedModel) {
      toast.error("Por favor, selecione marca e modelo");
      return;
    }

    setSaving(true);
    try {
      // Update incoming_vehicles table
      const { error } = await supabase
        .from('incoming_vehicles')
        .update({
          brand: selectedBrand,
          vehicle: selectedModel,
          year: selectedYear || null,
        })
        .eq('id', vehicleId);

      if (error) throw error;

      // Registrar log da atualização
      await logUpdate(
        "Kickoff",
        "veículo",
        vehicleId,
        `Marca: ${selectedBrand}, Modelo: ${selectedModel}${selectedYear ? `, Ano: ${selectedYear}` : ''}`
      );

      toast.success("Veículo atualizado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      toast.error("Erro ao atualizar veículo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Veículo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Brand Selector with Search */}
          <div className="space-y-2">
            <Label>Marca</Label>
            <Popover open={brandOpen} onOpenChange={setBrandOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={brandOpen}
                  className="w-full justify-between font-normal"
                  disabled={loadingBrands}
                >
                  {loadingBrands ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando...
                    </span>
                  ) : selectedBrand ? (
                    selectedBrand
                  ) : (
                    "Selecione a marca"
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Pesquisar marca..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>Nenhuma marca encontrada.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-[200px]">
                        {brands.map((brand) => (
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
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Model Selector with Search */}
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Popover open={modelOpen} onOpenChange={setModelOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={modelOpen}
                  className="w-full justify-between font-normal"
                  disabled={!selectedBrandCode || loadingModels}
                >
                  {!selectedBrandCode ? (
                    "Selecione uma marca primeiro"
                  ) : loadingModels ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando...
                    </span>
                  ) : selectedModel ? (
                    selectedModel
                  ) : (
                    "Selecione o modelo"
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Pesquisar modelo..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>Nenhum modelo encontrado.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-[200px]">
                        {models.map((model) => (
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
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Year Selector with Search */}
          <div className="space-y-2">
            <Label>Ano (opcional)</Label>
            <Popover open={yearOpen} onOpenChange={setYearOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={yearOpen}
                  className="w-full justify-between font-normal"
                  disabled={!selectedModelCode || loadingYears}
                >
                  {!selectedModelCode ? (
                    "Selecione um modelo primeiro"
                  ) : loadingYears ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando...
                    </span>
                  ) : selectedYear ? (
                    years.find(y => y.code === selectedYearCode)?.name || selectedYear.toString()
                  ) : (
                    "Selecione o ano"
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Pesquisar ano..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>Nenhum ano encontrado.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-[200px]">
                        {years.map((year) => (
                          <CommandItem
                            key={year.code}
                            value={year.name}
                            onSelect={() => handleYearChange(year.code)}
                          >
                            {year.name}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedYearCode === year.code ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 space-y-1 border">
            <p className="text-sm font-medium">Situação Atual:</p>
            <p className="text-sm text-muted-foreground">
              Marca: <span className="font-medium text-foreground">{currentBrand}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Modelo: <span className="font-medium text-foreground">{currentModel}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Ano: <span className="font-medium text-foreground">{currentYear || "-"}</span>
            </p>
          </div>

          <div className="rounded-lg bg-primary/10 p-3 space-y-1 border border-primary/20">
            <p className="text-sm font-medium">Resumo da Alteração:</p>
            <p className="text-sm text-muted-foreground">
              Marca: <span className="font-medium text-foreground">{selectedBrand || "-"}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Modelo: <span className="font-medium text-foreground">{selectedModel || "-"}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Ano: <span className="font-medium text-foreground">{selectedYear || "-"}</span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !selectedBrand || !selectedModel}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};