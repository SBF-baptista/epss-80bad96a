import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { createHomologationCard } from "@/services/homologationService";
import { useToast } from "@/hooks/use-toast";

interface CreateHomologationFormProps {
  onUpdate: () => void;
}

const CreateHomologationForm = ({ onUpdate }: CreateHomologationFormProps) => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newYear, setNewYear] = useState("");

  const handleCreateCard = async () => {
    if (!newBrand.trim() || !newModel.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha marca e modelo",
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
      await createHomologationCard(newBrand.trim(), newModel.trim(), year);
      setNewBrand("");
      setNewModel("");
      setNewYear("");
      onUpdate();
      toast({
        title: "Card criado",
        description: `Card de homologação criado para ${newBrand} ${newModel}${year ? ` (${year})` : ""}`
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
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Criar Nova Homologação</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Marca *
          </label>
          <Input
            value={newBrand}
            onChange={(e) => setNewBrand(e.target.value)}
            placeholder="Ex: Toyota"
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
          />
        </div>
        <div>
          <Button
            onClick={handleCreateCard}
            disabled={isCreating}
            className="flex items-center gap-2 w-full"
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