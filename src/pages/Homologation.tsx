
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Link, TrendingUp } from "lucide-react";
import HomologationKanban from "@/components/HomologationKanban";
import Navigation from "@/components/Navigation";
import { fetchHomologationCards, createHomologationCard, fetchWorkflowChain } from "@/services/homologationService";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  const { data: workflowData = [] } = useQuery({
    queryKey: ['workflow-chain'],
    queryFn: fetchWorkflowChain,
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

  // Calculate workflow metrics
  const linkedCards = cards.filter(card => card.incoming_vehicle_id).length;
  const cardsWithOrders = cards.filter(card => card.created_order_id).length;
  const homologatedCards = cards.filter(card => card.status === 'homologado').length;
  const totalPendingVehicles = workflowData.filter(item => item.incoming_processed === false).length;

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

        {/* Workflow Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cards Vinculados</CardTitle>
              <Link className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{linkedCards}</div>
              <p className="text-xs text-muted-foreground">
                de {cards.length} cards totais
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Criados</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{cardsWithOrders}</div>
              <p className="text-xs text-muted-foreground">
                automaticamente via homologação
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Homologados</CardTitle>
              <div className="h-4 w-4 bg-green-500 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{homologatedCards}</div>
              <p className="text-xs text-muted-foreground">
                aprovados para produção
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Veículos Pendentes</CardTitle>
              <div className="h-4 w-4 bg-yellow-500 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{totalPendingVehicles}</div>
              <p className="text-xs text-muted-foreground">
                aguardando processamento
              </p>
            </CardContent>
          </Card>
        </div>

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
