
import { useQuery } from "@tanstack/react-query";
import { fetchHomologationCards, fetchWorkflowChain } from "@/services/homologationService";
import {
  HomologationMetrics,
  CreateHomologationForm,
  HomologationLoadingSkeleton,
  HomologationHeader,
  HomologationKanbanSection
} from "@/components/homologation";
import HomologationErrorBoundary from "@/components/homologation/HomologationErrorBoundary";

const Homologation = () => {
  const { data: cards = [], isLoading, refetch } = useQuery({
    queryKey: ['homologation-cards'],
    queryFn: fetchHomologationCards,
  });

  const { data: workflowData = [] } = useQuery({
    queryKey: ['workflow-chain'],
    queryFn: fetchWorkflowChain,
  });

  if (isLoading) {
    return <HomologationLoadingSkeleton />;
  }

  return (
    <HomologationErrorBoundary>
      <div className="container-mobile min-h-screen bg-gray-50 px-3 sm:px-6">
        <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 lg:space-y-6 py-4 sm:py-6">
          <HomologationHeader />
          
          <HomologationMetrics 
            cards={cards} 
            workflowData={workflowData} 
          />
          
          <CreateHomologationForm onUpdate={refetch} />
          
          <HomologationKanbanSection 
            cards={cards} 
            onUpdate={refetch} 
          />
        </div>
      </div>
    </HomologationErrorBoundary>
  );
};

export default Homologation;
