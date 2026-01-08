import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { KitStatusTimeline } from "./KitStatusTimeline";
import { RescheduleModal } from "./RescheduleModal";
import { ProcessHistoryModal } from "./ProcessHistoryModal";
import { supabase } from "@/integrations/supabase/client";

import { CustomerKitData } from "@/pages/CustomerTracking";

interface KitSectionProps {
  kitData: CustomerKitData;
  onUpdate: () => void;
}

interface IncomingVehicleData {
  kickoff_completed: boolean | null;
  homologation_status: string | null;
}

export const KitSection = ({ kitData, onUpdate }: KitSectionProps) => {
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [hasInstallationSchedule, setHasInstallationSchedule] = useState(false);
  const [incomingVehicleData, setIncomingVehicleData] = useState<IncomingVehicleData | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!kitData.id) return;

      // Check if there's an installation schedule
      const { data: installationData, error: installationError } = await supabase
        .from('installation_schedules')
        .select('id')
        .eq('kit_schedule_id', kitData.id)
        .limit(1);

      if (!installationError && installationData && installationData.length > 0) {
        setHasInstallationSchedule(true);
      }

      // Fetch incoming_vehicle data for kickoff and homologation status
      if (kitData.incoming_vehicle_id) {
        const { data: vehicleData } = await supabase
          .from('incoming_vehicles')
          .select('kickoff_completed, homologation_status')
          .eq('id', kitData.incoming_vehicle_id)
          .single();

        if (vehicleData) {
          setIncomingVehicleData(vehicleData);
        }
      }
    };

    loadData();
  }, [kitData.id, kitData.incoming_vehicle_id]);

  const getStatusInfo = () => {
    // If there's an installation schedule, the vehicle has already been shipped
    if (hasInstallationSchedule) {
      return {
        label: "📅 Instalação Agendada",
        color: "bg-green-500",
      };
    }

    switch (kitData.status) {
      case "scheduled":
        return {
          label: "📋 Pedidos",
          color: "bg-blue-500",
        };
      case "in_progress":
        return {
          label: "🔧 Em Produção",
          color: "bg-yellow-500",
        };
      case "completed":
        return {
          label: "📦 Aguardando Envio",
          color: "bg-orange-500",
        };
      case "shipped":
        return {
          label: "✅ Enviado",
          color: "bg-green-500",
        };
      default:
        return {
          label: "🔴 Pendente",
          color: "bg-red-500",
        };
    }
  };

  const statusInfo = getStatusInfo();

  const getEntryDate = () => {
    if (kitData.scheduled_date) {
      const referenceDate = new Date(kitData.scheduled_date);
      return referenceDate.toLocaleDateString('pt-BR');
    }
    return null;
  };

  const entryDate = getEntryDate();

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
                {entryDate && (
                  <div className="text-xs text-muted-foreground">
                    Entrou em {entryDate}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Timeline de progresso */}
          <KitStatusTimeline 
            kickoffCompleted={incomingVehicleData?.kickoff_completed ?? false}
            homologationStatus={incomingVehicleData?.homologation_status}
            planningStatus={kitData.status}
            logisticsStatus={kitData.status}
            hasInstallationSchedule={hasInstallationSchedule}
            installationCompleted={false}
          />

          {/* Histórico completo do processo */}
          <ProcessHistoryModal 
            scheduleId={kitData.id} 
            incomingVehicleId={kitData.incoming_vehicle_id}
          />
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
