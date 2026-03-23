import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import HomologationErrorBoundary from "@/components/homologation/HomologationErrorBoundary";
import { HomologationKitsSection } from "@/components/homologation";
import { useCentralRealtime } from "@/hooks/useCentralRealtime";

const KitManagement = () => {
  const queryClient = useQueryClient();

  const invalidateKitData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['homologation-kits'] });
    queryClient.invalidateQueries({ queryKey: ['pending-homologation-items'] });
  }, [queryClient]);

  useCentralRealtime('homologation_kits', invalidateKitData);
  useCentralRealtime('homologation_kit_accessories', invalidateKitData);
  useCentralRealtime('kit_item_options', invalidateKitData);
  useCentralRealtime('item_edit_requests', invalidateKitData);

  return (
    <HomologationErrorBoundary>
      <div className="container-mobile min-h-screen bg-background px-3 sm:px-6">
        <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 lg:space-y-6 py-4 sm:py-6">
          <h1 className="text-3xl font-bold text-foreground mb-6">Gerenciamento de Kits</h1>
          
          <HomologationKitsSection homologationCardId={undefined} />
        </div>
      </div>
    </HomologationErrorBoundary>
  );
};

export default KitManagement;