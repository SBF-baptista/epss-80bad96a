import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import HomologationErrorBoundary from "@/components/homologation/HomologationErrorBoundary";
import { HomologationKitsSection } from "@/components/homologation";
import { supabase } from "@/integrations/supabase/client";

const KitManagement = () => {
  const queryClient = useQueryClient();

  // Set up real-time subscription for changes
  useEffect(() => {
    const channel = supabase
      .channel('kit-management-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kit_item_options'
        },
        (payload) => {
          console.log('Kit item option changed in Kit Management:', payload);
          // Trigger refetch of kits and pending items data
          queryClient.invalidateQueries({ queryKey: ['homologation-kits'] });
          queryClient.invalidateQueries({ queryKey: ['pending-homologation-items'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'homologation_kit_accessories'
        },
        (payload) => {
          console.log('Kit accessory changed in Kit Management:', payload);
          // Trigger refetch of pending items when kit items change
          queryClient.invalidateQueries({ queryKey: ['pending-homologation-items'] });
          queryClient.invalidateQueries({ queryKey: ['homologation-kits'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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