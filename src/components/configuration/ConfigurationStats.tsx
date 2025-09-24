import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, Calendar, AlertTriangle } from 'lucide-react';
import type { Technician } from '@/services/technicianService';
import type { HomologationKit } from '@/services/homologationKitService';
import type { KitScheduleWithDetails } from '@/services/kitScheduleService';

interface ConfigurationStatsProps {
  technicians: Technician[];
  kits: HomologationKit[];
  schedules: KitScheduleWithDetails[];
  kitsWithoutHomologation: HomologationKit[];
}

export const ConfigurationStats = ({ 
  technicians, 
  kits, 
  schedules, 
  kitsWithoutHomologation 
}: ConfigurationStatsProps) => {
  const todaySchedules = schedules.filter(schedule => {
    const today = new Date().toISOString().split('T')[0];
    return schedule.scheduled_date === today;
  });

  const completedSchedules = schedules.filter(schedule => schedule.status === 'completed');

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
      <Card className="min-h-[80px] sm:min-h-[100px]">
        <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-4">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="truncate">Técnicos</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">{technicians.length}</div>
        </CardContent>
      </Card>

      <Card className="min-h-[80px] sm:min-h-[100px]">
        <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-4">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span className="truncate">Kits</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-secondary">{kits.length}</div>
        </CardContent>
      </Card>

      <Card className="min-h-[80px] sm:min-h-[100px]">
        <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-4">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="truncate">Hoje</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-accent">{todaySchedules.length}</div>
        </CardContent>
      </Card>

      <Card className="min-h-[80px] sm:min-h-[100px]">
        <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-4">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="truncate">Alertas</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-destructive">
            {kitsWithoutHomologation.length}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};