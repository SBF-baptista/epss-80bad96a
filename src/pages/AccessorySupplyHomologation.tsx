import HomologationErrorBoundary from "@/components/homologation/HomologationErrorBoundary";
import { AccessoryHomologationForm, AccessoryHomologationList } from "@/components/homologation";
import { SupplyHomologationForm } from "@/components/homologation/SupplyHomologationForm";
import { SupplyHomologationList } from "@/components/homologation/SupplyHomologationList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";

const AccessorySupplyHomologation = () => {
  return (
    <HomologationErrorBoundary>
      <div className="container-mobile min-h-screen bg-gray-50 px-3 sm:px-6">
        <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 lg:space-y-6 py-4 sm:py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Homologação de Acessórios e Insumos</h1>
            <Navigation />
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
              <AccessoryHomologationForm />
              <AccessoryHomologationList />
            </TabsContent>
            
            <TabsContent value="supplies" className="space-y-6 mt-6">
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