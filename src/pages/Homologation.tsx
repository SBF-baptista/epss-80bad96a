
import { useQuery } from "@tanstack/react-query";
import { fetchHomologationCards, fetchWorkflowChain } from "@/services/homologationService";
import {
  HomologationMetrics,
  CreateHomologationForm,
  HomologationLoadingSkeleton,
  HomologationHeader,
  HomologationKanbanSection
} from "@/components/homologation";

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-3 md:space-y-6">
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
  );
};

export default Homologation;
