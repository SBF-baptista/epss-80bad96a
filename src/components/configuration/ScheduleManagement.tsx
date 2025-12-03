import { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks, getWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScheduleFormModal } from './ScheduleFormModal';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, MapPin, User, Car } from 'lucide-react';
import { cn } from '@/lib/utils';

const timeSlots = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

interface ScheduleEntry {
  id: string;
  date: Date;
  time: string;
  technician_name: string;
  customer: string;
  address: string;
  plate: string;
  service: string;
  vehicle_model: string;
  tracker_model: string;
  scheduled_by: string;
  reference_point: string;
  phone: string;
  local_contact: string;
  observation: string;
}

export const ScheduleManagement = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const today = new Date();

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (data: any) => {
    const newSchedule: ScheduleEntry = {
      id: crypto.randomUUID(),
      date: data.date,
      time: data.time,
      technician_name: data.technician_name,
      customer: data.customer,
      address: data.address,
      plate: data.plate,
      service: data.service,
      vehicle_model: data.vehicle_model,
      tracker_model: data.tracker_model,
      scheduled_by: data.scheduled_by,
      reference_point: data.reference_point,
      phone: data.phone,
      local_contact: data.local_contact,
      observation: data.observation,
    };
    setSchedules(prev => [...prev, newSchedule]);
    console.log('Agendamento criado:', newSchedule);
    toast.success('Agendamento criado com sucesso!');
  };

  const getSchedulesForDateAndTime = (date: Date, timeSlot: string) => {
    return schedules.filter(schedule => {
      const scheduleHour = schedule.time.split(':')[0];
      const slotHour = timeSlot.split(':')[0];
      return isSameDay(schedule.date, date) && scheduleHour === slotHour;
    });
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agendamento</h2>
          <p className="text-muted-foreground">
            Clique em uma data para criar um novo agendamento
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Header com navegação */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoje
              </Button>
            </div>
            
            <div className="text-center">
              <h3 className="text-xl font-semibold">
                {format(currentWeekStart, "MMMM yyyy", { locale: ptBR })}
              </h3>
              <p className="text-sm text-muted-foreground">
                Semana {getWeek(currentWeekStart, { weekStartsOn: 1 })}
              </p>
            </div>

            <div className="w-[140px]" /> {/* Spacer para centralizar */}
          </div>

          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b">
            <div className="p-2 border-r bg-muted/20" />
            {weekDays.map((day, index) => {
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={index}
                  className={cn(
                    "p-3 text-center border-r last:border-r-0 cursor-pointer hover:bg-accent/50 transition-colors",
                    isToday && "bg-primary/10"
                  )}
                  onClick={() => handleDateSelect(day)}
                >
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {format(day, 'EEE', { locale: ptBR })}
                  </p>
                  <p className={cn(
                    "text-2xl font-bold mt-1",
                    isToday && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </p>
                  {isToday && (
                    <div className="w-2 h-2 rounded-full bg-primary mx-auto mt-1" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Grade de horários */}
          <div className="max-h-[500px] overflow-y-auto">
            {timeSlots.map((time, timeIndex) => (
              <div key={time} className="grid grid-cols-[80px_repeat(7,1fr)] border-b last:border-b-0">
                <div className="p-2 text-xs text-muted-foreground text-right pr-3 border-r bg-muted/20 flex items-center justify-end">
                  {time}
                </div>
                {weekDays.map((day, dayIndex) => {
                  const isToday = isSameDay(day, today);
                  const daySchedules = getSchedulesForDateAndTime(day, time);
                  return (
                    <div
                      key={`${timeIndex}-${dayIndex}`}
                      className={cn(
                        "min-h-[60px] border-r last:border-r-0 cursor-pointer hover:bg-accent/30 transition-colors p-1",
                        isToday && "bg-primary/5"
                      )}
                      onClick={() => handleDateSelect(day)}
                    >
                      {daySchedules.map(schedule => (
                        <div
                          key={schedule.id}
                          className="bg-primary/90 text-primary-foreground rounded-md p-2 text-xs space-y-1 mb-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1 font-semibold">
                            <User className="h-3 w-3" />
                            <span className="truncate">{schedule.technician_name}</span>
                          </div>
                          <div className="text-[10px] opacity-90">
                            {schedule.time} - {schedule.customer}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] opacity-90">
                            <Car className="h-3 w-3" />
                            <span className="truncate">{schedule.plate}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] opacity-90">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{schedule.address}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ScheduleFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedDate={selectedDate}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
};
