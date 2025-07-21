
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
      <div className="container-mobile min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto space-y-3 md:space-y-6 px-0">
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
