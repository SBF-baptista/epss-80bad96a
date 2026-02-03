import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Car, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import type { KickoffSummary } from "@/services/kickoffService";

interface KickoffStatsProps {
  kickoffData: KickoffSummary | undefined;
  kickoffDates: Map<number, Date> | undefined;
}

export const KickoffStats = ({ kickoffData, kickoffDates }: KickoffStatsProps) => {
  const getDaysInKickoff = (saleSummaryId: number): number => {
    if (!kickoffDates) return 0;
    const startDate = kickoffDates.get(saleSummaryId);
    if (!startDate) return 0;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Calculate stats
  const totalClients = kickoffData?.clients.length || 0;
  const totalVehicles = kickoffData?.total_vehicles || 0;

  const criticalClients =
    kickoffData?.clients.filter((client) => getDaysInKickoff(client.sale_summary_id) > 10).length || 0;

  const warningClients =
    kickoffData?.clients.filter((client) => {
      const days = getDaysInKickoff(client.sale_summary_id);
      return days > 5 && days <= 10;
    }).length || 0;

  const withBlockingClients = kickoffData?.clients.filter((client) => client.needs_blocking).length || 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      <Card className="min-h-[90px]">
        <CardHeader className="pb-1 p-3">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="truncate">Clientes Pendentes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          <div className="text-2xl font-bold text-primary">{totalClients}</div>
        </CardContent>
      </Card>

      <Card className="min-h-[90px]">
        <CardHeader className="pb-1 p-3">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <Car className="w-4 h-4" />
            <span className="truncate">Total Veículos</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          <div className="text-2xl font-bold text-primary">{totalVehicles}</div>
        </CardContent>
      </Card>

      <Card className="min-h-[90px]">
        <CardHeader className="pb-1 p-3">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="truncate">Atenção (5-10 dias)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          <div className="text-2xl font-bold text-orange-500">{warningClients}</div>
        </CardContent>
      </Card>

      <Card className="min-h-[90px]">
        <CardHeader className="pb-1 p-3">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="truncate">Críticos (+10 dias)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          <div className="text-2xl font-bold text-destructive">{criticalClients}</div>
        </CardContent>
      </Card>
    </div>
  );
};
