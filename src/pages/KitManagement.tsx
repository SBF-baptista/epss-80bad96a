import HomologationErrorBoundary from "@/components/homologation/HomologationErrorBoundary";
import { HomologationKitsSection } from "@/components/homologation";
import Navigation from "@/components/Navigation";

const KitManagement = () => {
  return (
    <HomologationErrorBoundary>
      <div className="container-mobile min-h-screen bg-gray-50 px-3 sm:px-6">
        <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 lg:space-y-6 py-4 sm:py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Kits</h1>
            <Navigation />
          </div>
          
          <HomologationKitsSection homologationCardId={undefined} />
        </div>
      </div>
    </HomologationErrorBoundary>
  );
};

export default KitManagement;