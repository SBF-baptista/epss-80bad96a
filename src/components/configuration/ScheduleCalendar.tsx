import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar, User, Package, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Technician } from '@/services/technicianService';
import type { HomologationKit } from '@/services/homologationKitService';
import type { KitScheduleWithDetails } from '@/services/kitScheduleService';

interface ScheduleCalendarProps {
  schedules: KitScheduleWithDetails[];
  technicians: Technician[];
  kits: HomologationKit[];
  onRefresh: () => void;
}

export const ScheduleCalendar = ({ 
  schedules, 
  technicians, 
  kits, 
  onRefresh 
}: ScheduleCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [selectedKit, setSelectedKit] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Filter schedules based on selected filters
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      if (selectedTechnician !== 'all' && schedule.technician_id !== selectedTechnician) {
        return false;
      }
      if (selectedKit !== 'all' && schedule.kit_id !== selectedKit) {
        return false;
      }
      return true;
    });
  }, [schedules, selectedTechnician, selectedKit]);

  // Get calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get schedules for a specific date
  const getSchedulesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredSchedules.filter(schedule => schedule.scheduled_date === dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'in_progress': return 'Em Progresso';
      case 'scheduled': return 'Agendado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Filters and Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Cronograma de Instalações
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('calendar')}
              >
                Calendário
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                Lista
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="min-w-[120px] text-center font-medium">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por técnico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os técnicos</SelectItem>
                  {technicians.map((technician) => (
                    <SelectItem key={technician.id} value={technician.id!}>
                      {technician.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedKit} onValueChange={setSelectedKit}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por kit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os kits</SelectItem>
                  {kits.map((kit) => (
                    <SelectItem key={kit.id} value={kit.id!}>
                      {kit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar or List View */}
      <Card className="flex-1">
        <CardContent className="p-0 h-full">
          {viewMode === 'calendar' ? (
            <div className="h-full p-4">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 h-full">
                {calendarDays.map((date) => {
                  const daySchedules = getSchedulesForDate(date);
                  const isToday = isSameDay(date, new Date());

                  return (
                    <div
                      key={date.toISOString()}
                      className={`border rounded-md p-1 min-h-[100px] ${
                        isSameMonth(date, currentDate) ? 'bg-background' : 'bg-muted/30'
                      } ${isToday ? 'border-primary bg-primary/5' : 'border-border'}`}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        isToday ? 'text-primary' : 'text-foreground'
                      }`}>
                        {format(date, 'd')}
                      </div>
                      
                      <div className="space-y-1">
                        {daySchedules.slice(0, 3).map((schedule) => (
                          <div
                            key={schedule.id}
                            className={`text-xs p-1 rounded border ${getStatusColor(schedule.status)}`}
                          >
                            <div className="truncate font-medium">{schedule.kit.name}</div>
                            <div className="truncate">{schedule.technician.name}</div>
                            {schedule.installation_time && (
                              <div className="truncate">{schedule.installation_time}</div>
                            )}
                          </div>
                        ))}
                        {daySchedules.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{daySchedules.length - 3} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto p-4">
              {filteredSchedules.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum agendamento encontrado
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSchedules.map((schedule) => (
                    <div key={schedule.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            <span className="font-medium">{schedule.kit.name}</span>
                            <Badge className={getStatusColor(schedule.status)}>
                              {getStatusLabel(schedule.status)}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {schedule.technician.name}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(schedule.scheduled_date).toLocaleDateString('pt-BR')}
                            </div>
                            {schedule.installation_time && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {schedule.installation_time}
                              </div>
                            )}
                          </div>

                          {schedule.notes && (
                            <p className="text-sm text-muted-foreground">{schedule.notes}</p>
                          )}

                          {schedule.homologation_card && (
                            <div className="text-xs text-muted-foreground">
                              Veículo: {schedule.homologation_card.brand} {schedule.homologation_card.model}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};