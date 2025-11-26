
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { SegsaleFetchPanel } from "@/components/homologation/SegsaleFetchPanel";
import { PendingItemsAlert } from "@/components/homologation/PendingItemsAlert";

const Homologation = () => {
  const [filters, setFilters] = useState<HomologationFiltersType>({
    brand: "",
    year: "",
    searchText: ""
  });

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

  if (isLoading) {
    return <HomologationLoadingSkeleton />;
  }

  return (
    <HomologationErrorBoundary>
      <div className="container-mobile min-h-screen bg-gray-50 px-3 sm:px-6">
        <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 lg:space-y-6 py-4 sm:py-6">
          <HomologationHeader />
          
          <HomologationMetrics
            cards={filteredCards} 
            workflowData={workflowData} 
          />
          
          <PendingItemsAlert />
          
          <CreateHomologationForm onUpdate={refetch} />
          
          <HomologationFilters 
            cards={cards}
            onFiltersChange={handleFiltersChange}
          />
          
          <HomologationKanbanSection
            cards={filteredCards} 
            onUpdate={refetch} 
          />
        </div>
      </div>
    </HomologationErrorBoundary>
  );
};

export default Homologation;
