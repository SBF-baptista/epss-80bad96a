import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, getWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScheduleFormModal } from './ScheduleFormModal';
import { ScheduleEditModal, ScheduleEditFormData } from './ScheduleEditModal';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const timeSlots = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

interface ScheduleEntry {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  technician_name: string;
  technician_whatsapp: string;
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleEntry | null>(null);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const today = new Date();

  const fetchSchedules = async () => {
    const { data, error } = await supabase
      .from('installation_schedules')
      .select('*');
    
    if (error) {
      console.error('Error fetching schedules:', error);
      return;
    }

    if (data) {
      setSchedules(data as ScheduleEntry[]);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleScheduleClick = (schedule: ScheduleEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSchedule(schedule);
    setIsEditModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    const scheduleData = {
      scheduled_date: format(data.date, 'yyyy-MM-dd'),
      scheduled_time: data.time,
      technician_name: data.technician_name,
      technician_whatsapp: data.technician_whatsapp,
      customer: data.customer,
      address: data.address,
      plate: data.plate,
      service: data.service,
      vehicle_model: data.vehicle_model,
      tracker_model: data.tracker_model,
      scheduled_by: data.scheduled_by,
      reference_point: data.reference_point || null,
      phone: data.phone || null,
      local_contact: data.local_contact || null,
      observation: data.observation || null,
    };

    const { error } = await supabase
      .from('installation_schedules')
      .insert(scheduleData)
      .select()
      .single();

    if (error) {
      console.error('Error creating schedule:', error);
      toast.error('Erro ao criar agendamento');
      return;
    }

    await fetchSchedules();
    toast.success('Agendamento criado com sucesso!');
  };

  const handleUpdateSchedule = async (id: string, data: ScheduleEditFormData) => {
    setIsLoading(true);
    
    const { error } = await supabase
      .from('installation_schedules')
      .update({
        technician_name: data.technician_name,
        technician_whatsapp: data.technician_whatsapp,
        scheduled_time: data.scheduled_time,
        scheduled_by: data.scheduled_by,
        service: data.service,
        plate: data.plate,
        vehicle_model: data.vehicle_model,
        tracker_model: data.tracker_model,
        customer: data.customer,
        address: data.address,
        reference_point: data.reference_point || null,
        phone: data.phone || null,
        local_contact: data.local_contact || null,
        observation: data.observation || null,
      })
      .eq('id', id);

    setIsLoading(false);

    if (error) {
      console.error('Error updating schedule:', error);
      toast.error('Erro ao atualizar agendamento');
      return;
    }

    await fetchSchedules();
    toast.success('Agendamento atualizado com sucesso!');
  };

  const handleDeleteSchedule = async (id: string) => {
    setIsLoading(true);
    
    const { error } = await supabase
      .from('installation_schedules')
      .delete()
      .eq('id', id);

    setIsLoading(false);

    if (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Erro ao excluir agendamento');
      return;
    }

    await fetchSchedules();
    toast.success('Agendamento excluído com sucesso!');
  };

  const getSchedulesForDateAndTime = (date: Date, timeSlot: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const slotHour = parseInt(timeSlot.split(':')[0], 10);
    
    return schedules.filter(schedule => {
      const scheduleHour = parseInt(schedule.scheduled_time.split(':')[0], 10);
      return schedule.scheduled_date === dateStr && scheduleHour === slotHour;
    });
  };

  const isToday = (date: Date) => {
    const todayStr = format(today, 'yyyy-MM-dd');
    const dateStr = format(date, 'yyyy-MM-dd');
    return todayStr === dateStr;
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
            Clique em uma data para criar ou em um card para editar
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Header com navegação */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b bg-muted/30 gap-4">
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

            <div className="w-[140px] hidden sm:block" />
          </div>

          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] sm:grid-cols-[80px_repeat(7,1fr)] border-b">
            <div className="p-2 border-r bg-muted/20" />
            {weekDays.map((day, index) => {
              const isTodayDate = isToday(day);
              return (
                <div
                  key={index}
                  className={cn(
                    "p-2 sm:p-3 text-center border-r last:border-r-0 cursor-pointer hover:bg-accent/50 transition-colors",
                    isTodayDate && "bg-primary/10"
                  )}
                  onClick={() => handleDateSelect(day)}
                >
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {format(day, 'EEE', { locale: ptBR })}
                  </p>
                  <p className={cn(
                    "text-lg sm:text-2xl font-bold mt-1",
                    isTodayDate && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </p>
                  {isTodayDate && (
                    <div className="w-2 h-2 rounded-full bg-primary mx-auto mt-1" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Grade de horários */}
          <div className="max-h-[600px] overflow-y-auto">
            {timeSlots.map((time, timeIndex) => (
              <div key={time} className="grid grid-cols-[60px_repeat(7,1fr)] sm:grid-cols-[80px_repeat(7,1fr)] border-b last:border-b-0">
                <div 
                  className="p-2 text-xs text-muted-foreground text-right pr-2 sm:pr-3 border-r bg-muted/20 flex items-center justify-end"
                  style={{ minHeight: '110px' }}
                >
                  {time}
                </div>
                {weekDays.map((day, dayIndex) => {
                  const isTodayDate = isToday(day);
                  const daySchedules = getSchedulesForDateAndTime(day, time);
                  return (
                    <div
                      key={`${timeIndex}-${dayIndex}`}
                      className={cn(
                        "border-r last:border-r-0 cursor-pointer hover:bg-accent/30 transition-colors p-1 overflow-y-auto",
                        isTodayDate && "bg-primary/5"
                      )}
                      style={{ minHeight: '110px' }}
                      onClick={() => handleDateSelect(day)}
                    >
                      {daySchedules.map(schedule => (
                        <div
                          key={schedule.id}
                          className="bg-primary/90 text-primary-foreground rounded-md p-2 text-[10px] sm:text-xs space-y-0.5 mb-1 cursor-pointer hover:bg-primary transition-colors"
                          onClick={(e) => handleScheduleClick(schedule, e)}
                        >
                          <div className="font-semibold truncate">
                            Técnico: {schedule.technician_name}
                          </div>
                          <div className="truncate">
                            Horário: {schedule.scheduled_time}
                          </div>
                          <div className="truncate">
                            Cliente: {schedule.customer}
                          </div>
                          <div className="truncate">
                            Placa: {schedule.plate}
                          </div>
                          <div className="truncate">
                            Endereço: {schedule.address}
                          </div>
                          <div className="truncate">
                            WhatsApp: {schedule.technician_whatsapp}
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

      <ScheduleEditModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        schedule={selectedSchedule}
        onUpdate={handleUpdateSchedule}
        onDelete={handleDeleteSchedule}
        isLoading={isLoading}
      />
    </div>
  );
};
