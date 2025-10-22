import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import HomologationErrorBoundary from "@/components/homologation/HomologationErrorBoundary";
import { AccessoryHomologationForm, AccessoryHomologationList } from "@/components/homologation";
import { SupplyHomologationForm } from "@/components/homologation/SupplyHomologationForm";
import { SupplyHomologationList } from "@/components/homologation/SupplyHomologationList";
import { PendingAccessoriesSection } from "@/components/homologation/PendingAccessoriesSection";
import { PendingSuppliesSection } from "@/components/homologation/PendingSuppliesSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

const AccessorySupplyHomologation = () => {
  const queryClient = useQueryClient();

  // Set up real-time subscription for kit_item_options and customers changes
  useEffect(() => {
    const channel = supabase
      .channel('accessory-homologation-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kit_item_options'
        },
        (payload) => {
          console.log('Kit item option changed in Accessories:', payload);
          // Invalidate queries to refetch pending items
          queryClient.invalidateQueries({ queryKey: ['pending-homologation-items'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers'
        },
        (payload) => {
          console.log('Customer changed in Accessories:', payload);
          // Invalidate queries to refetch pending items when customers change
          queryClient.invalidateQueries({ queryKey: ['pending-homologation-items'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <HomologationErrorBoundary>
      <div className="container-mobile min-h-screen bg-gray-50 px-3 sm:px-6">
        <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 lg:space-y-6 py-4 sm:py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Homologação de Acessórios e Insumos</h1>
          </div>
          
          <Tabs defaultValue="accessories" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 bg-muted p-1 rounded-lg">
              <TabsTrigger 
                value="accessories" 
                className="h-10 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium"
              >
                Acessórios
              </TabsTrigger>
              <TabsTrigger 
                value="supplies"
                className="h-10 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium"
              >
                Insumos
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="accessories" className="space-y-6 mt-6">
              <PendingAccessoriesSection />
              <AccessoryHomologationForm />
              <AccessoryHomologationList />
            </TabsContent>
            
            <TabsContent value="supplies" className="space-y-6 mt-6">
              <PendingSuppliesSection />
              <SupplyHomologationForm />
              <SupplyHomologationList />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </HomologationErrorBoundary>
  );
};

export default AccessorySupplyHomologation;