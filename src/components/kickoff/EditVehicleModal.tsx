import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useFipeBrands, useFipeModels, useFipeYears } from "@/hooks/useFipeData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
          <div className="space-y-2">
            <Label>Marca</Label>
            <Select
              value={selectedBrandCode}
              onValueChange={handleBrandChange}
              disabled={loadingBrands}
            >
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label>Modelo</Label>
            <Select
              value={selectedModelCode}
              onValueChange={handleModelChange}
              disabled={!selectedBrandCode || loadingModels}
            >
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label>Ano (opcional)</Label>
            <Select
              value={selectedYearCode}
              onValueChange={handleYearChange}
              disabled={!selectedModelCode || loadingYears}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedModelCode ? "Selecione um modelo primeiro" :
                  loadingYears ? "Carregando..." :
                  "Selecione o ano"
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

          <div className="rounded-lg bg-muted p-3 space-y-1">
            <p className="text-sm font-medium">Resumo da alteração:</p>
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
