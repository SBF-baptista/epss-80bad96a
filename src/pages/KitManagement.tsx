import HomologationErrorBoundary from "@/components/homologation/HomologationErrorBoundary";
import { HomologationKitsSection } from "@/components/homologation";

const KitManagement = () => {
  return (
    <HomologationErrorBoundary>
      <div className="container-mobile min-h-screen bg-gray-50 px-3 sm:px-6">
        <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 lg:space-y-6 py-4 sm:py-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Gerenciamento de Kits
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2">
                Gerencie todos os kits de homologação, incluindo equipamentos, acessórios e insumos
              </p>
            </div>
          </div>
          
          <HomologationKitsSection homologationCardId={undefined} />
        </div>
      </div>
    </HomologationErrorBoundary>
  );
};

export default KitManagement;