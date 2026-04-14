import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car } from "lucide-react";
import { KitStatusTimeline } from "./KitStatusTimeline";
import { supabase } from "@/integrations/supabase/client";
import type { KickoffVehicleInfo } from "@/pages/CustomerTracking";

interface KickoffVehicleSectionProps {
  vehicle: KickoffVehicleInfo;
}

export const KickoffVehicleSection = ({ vehicle }: KickoffVehicleSectionProps) => {
  const [homologationStatus, setHomologationStatus] = useState<string | null>(null);
  const [homologationDate, setHomologationDate] = useState<string | null>(null);

  useEffect(() => {
    const loadHomologation = async () => {
      // Check if there's a homologation card for this vehicle
      const { data } = await supabase
        .from('homologation_cards')
        .select('status, updated_at')
        .eq('incoming_vehicle_id', vehicle.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setHomologationStatus(data[0].status);
        setHomologationDate(data[0].updated_at);
      }
    };

    loadHomologation();
  }, [vehicle.id]);

  return (
    <Card className="border border-border/40 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 bg-card">
      <CardHeader className="pb-3 p-4">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Car className="h-3.5 w-3.5 text-primary" />
              </div>
              <CardTitle className="text-sm sm:text-base font-semibold text-foreground truncate">
                {vehicle.brand} {vehicle.model}
              </CardTitle>
              {vehicle.year && (
                <span className="text-xs text-muted-foreground">({vehicle.year})</span>
              )}
              {vehicle.plate && (
                <Badge variant="outline" className="text-xs font-medium bg-muted/50">
                  {vehicle.plate}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 pl-9 flex-wrap">
              <Badge 
                variant="outline" 
                className="text-xs font-medium px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
                Aguardando Kickoff
              </Badge>
              {vehicle.received_at && (
                <span className="text-xs text-muted-foreground/60">
                  Recebido em {new Date(vehicle.received_at).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-4 pb-4 pt-0">
        {/* Timeline de progresso - kickoff pendente */}
        <KitStatusTimeline 
          kickoffCompleted={false}
          kickoffDate={vehicle.received_at}
          homologationStatus={homologationStatus}
          homologationDate={homologationDate}
          kickoffVehicleDetails={{
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            plate: vehicle.plate,
            receivedAt: vehicle.received_at,
          }}
        />
      </CardContent>
    </Card>
  );
};
