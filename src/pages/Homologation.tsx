
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  fetchHomologationCards, 
  fetchWorkflowChain, 
  filterHomologationCards,
  type HomologationFilters as HomologationFiltersType
} from "@/services/homologationService";
import {
  HomologationMetrics,
  CreateHomologationForm,
  HomologationLoadingSkeleton,
  HomologationHeader,
  HomologationKanbanSection,
  HomologationKitsSection,
  AccessoryHomologationSection
} from "@/components/homologation";
import HomologationErrorBoundary from "@/components/homologation/HomologationErrorBoundary";
import HomologationFilters from "@/components/homologation/HomologationFilters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Homologation = () => {
  const [filters, setFilters] = useState<HomologationFiltersType>({
    brand: "",
    year: "",
    searchText: ""
  });
  const [activeTab, setActiveTab] = useState("homologation");

  const { data: cards = [], isLoading, refetch } = useQuery({
    queryKey: ['homologation-cards'],
    queryFn: fetchHomologationCards,
  });

  const { data: workflowData = [] } = useQuery({
    queryKey: ['workflow-chain'],
    queryFn: fetchWorkflowChain,
  });

  // Filter cards based on active filters
  const filteredCards = useMemo(() => {
    return filterHomologationCards(cards, filters);
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
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="homologation">Homologação</TabsTrigger>
              <TabsTrigger value="kits">Kits</TabsTrigger>
            </TabsList>
            
            <TabsContent value="homologation" className="space-y-3 sm:space-y-4 lg:space-y-6 mt-6">
              <HomologationMetrics 
                cards={filteredCards} 
                workflowData={workflowData} 
              />
              
              <HomologationFilters 
                cards={cards}
                onFiltersChange={handleFiltersChange}
              />
              
              <CreateHomologationForm onUpdate={refetch} />
              
              <AccessoryHomologationSection />
              
              <HomologationKanbanSection
                cards={filteredCards} 
                onUpdate={refetch} 
              />
            </TabsContent>
            
            <TabsContent value="kits" className="mt-6">
              <HomologationKitsSection homologationCardId={undefined} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </HomologationErrorBoundary>
  );
};

export default Homologation;
