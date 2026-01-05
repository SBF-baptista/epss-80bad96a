import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, User, Package } from "lucide-react";
import { KitStatusTimeline } from "./KitStatusTimeline";
import { RescheduleModal } from "./RescheduleModal";
import { ProcessHistoryModal } from "./ProcessHistoryModal";
import { supabase } from "@/integrations/supabase/client";

import { CustomerKitData } from "@/pages/CustomerTracking";

interface KitSectionProps {
  kitData: CustomerKitData;
  onUpdate: () => void;
}

export const KitSection = ({ kitData, onUpdate }: KitSectionProps) => {
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [hasInstallationSchedule, setHasInstallationSchedule] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!kitData.id) return;
      
      // Load status history
      const { data: historyData, error: historyError } = await supabase
        .from('kit_schedule_status_history')
        .select('*')
        .eq('kit_schedule_id', kitData.id)
        .order('changed_at', { ascending: true });
      
      if (historyError) {
        console.error('Error loading status history:', historyError);
      } else {
        setStatusHistory(historyData || []);
      }

      // Check if there's an installation schedule
      const { data: installationData, error: installationError } = await supabase
        .from('installation_schedules')
        .select('id')
        .eq('kit_schedule_id', kitData.id)
        .limit(1);

      if (!installationError && installationData && installationData.length > 0) {
        setHasInstallationSchedule(true);
      }
    };

    loadData();
  }, [kitData.id]);

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

    // If there's an installation schedule, the vehicle has already been shipped
    // and is now scheduled for installation - show as "Instalação Agendada"
    if (hasInstallationSchedule) {
      return {
        status: "installation_scheduled",
        label: "📅 Instalação Agendada",
        color: "bg-green-500",
        description: "Aguardando instalação",
        progress: 100
      };
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

  // Determine the effective status for the timeline
  // If there's an installation schedule, the effective status should be "shipped" (completed the order flow)
  const getEffectiveTimelineStatus = () => {
    if (hasInstallationSchedule) {
      return "shipped";
    }
    return kitData.status;
  };

  const getDaysInStatus = () => {
    // Priority 1: Use statusHistory if available
    if (statusHistory && statusHistory.length > 0) {
      // Get the most recent status change
      const mostRecentChange = statusHistory[statusHistory.length - 1]; // Last entry (most recent, array is asc)
      const statusChangeDate = new Date(mostRecentChange.changed_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - statusChangeDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        days: diffDays,
        entryDate: statusChangeDate.toLocaleDateString('pt-BR')
      };
    }
    
    // Priority 2: Use kit created_at for homologation
    if (statusInfo.status === "homologation" && kitData.kit?.created_at) {
      const referenceDate = new Date(kitData.kit.created_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - referenceDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        days: diffDays,
        entryDate: referenceDate.toLocaleDateString('pt-BR')
      };
    }
    
    // Priority 3: Fallback to scheduled_date
    if (kitData.scheduled_date) {
      const referenceDate = new Date(kitData.scheduled_date);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - referenceDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        days: diffDays,
        entryDate: referenceDate.toLocaleDateString('pt-BR')
      };
    }
    
    return { days: 0, entryDate: null };
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
              {(kitData as any).configuration && (
                <p className="text-xs text-muted-foreground">
                  Configuração: <span className="font-medium">{(kitData as any).configuration}</span>
                </p>
              )}
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
          {/* 1. Progresso de instalação */}
          <KitStatusTimeline status={getEffectiveTimelineStatus()} kitData={kitData} statusHistory={statusHistory} />

          {/* 2. Histórico completo do processo */}
          <ProcessHistoryModal 
            scheduleId={kitData.id} 
            incomingVehicleId={kitData.incoming_vehicle_id}
          />

          {/* 3. Veículo */}
          {(kitData.vehicle_brand || kitData.vehicle_model) && (
            <div className="p-4 bg-gray-50 border rounded-lg">
              <h5 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                🚗 Veículo
              </h5>
              <div className="text-sm space-y-1">
                <p><strong>Marca/Modelo:</strong> {kitData.vehicle_brand} {kitData.vehicle_model}</p>
                {kitData.vehicle_plate && <p><strong>Placa:</strong> {kitData.vehicle_plate}</p>}
                {kitData.vehicle_year && <p><strong>Ano:</strong> {kitData.vehicle_year}</p>}
              </div>
            </div>
          )}

          {/* 4. Técnico */}
          {kitData.technician_name && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-500" />
              <span><strong>Técnico:</strong> {kitData.technician_name}</span>
            </div>
          )}

          {/* 5. Agendamento */}
          {kitData.scheduled_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span><strong>Agendamento:</strong> {formatDateTime(kitData.scheduled_date, kitData.installation_time)}</span>
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