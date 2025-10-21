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
          label: "📋 Pedidos",
          color: "bg-blue-500",
          description: "Pedido criado",
          progress: 25
        };
      case "in_progress":
        return {
          status: "in_progress",
          label: "🔧 Em Produção",
          color: "bg-yellow-500",
          description: "Kit em produção",
          progress: 50
        };
      case "completed":
        return {
          status: "completed",
          label: "📦 Aguardando Envio",
          color: "bg-orange-500",
          description: "Pronto para envio",
          progress: 75
        };
      case "shipped":
        return {
          status: "shipped",
          label: "✅ Enviado",
          color: "bg-green-500",
          description: "Enviado ao cliente",
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

  const getDaysInStatus = () => {
    // Use kit created_at for homologation, otherwise use scheduled date or now
    let referenceDate: Date;
    
    if (statusInfo.status === "homologation" && kitData.kit?.created_at) {
      referenceDate = new Date(kitData.kit.created_at);
    } else if (kitData.scheduled_date) {
      referenceDate = new Date(kitData.scheduled_date);
    } else {
      return { days: 0, entryDate: null };
    }
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - referenceDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      days: diffDays,
      entryDate: referenceDate.toLocaleDateString('pt-BR')
    };
  };

  const statusDaysInfo = getDaysInStatus();

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
            <div className="space-y-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                {kitData.kit?.name || `Kit ${kitData.kit_id}`}
              </CardTitle>
              <div className="space-y-1">
                <Badge variant="outline" className={statusInfo.color.replace('bg-', 'text-') + ' border-current'}>
                  {statusInfo.label}
                </Badge>
                {statusDaysInfo.entryDate && (
                  <div className="text-xs text-muted-foreground">
                    Entrou em {statusDaysInfo.entryDate}
                  </div>
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

          <KitStatusTimeline status={statusInfo.status} kitData={kitData} />

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