
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { 
  fetchHomologationCards, 
  fetchWorkflowChain, 
  filterHomologationCards,
  type HomologationFilters as HomologationFiltersType
} from "@/services/homologationService";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import {
  HomologationMetrics,
  CreateHomologationForm,
  HomologationLoadingSkeleton,
  HomologationHeader,
  HomologationKanbanSection
} from "@/components/homologation";
import HomologationErrorBoundary from "@/components/homologation/HomologationErrorBoundary";
import HomologationFilters from "@/components/homologation/HomologationFilters";
import { PendingItemsAlert } from "@/components/homologation/PendingItemsAlert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Homologation = () => {
  const [filters, setFilters] = useState<HomologationFiltersType>({
    brand: "",
    year: "",
    searchText: ""
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: cards = [], isLoading, refetch } = useQuery({
    queryKey: ['homologation-cards'],
    queryFn: fetchHomologationCards,
  });

  const { data: workflowData = [] } = useQuery({
    queryKey: ['workflow-chain'],
    queryFn: fetchWorkflowChain,
  });

  // Realtime subscription for homologation cards
  useRealtimeSubscription('homologation_cards', 'homologation-cards');

  // Filter cards based on active filters
  const filteredCards = useMemo(() => {
    const filtered = filterHomologationCards(cards, filters);
    console.log('📊 Homologation Kanban Data:', {
      totalCards: cards.length,
      filteredCards: filtered.length,
      activeFilters: filters,
      cardsByStatus: cards.reduce((acc, card) => {
        acc[card.status] = (acc[card.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
    return filtered;
  }, [cards, filters]);

  const handleFiltersChange = (newFilters: HomologationFiltersType) => {
    setFilters(newFilters);
  };

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    refetch();
  };

  if (isLoading) {
    return <HomologationLoadingSkeleton />;
  }

  return (
    <HomologationErrorBoundary>
      <div className="container-mobile min-h-screen bg-gray-50 px-3 sm:px-6">
        <div className="w-full max-w-[1600px] mx-auto space-y-3 sm:space-y-4 lg:space-y-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <HomologationHeader />
            
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Criar nova homologação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Nova Homologação</DialogTitle>
                </DialogHeader>
                <CreateHomologationForm onUpdate={handleCreateSuccess} />
              </DialogContent>
            </Dialog>
          </div>
          
          <HomologationMetrics
            cards={filteredCards} 
            workflowData={workflowData} 
          />
          
          <PendingItemsAlert />
          
          <HomologationKanbanSection
            cards={filteredCards} 
            onUpdate={refetch}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            allCards={cards}
          />
        </div>
      </div>
    </HomologationErrorBoundary>
  );
};

export default Homologation;
