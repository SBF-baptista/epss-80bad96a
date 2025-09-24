import { useState } from "react";
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
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Gerenciamento de Técnicos</h1>

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