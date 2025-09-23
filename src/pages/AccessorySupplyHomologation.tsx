import HomologationErrorBoundary from "@/components/homologation/HomologationErrorBoundary";
import { AccessoryHomologationForm, AccessoryHomologationList } from "@/components/homologation";
import { SupplyHomologationForm } from "@/components/homologation/SupplyHomologationForm";
import { SupplyHomologationList } from "@/components/homologation/SupplyHomologationList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AccessorySupplyHomologation = () => {
  return (
    <HomologationErrorBoundary>
      <div className="container-mobile min-h-screen bg-gray-50 px-3 sm:px-6">
        <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 lg:space-y-6 py-4 sm:py-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Homologação de Acessórios e Insumos
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2">
                Gerencie acessórios e insumos homologados para uso em kits de homologação
              </p>
            </div>
          </div>
          
          <Tabs defaultValue="accessories" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="accessories">Acessórios</TabsTrigger>
              <TabsTrigger value="supplies">Insumos</TabsTrigger>
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