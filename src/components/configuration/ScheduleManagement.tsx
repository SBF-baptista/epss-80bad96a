import { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, getWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScheduleFormModal, PendingVehicleData } from './ScheduleFormModal';
import { ScheduleEditModal, ScheduleEditFormData } from './ScheduleEditModal';
import { PendingVehiclesSection } from './PendingVehiclesSection';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, MapPin, Clock, GripVertical, User, Wrench, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getTechnicians, Technician } from '@/services/technicianService';

// Send WhatsApp notification to technician using Twilio template - returns success/failure info
const sendTechnicianWhatsApp = async (
  technicianId: string,
  scheduleData: {
    date: string;
    time: string;
    customer: string;
    address: string;
    local_contact: string;
    phone?: string;
  }
): Promise<{ success: boolean; technicianName?: string; error?: string }> => {
  try {
    console.log('[WhatsApp Template] Starting notification for technician:', technicianId);
    
    const { data: technician, error: techError } = await supabase
      .from('technicians')
      .select('name, phone')
      .eq('id', technicianId)
      .single();

    if (techError || !technician) {
      console.error('[WhatsApp Template] Error fetching technician:', techError);
      return { success: false, error: 'Técnico não encontrado' };
    }

    console.log('[WhatsApp Template] Technician found:', technician.name, 'Phone:', technician.phone);

    if (!technician.phone) {
      console.log('[WhatsApp Template] No phone number, skipping');
      return { success: false, error: 'Técnico sem telefone cadastrado' };
    }

    const formattedDate = format(new Date(scheduleData.date + 'T12:00:00'), "dd/MM/yyyy (EEEE)", { locale: ptBR });

    console.log('[WhatsApp Template] Sending template to:', technician.phone);

    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        orderId: 'schedule-notification',
        orderNumber: `Agendamento - ${scheduleData.customer}`,
        recipientPhone: technician.phone,
        recipientName: technician.name,
        templateType: 'technician_schedule',
        templateVariables: {
          technicianName: technician.name,
          scheduledDate: formattedDate,
          scheduledTime: scheduleData.time,
          customerName: scheduleData.customer,
          address: scheduleData.address,
          contactPhone: scheduleData.phone || scheduleData.local_contact || 'Não informado'
        }
      }
    });

    if (error) {
      console.error('[WhatsApp Template] Error sending:', error);
      return { success: false, technicianName: technician.name, error: error.message || 'Erro ao enviar' };
    }
    
    console.log('[WhatsApp Template] Response:', data);
    return { success: true, technicianName: technician.name };
  } catch (error) {
    console.error('[WhatsApp Template] Exception:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
};

const timeSlots = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
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
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleEntry | null>(null);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [draggedSchedule, setDraggedSchedule] = useState<ScheduleEntry | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicianFilter, setSelectedTechnicianFilter] = useState<string>('all');
  const [pendingVehicleData, setPendingVehicleData] = useState<PendingVehicleData | null>(null);

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

  const fetchTechnicians = async () => {
    try {
      const data = await getTechnicians();
      setTechnicians(data);
    } catch (error) {
      console.error('Error fetching technicians:', error);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchTechnicians();

    // Check for pending vehicle data from Planning page
    const pendingData = sessionStorage.getItem('pendingScheduleVehicle');
    if (pendingData) {
      try {
        const vehicleData = JSON.parse(pendingData) as PendingVehicleData;
        setPendingVehicleData(vehicleData);
        // Clear the sessionStorage
        sessionStorage.removeItem('pendingScheduleVehicle');
        // Open modal with vehicle data
        setSelectedDate(new Date());
        setIsModalOpen(true);
      } catch (error) {
        console.error('Error parsing pending vehicle data:', error);
      }
    }
  }, []);

  // Filter schedules by selected technician
  const filteredSchedules = useMemo(() => {
    if (selectedTechnicianFilter === 'all') return schedules;
    return schedules.filter(s => s.technician_name === selectedTechnicianFilter);
  }, [schedules, selectedTechnicianFilter]);

  const handleDateSelect = (date: Date, time?: string) => {
    setSelectedDate(date);
    setSelectedTime(time || null);
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

    // Send WhatsApp notification to technician with feedback
    if (data.technician_id) {
      toast.loading('Enviando notificação WhatsApp...', { id: 'whatsapp-notification' });
      
      const result = await sendTechnicianWhatsApp(data.technician_id, {
        date: scheduleData.scheduled_date,
        time: scheduleData.scheduled_time,
        customer: scheduleData.customer,
        address: scheduleData.address,
        local_contact: scheduleData.local_contact || '',
        phone: scheduleData.phone || ''
      });

      if (result.success) {
        toast.success(`WhatsApp enviado para ${result.technicianName}!`, { id: 'whatsapp-notification' });
      } else {
        toast.error(`Erro no WhatsApp: ${result.error}`, { id: 'whatsapp-notification' });
      }
    }
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
    const [slotHour, slotMinute] = timeSlot.split(':').map(Number);
    
    return filteredSchedules.filter(schedule => {
      const [scheduleHour, scheduleMinute] = schedule.scheduled_time.split(':').map(Number);
      // Match if schedule falls within this 30-minute slot
      if (schedule.scheduled_date !== dateStr) return false;
      if (scheduleHour !== slotHour) return false;
      // Check if minute is in the same 30-min block
      const slotBlock = slotMinute < 30 ? 0 : 30;
      const scheduleBlock = scheduleMinute < 30 ? 0 : 30;
      return slotBlock === scheduleBlock;
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

  const handleDragStart = (e: React.DragEvent, schedule: ScheduleEntry) => {
    setDraggedSchedule(schedule);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', schedule.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date, targetTime: string) => {
    e.preventDefault();
    if (!draggedSchedule) return;

    const newDate = format(targetDate, 'yyyy-MM-dd');
    const newTime = targetTime;

    if (draggedSchedule.scheduled_date === newDate && draggedSchedule.scheduled_time.startsWith(targetTime.split(':')[0])) {
      setDraggedSchedule(null);
      return;
    }

    const { error } = await supabase
      .from('installation_schedules')
      .update({
        scheduled_date: newDate,
        scheduled_time: newTime,
      })
      .eq('id', draggedSchedule.id);

    if (error) {
      console.error('Error moving schedule:', error);
      toast.error('Erro ao mover agendamento');
    } else {
      await fetchSchedules();
      toast.success('Agendamento movido com sucesso!');
    }

    setDraggedSchedule(null);
  };

  const handleDragEnd = () => {
    setDraggedSchedule(null);
  };

  // Get technicians with activities today
  const techniciansWithActivitiesToday = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todaySchedules = schedules.filter(s => s.scheduled_date === todayStr);
    const uniqueTechnicians = [...new Set(todaySchedules.map(s => s.technician_name))];
    return uniqueTechnicians;
  }, [schedules]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">Agendamento</h2>
            <p className="text-muted-foreground">
              Clique em uma data para criar ou em um card para editar
            </p>
          </div>
          
          {/* Filtro de técnico */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedTechnicianFilter} onValueChange={setSelectedTechnicianFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por técnico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os técnicos</SelectItem>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.name}>
                    {tech.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Technicians with activities today */}
        {techniciansWithActivitiesToday.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap p-3 bg-primary/10 rounded-lg border border-primary/20">
            <User className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Técnicos com atividades hoje:</span>
            {techniciansWithActivitiesToday.map((name) => (
              <Badge key={name} variant="secondary" className="bg-primary/20 text-primary border-0">
                {name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Pending Vehicles Section */}
      <PendingVehiclesSection 
        onScheduleVehicle={(vehicleData) => {
          setPendingVehicleData(vehicleData);
          setSelectedDate(new Date());
          setIsModalOpen(true);
        }}
      />

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
                        isTodayDate && "bg-primary/5",
                        draggedSchedule && "bg-accent/20"
                      )}
                      style={{ minHeight: '110px' }}
                      onClick={() => handleDateSelect(day, time)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day, time)}
                    >
                      {daySchedules.map(schedule => (
                        <div
                          key={schedule.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, schedule)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "bg-primary/90 text-primary-foreground rounded-lg p-2 text-[10px] sm:text-xs mb-1 cursor-grab active:cursor-grabbing hover:bg-primary transition-all shadow-sm hover:shadow-md",
                            draggedSchedule?.id === schedule.id && "opacity-50"
                          )}
                          onClick={(e) => handleScheduleClick(schedule, e)}
                        >
                          {/* Drag handle and technician name as title */}
                          <div className="flex items-center gap-1 mb-1.5">
                            <GripVertical className="h-3 w-3 opacity-50 flex-shrink-0" />
                            <span className="font-bold text-sm sm:text-base truncate">
                              Técnico: {schedule.technician_name}
                            </span>
                          </div>
                          
                          {/* Schedule details with labels */}
                          <div className="space-y-0.5 pl-4">
                            <div className="flex items-center gap-1 truncate">
                              <Clock className="h-3 w-3 flex-shrink-0 opacity-70" />
                              <span className="opacity-70">Horário:</span>
                              <span>{schedule.scheduled_time}</span>
                            </div>
                            <div className="flex items-center gap-1 truncate">
                              <User className="h-3 w-3 flex-shrink-0 opacity-70" />
                              <span className="opacity-70">Cliente:</span>{' '}
                              <span className="font-medium">{schedule.customer}</span>
                            </div>
                            <div className="flex items-center gap-1 truncate">
                              <Wrench className="h-3 w-3 flex-shrink-0 opacity-70" />
                              <span className="opacity-70">Serviço:</span>{' '}
                              <span className="font-medium">{schedule.service}</span>
                            </div>
                            <div className="flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 flex-shrink-0 opacity-70" />
                              <span className="opacity-70">Endereço:</span>
                              <span className="truncate">{schedule.address}</span>
                            </div>
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
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setPendingVehicleData(null);
          }
        }}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onSubmit={handleFormSubmit}
        initialVehicleData={pendingVehicleData}
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
