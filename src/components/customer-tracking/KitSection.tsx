import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car } from "lucide-react";
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
  created_at: string | null;
  received_at: string | null;
}

interface HomologationData {
  status: string | null;
  updated_at: string | null;
}

interface InstallationScheduleData {
  id: string;
  scheduled_date: string;
  created_at: string;
}

export const KitSection = ({ kitData, onUpdate }: KitSectionProps) => {
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [installationSchedule, setInstallationSchedule] = useState<InstallationScheduleData | null>(null);
  const [incomingVehicleData, setIncomingVehicleData] = useState<IncomingVehicleData | null>(null);
  const [homologationData, setHomologationData] = useState<HomologationData | null>(null);
  const [tomticketProtocol, setTomticketProtocol] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!kitData.id) return;

      // Check if there's an installation schedule - include created_at for timeline
      const { data: installationData, error: installationError } = await supabase
        .from('installation_schedules')
        .select('id, scheduled_date, created_at')
        .eq('kit_schedule_id', kitData.id)
        .limit(1);

      if (!installationError && installationData && installationData.length > 0) {
        setInstallationSchedule(installationData[0]);
      }

      // Fetch incoming_vehicle data for kickoff and homologation status
      if (kitData.incoming_vehicle_id) {
        const { data: vehicleData } = await supabase
          .from('incoming_vehicles')
          .select('kickoff_completed, homologation_status, created_at, received_at, created_homologation_id')
          .eq('id', kitData.incoming_vehicle_id)
          .single();

        if (vehicleData) {
          setIncomingVehicleData({
            kickoff_completed: vehicleData.kickoff_completed ?? null,
            homologation_status: vehicleData.homologation_status ?? null,
            created_at: vehicleData.created_at ?? null,
            received_at: vehicleData.received_at ?? null
          });

          // Fetch homologation card data for date
          if (vehicleData.created_homologation_id) {
            const { data: homologData } = await supabase
              .from('homologation_cards')
              .select('status, updated_at')
              .eq('id', vehicleData.created_homologation_id)
              .single();

            if (homologData) {
              setHomologationData({
                status: homologData.status,
                updated_at: homologData.updated_at
              });
            }
          }
        }
      }

      // Fetch TomTicket protocol if vehicle has a plate
      if (kitData.vehicle_plate) {
        try {
          const { data: tomticketData, error: tomticketError } = await supabase.functions.invoke('search-tomticket', {
            body: { searchTerm: kitData.vehicle_plate, maxPages: 20 }
          });

          if (!tomticketError && tomticketData?.found && tomticketData?.protocols?.length > 0) {
            setTomticketProtocol(tomticketData.protocols[0]);
          }
        } catch (error) {
          console.error('Error fetching TomTicket protocol:', error);
        }
      }
    };

    loadData();
  }, [kitData.id, kitData.incoming_vehicle_id, kitData.vehicle_plate]);

  const getStatusInfo = () => {
    // If there's an installation schedule, the vehicle has already been shipped
    if (installationSchedule) {
      return {
        label: "Instalação Agendada",
        color: "bg-green-100 text-green-700 border-green-200",
        dotColor: "bg-green-500",
      };
    }

    switch (kitData.status) {
      case "scheduled":
        return {
          label: "Pedidos",
          color: "bg-blue-50 text-blue-700 border-blue-200",
          dotColor: "bg-blue-500",
        };
      case "in_progress":
        return {
          label: "Em Produção",
          color: "bg-amber-50 text-amber-700 border-amber-200",
          dotColor: "bg-amber-500",
        };
      case "completed":
        return {
          label: "Aguardando Envio",
          color: "bg-orange-50 text-orange-700 border-orange-200",
          dotColor: "bg-orange-500",
        };
      case "shipped":
        return {
          label: "Enviado",
          color: "bg-green-50 text-green-700 border-green-200",
          dotColor: "bg-green-500",
        };
      default:
        return {
          label: "Pendente",
          color: "bg-red-50 text-red-700 border-red-200",
          dotColor: "bg-red-500",
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
      <Card className="border border-border/40 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 bg-card">
        <CardHeader className="pb-3 p-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Car className="h-3.5 w-3.5 text-primary" />
                </div>
                <CardTitle className="text-sm sm:text-base font-semibold text-foreground truncate">
                  {kitData.vehicle_brand && kitData.vehicle_model 
                    ? `${kitData.vehicle_brand} ${kitData.vehicle_model}`
                    : kitData.kit?.name || 'Veículo'}
                </CardTitle>
                {(tomticketProtocol || kitData.tomticket_protocol) && (
                  <span className="text-xs font-normal text-muted-foreground/70 hidden sm:inline">
                    TT: {tomticketProtocol || kitData.tomticket_protocol}
                  </span>
                )}
              </div>
              
              {(kitData as any).configuration && (
                <p className="text-xs text-muted-foreground pl-9">
                  Configuração: <span className="font-medium text-foreground/70">{(kitData as any).configuration}</span>
                </p>
              )}
              
              <div className="flex items-center gap-2 pl-9 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={`text-xs font-medium px-2 py-0.5 ${statusInfo.color}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor} mr-1.5`} />
                  {statusInfo.label}
                </Badge>
                {entryDate && (
                  <span className="text-xs text-muted-foreground/60">
                    Entrou em {entryDate}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-4 pb-4 pt-0">
          {/* Timeline de progresso */}
          <KitStatusTimeline 
            kickoffCompleted={incomingVehicleData?.kickoff_completed ?? false}
            kickoffDate={incomingVehicleData?.received_at || incomingVehicleData?.created_at}
            homologationStatus={homologationData?.status || incomingVehicleData?.homologation_status}
            homologationDate={homologationData?.updated_at}
            planningStatus={kitData.status}
            planningDate={kitData.created_at}
            logisticsStatus={kitData.status}
            logisticsDate={kitData.updated_at}
            trackingCode={kitData.tracking_code}
            hasInstallationSchedule={!!installationSchedule}
            scheduleDate={installationSchedule?.created_at}
            installationCompleted={false}
            installationDate={null}
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
