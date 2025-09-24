import { useState } from "react";
import Navigation from "@/components/Navigation";
import HomologationErrorBoundary from "@/components/homologation/HomologationErrorBoundary";
import { TechnicianForm } from "@/components/technicians/TechnicianForm";
import { TechnicianList } from "@/components/technicians/TechnicianList";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { type Technician } from "@/services/technicianService";

const TechnicianManagement = () => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAdd = () => {
    setEditingTechnician(null);
    setIsFormVisible(true);
  };

  const handleEdit = (technician: Technician) => {
    setEditingTechnician(technician);
    setIsFormVisible(true);
  };

  const handleSuccess = () => {
    setIsFormVisible(false);
    setEditingTechnician(null);
    setRefreshKey(prev => prev + 1);
  };

  const handleCancel = () => {
    setIsFormVisible(false);
    setEditingTechnician(null);
  };

  return (
    <HomologationErrorBoundary>
      <div className="container-mobile min-h-screen bg-gray-50 px-3 sm:px-6">
        <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 lg:space-y-6 py-4 sm:py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Técnicos</h1>
            <Navigation />
          </div>

          {isFormVisible ? (
            <div className="space-y-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="mb-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Lista
              </Button>
              
              <TechnicianForm
                technician={editingTechnician}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            </div>
          ) : (
            <TechnicianList
              onAdd={handleAdd}
              onEdit={handleEdit}
              refreshKey={refreshKey}
            />
          )}
        </div>
      </div>
    </HomologationErrorBoundary>
  );
};

export default TechnicianManagement;