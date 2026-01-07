import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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

  useEffect(() => {
    if (isOpen) {
      fetchTechniciansWithSchedules();
    }
  }, [isOpen]);

  const fetchTechniciansWithSchedules = async () => {
    setIsLoading(true);
    try {
      const allTechnicians = await getTechnicians();
      const todayStr = format(new Date(), 'yyyy-MM-dd');

      // Get today's schedules
      const { data: todaySchedules } = await supabase
        .from('installation_schedules')
        .select('technician_name')
        .eq('scheduled_date', todayStr);

      // Map technicians with their schedule counts
      const techsWithCounts: TechnicianScheduleCount[] = allTechnicians.map(tech => ({
        id: tech.id,
        name: tech.name,
        phone: tech.phone,
        scheduleCount: todaySchedules?.filter(s => s.technician_name === tech.name).length || 0
      }));

      // Sort by those with schedules first
      techsWithCounts.sort((a, b) => b.scheduleCount - a.scheduleCount);

      setTechnicians(techsWithCounts);
      
      // Pre-select technicians that have schedules today
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

  const sendDailySummaryToTechnician = async (technician: TechnicianScheduleCount): Promise<{ success: boolean; error?: string }> => {
    if (!technician.phone) {
      return { success: false, error: 'Sem telefone cadastrado' };
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const formattedDate = format(new Date(), "dd/MM/yyyy (EEEE)", { locale: ptBR });

    // Get all schedules for this technician today
    const { data: schedules, error } = await supabase
      .from('installation_schedules')
      .select('*')
      .eq('scheduled_date', todayStr)
      .eq('technician_name', technician.name)
      .order('scheduled_time', { ascending: true });

    if (error || !schedules?.length) {
      return { success: false, error: 'Sem agendamentos para hoje' };
    }

    // Format schedule list for message
    const scheduleList = schedules.map((s, index) => 
      `${index + 1}. ${s.scheduled_time} - ${s.customer}\n   📍 ${s.address}\n   🚗 ${s.vehicle_model}\n   📞 ${s.phone || s.local_contact || 'N/A'}`
    ).join('\n\n');

    try {
      const { error: sendError } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          orderId: 'daily-summary',
          orderNumber: `Agenda do dia - ${technician.name}`,
          recipientPhone: technician.phone,
          recipientName: technician.name,
          templateType: 'daily_schedule_summary',
          templateVariables: {
            technicianName: technician.name,
            scheduledDate: formattedDate,
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
      const result = await sendDailySummaryToTechnician(tech);
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

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Selecione os técnicos que receberão a agenda do dia por WhatsApp:
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
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

              <ScrollArea className="h-[300px] border rounded-lg p-3">
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
