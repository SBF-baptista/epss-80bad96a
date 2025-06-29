
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import HomologationKanban from "@/components/HomologationKanban";
import Navigation from "@/components/Navigation";
import { fetchHomologationCards, createHomologationCard } from "@/services/homologationService";
import { useToast } from "@/hooks/use-toast";

const Homologation = () => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newYear, setNewYear] = useState("");

  const { data: cards = [], isLoading, refetch } = useQuery({
    queryKey: ['homologation-cards'],
    queryFn: fetchHomologationCards,
  });

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
      refetch();
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="h-24 bg-gray-200 rounded mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-96 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Homologação de Veículos</h1>
          <Navigation />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Criar Nova Homologação</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marca *
              </label>
              <Input
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder="Ex: Toyota"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modelo *
              </label>
              <Input
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                placeholder="Ex: Corolla"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ano (opcional)
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
            <Button
              onClick={handleCreateCard}
              disabled={isCreating}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {isCreating ? "Criando..." : "Criar Card"}
            </Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Kanban de Homologação ({cards.length} itens)
            </h2>
          </div>

          <HomologationKanban 
            cards={cards} 
            onUpdate={refetch}
          />
        </div>
      </div>
    </div>
  );
};

export default Homologation;
