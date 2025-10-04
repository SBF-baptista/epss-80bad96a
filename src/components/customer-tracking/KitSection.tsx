import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, User, Clock, Package, AlertCircle } from "lucide-react";
import { KitStatusTimeline } from "./KitStatusTimeline";
import { KitItemsList } from "./KitItemsList";
import { RescheduleModal } from "./RescheduleModal";

interface KitSectionProps {
  kitData: {
    id: string;
    kit_id: string;
    technician_id: string;
    scheduled_date: string;
    installation_time?: string;
    status: string;
    notes?: string;
    customer_name: string;
    technician_name?: string;
    kit?: any;
    homologationStatus?: any;
  };
  onUpdate: () => void;
}

export const KitSection = ({ kitData, onUpdate }: KitSectionProps) => {
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

  const getStatusInfo = () => {
    // First check homologation status if kit exists
    if (kitData.kit && kitData.homologationStatus) {
      const hs = kitData.homologationStatus;
      if (!hs.isHomologated) {
        const pendingCount =
          (hs.pendingItems?.equipment?.length || 0) +
          (hs.pendingItems?.accessories?.length || 0) +
          (hs.pendingItems?.supplies?.length || 0);

        return {
          status: "homologation",
          label: "🔴 Em homologação",
          color: "bg-red-500",
          description: `${pendingCount} itens pendentes de homologação`,
          progress: 25,
        };
      }
    }


    switch (kitData.status) {
      case "scheduled":
        return {
          status: "scheduled",
          label: "🟡 Aguardando agendamento",
          color: "bg-yellow-500",
          description: "Kit pronto para agendamento com técnico",
          progress: 50
        };
      case "assigned":
        return {
          status: "assigned",
          label: "🟢 Atribuído a técnico",
          color: "bg-blue-500",
          description: `Agendado com ${kitData.technician_name || 'técnico'}`,
          progress: 75
        };
      case "completed":
        return {
          status: "completed",
          label: "✅ Instalado / Concluído",
          color: "bg-green-500",
          description: "Instalação concluída com sucesso",
          progress: 100
        };
      default:
        return {
          status: "pending",
          label: "🔴 Pendente",
          color: "bg-red-500",
          description: "Aguardando processamento",
          progress: 0
        };
    }
  };

  const statusInfo = getStatusInfo();

  const getDaysInHomologation = () => {
    if (kitData.kit?.created_at && statusInfo.status === "homologation") {
      const createdDate = new Date(kitData.kit.created_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  const formatDateTime = (date: string, time?: string) => {
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString('pt-BR');
    if (time) {
      return `${dateStr} às ${time}`;
    }
    return dateStr;
  };

  return (
    <>
      <Card className="border-l-4" style={{ borderLeftColor: statusInfo.color.replace('bg-', '') === 'red-500' ? '#ef4444' : 
        statusInfo.color.replace('bg-', '') === 'yellow-500' ? '#eab308' :
        statusInfo.color.replace('bg-', '') === 'blue-500' ? '#3b82f6' : '#22c55e' }}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                {kitData.kit?.name || `Kit ${kitData.kit_id}`}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={statusInfo.color.replace('bg-', 'text-') + ' border-current'}>
                  {statusInfo.label}
                </Badge>
                {statusInfo.status === "homologation" && (
                  <Badge variant="outline" className="text-red-600 border-red-300">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {getDaysInHomologation()} dias
                  </Badge>
                )}
              </div>
            </div>
            {statusInfo.status === "assigned" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRescheduleModalOpen(true)}
              >
                Reagendar
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {kitData.status === 'shipped' && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progresso da instalação</span>
                <span>{statusInfo.progress}%</span>
              </div>
              <Progress value={statusInfo.progress} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">{statusInfo.description}</p>
            </div>
          )}

          <KitStatusTimeline status={statusInfo.status} />

          {kitData.technician_name && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-500" />
              <span><strong>Técnico:</strong> {kitData.technician_name}</span>
            </div>
          )}

          {kitData.scheduled_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span><strong>Agendamento:</strong> {formatDateTime(kitData.scheduled_date, kitData.installation_time)}</span>
            </div>
          )}

          {statusInfo.status === "homologation" && kitData.homologationStatus && (
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Status de Homologação dos Itens:</h5>
              <KitItemsList homologationStatus={kitData.homologationStatus} />
            </div>
          )}

          {kitData.kit && statusInfo.status !== "homologation" && (
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Itens do Kit:</h5>
              <KitItemsList 
                kit={kitData.kit}
                showHomologationStatus={false}
              />
            </div>
          )}

          {kitData.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm"><strong>Observações:</strong> {kitData.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <RescheduleModal
        schedule={kitData}
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        onUpdate={onUpdate}
      />
    </>
  );
};