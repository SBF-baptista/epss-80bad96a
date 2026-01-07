import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, User, Loader2, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getTechnicians, Technician } from '@/services/technicianService';

interface TechnicianAgendaModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TechnicianScheduleCount {
  id: string;
  name: string;
  phone: string | null;
  scheduleCount: number;
}

export const TechnicianAgendaModal = ({ isOpen, onOpenChange }: TechnicianAgendaModalProps) => {
  const [technicians, setTechnicians] = useState<TechnicianScheduleCount[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());

  useEffect(() => {
    if (isOpen) {
      setStartDate(new Date());
      fetchTechniciansWithSchedules();
    }
  }, [isOpen]);

  // Refetch when date changes
  useEffect(() => {
    if (isOpen) {
      fetchTechniciansWithSchedules();
    }
  }, [startDate]);

  const fetchTechniciansWithSchedules = async () => {
    setIsLoading(true);
    try {
      const allTechnicians = await getTechnicians();
      const startDateStr = format(startDate, 'yyyy-MM-dd');

      // Get schedules from start date onwards
      const { data: futureSchedules } = await supabase
        .from('installation_schedules')
        .select('technician_name, scheduled_date')
        .gte('scheduled_date', startDateStr);

      // Map technicians with their schedule counts
      const techsWithCounts: TechnicianScheduleCount[] = allTechnicians.map(tech => ({
        id: tech.id,
        name: tech.name,
        phone: tech.phone,
        scheduleCount: futureSchedules?.filter(s => s.technician_name === tech.name).length || 0
      }));

      // Sort by those with schedules first
      techsWithCounts.sort((a, b) => b.scheduleCount - a.scheduleCount);

      setTechnicians(techsWithCounts);
      
      // Pre-select technicians that have schedules
      const techsWithSchedules = techsWithCounts.filter(t => t.scheduleCount > 0).map(t => t.id);
      setSelectedTechnicians(techsWithSchedules);
    } catch (error) {
      console.error('Error fetching technicians:', error);
      toast.error('Erro ao carregar técnicos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedTechnicians.length === technicians.length) {
      setSelectedTechnicians([]);
    } else {
      setSelectedTechnicians(technicians.map(t => t.id));
    }
  };

  const handleTechnicianToggle = (techId: string) => {
    setSelectedTechnicians(prev => 
      prev.includes(techId) 
        ? prev.filter(id => id !== techId)
        : [...prev, techId]
    );
  };

  const sendAgendaToTechnician = async (technician: TechnicianScheduleCount): Promise<{ success: boolean; error?: string }> => {
    if (!technician.phone) {
      return { success: false, error: 'Sem telefone cadastrado' };
    }

    const startDateStr = format(startDate, 'yyyy-MM-dd');

    // Get all schedules for this technician from start date onwards
    const { data: schedules, error } = await supabase
      .from('installation_schedules')
      .select('*')
      .gte('scheduled_date', startDateStr)
      .eq('technician_name', technician.name)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (error || !schedules?.length) {
      return { success: false, error: 'Sem agendamentos a partir desta data' };
    }

    // Group schedules by date
    const schedulesByDate: Record<string, typeof schedules> = {};
    schedules.forEach(schedule => {
      if (!schedulesByDate[schedule.scheduled_date]) {
        schedulesByDate[schedule.scheduled_date] = [];
      }
      schedulesByDate[schedule.scheduled_date].push(schedule);
    });

    // Format message with all dates
    const messageLines: string[] = [];
    
    Object.keys(schedulesByDate).sort().forEach(dateStr => {
      const daySchedules = schedulesByDate[dateStr];
      const formattedDate = format(parseISO(dateStr), "dd/MM/yyyy (EEEE)", { locale: ptBR });
      
      messageLines.push(`📅 *${formattedDate}*`);
      
      daySchedules.forEach((s, index) => {
        messageLines.push(`${index + 1}. ${s.scheduled_time} - ${s.customer}`);
        messageLines.push(`   📍 ${s.address}`);
        messageLines.push(`   🚗 ${s.vehicle_model}`);
        messageLines.push(`   📞 ${s.phone || s.local_contact || 'N/A'}`);
        if (s.observation) {
          messageLines.push(`   📝 ${s.observation}`);
        }
        messageLines.push('');
      });
    });

    const scheduleList = messageLines.join('\n');
    const totalDays = Object.keys(schedulesByDate).length;

    try {
      const { error: sendError } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          orderId: 'agenda-summary',
          orderNumber: `Agenda - ${technician.name}`,
          recipientPhone: technician.phone,
          recipientName: technician.name,
          templateType: 'technician_agenda_summary',
          templateVariables: {
            technicianName: technician.name,
            startDate: format(startDate, "dd/MM/yyyy", { locale: ptBR }),
            totalDays: totalDays.toString(),
            totalSchedules: schedules.length.toString(),
            scheduleList: scheduleList
          }
        }
      });

      if (sendError) {
        return { success: false, error: sendError.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  };

  const handleSendAgenda = async () => {
    if (selectedTechnicians.length === 0) {
      toast.error('Selecione pelo menos um técnico');
      return;
    }

    setIsSending(true);
    const selectedTechs = technicians.filter(t => selectedTechnicians.includes(t.id));
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const tech of selectedTechs) {
      const result = await sendAgendaToTechnician(tech);
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        errors.push(`${tech.name}: ${result.error}`);
      }
    }

    setIsSending(false);

    if (successCount > 0 && errorCount === 0) {
      toast.success(`Agenda enviada para ${successCount} técnico(s)!`);
      onOpenChange(false);
    } else if (successCount > 0 && errorCount > 0) {
      toast.warning(`Enviado para ${successCount}, falhou para ${errorCount}. ${errors.join(', ')}`);
    } else {
      toast.error(`Falha ao enviar: ${errors.join(', ')}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Disparar Agenda
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Date picker */}
          <div className="space-y-2">
            <Label>A partir de:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd/MM/yyyy (EEEE)", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <p className="text-sm text-muted-foreground">
            Selecione os técnicos que receberão a agenda completa por WhatsApp:
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectAll}
                >
                  {selectedTechnicians.length === technicians.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedTechnicians.length} selecionado(s)
                </span>
              </div>

              <ScrollArea className="h-[250px] border rounded-lg p-3">
                <div className="space-y-3">
                  {technicians.map((tech) => (
                    <div 
                      key={tech.id} 
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={tech.id}
                          checked={selectedTechnicians.includes(tech.id)}
                          onCheckedChange={() => handleTechnicianToggle(tech.id)}
                        />
                        <Label htmlFor={tech.id} className="flex items-center gap-2 cursor-pointer">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{tech.name}</span>
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        {!tech.phone && (
                          <Badge variant="outline" className="text-xs text-destructive border-destructive">
                            Sem telefone
                          </Badge>
                        )}
                        {tech.scheduleCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {tech.scheduleCount} agendamento{tech.scheduleCount !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}

                  {technicians.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum técnico cadastrado
                    </p>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSendAgenda} 
            disabled={isSending || selectedTechnicians.length === 0}
            className="gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar Agenda
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
