import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, User, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getTechnicians } from '@/services/technicianService';

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

interface SendResult {
  techId: string;
  techName: string;
  status: 'pending' | 'sending' | 'success' | 'error';
  error?: string;
}

export const TechnicianAgendaModal = ({ isOpen, onOpenChange }: TechnicianAgendaModalProps) => {
  const [technicians, setTechnicians] = useState<TechnicianScheduleCount[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResults, setSendResults] = useState<SendResult[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchTechniciansWithSchedules();
      setSendResults([]);
    }
  }, [isOpen]);

  const fetchTechniciansWithSchedules = async () => {
    setIsLoading(true);
    try {
      const allTechnicians = await getTechnicians();
      
      // Get tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

      // Get schedules for tomorrow
      const { data: tomorrowSchedules } = await supabase
        .from('installation_schedules')
        .select('technician_name, scheduled_date')
        .eq('scheduled_date', tomorrowStr);

      // Map technicians with their schedule counts for tomorrow
      const techsWithCounts: TechnicianScheduleCount[] = allTechnicians.map(tech => ({
        id: tech.id,
        name: tech.name,
        phone: tech.phone,
        scheduleCount: tomorrowSchedules?.filter(s => s.technician_name === tech.name).length || 0
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

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    const formattedTomorrow = format(tomorrow, "dd/MM/yyyy", { locale: ptBR });

    // Get all schedules for this technician for tomorrow
    const { data: schedules, error } = await supabase
      .from('installation_schedules')
      .select('*')
      .eq('scheduled_date', tomorrowStr)
      .eq('technician_name', technician.name)
      .order('scheduled_time', { ascending: true });

    if (error || !schedules?.length) {
      return { success: false, error: 'Sem agendamentos para amanhã' };
    }

    // Format message for Twilio template - compact format since newlines become bullets
    const scheduleList = schedules.map((s, index) => {
      const num = index + 1;
      const time = s.scheduled_time?.substring(0, 5) || '??:??';
      const client = s.customer || 'Cliente';
      const phone = s.phone || '-';
      const addr = s.address || 'Endereco a confirmar';
      
      // Compact format: [1] 07:00 - CLIENTE | Tel: 999 | Endereco | Ref | Contato
      const parts = [
        `[${num}] ${time} - ${client}`,
        `Tel: ${phone}`,
        addr,
      ];
      if (s.reference_point) parts.push(`Ref: ${s.reference_point}`);
      if (s.local_contact) parts.push(`Contato: ${s.local_contact}`);
      
      return parts.join(' | ');
    }).join(' ••• ');

    try {
      const { data, error: sendError } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          orderId: 'next-day-agenda',
          orderNumber: `Agenda Amanhã - ${technician.name}`,
          recipientPhone: technician.phone,
          recipientName: technician.name,
          templateType: 'technician_next_day_agenda',
          templateVariables: {
            technicianName: technician.name,
            scheduledDate: formattedTomorrow,
            scheduleList: scheduleList
          }
        }
      });

      if (sendError) {
        return { success: false, error: sendError.message };
      }

      // Check if the message was actually delivered
      if (!data?.success || data?.errorCode) {
        const friendlyMsg = data?.friendlyMessage || data?.errorMessage || 'Verifique se o número está opt-in';
        return { 
          success: false, 
          error: friendlyMsg
        };
      }

      // Log the status for debugging
      console.log(`WhatsApp sent to ${technician.name}:`, {
        sid: data?.messageSid,
        status: data?.finalStatus,
        format: data?.variablesFormat
      });

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
    
    // Initialize results as pending
    const initialResults: SendResult[] = selectedTechs.map(t => ({
      techId: t.id,
      techName: t.name,
      status: 'pending' as const
    }));
    setSendResults(initialResults);

    let successCount = 0;
    let errorCount = 0;

    for (const tech of selectedTechs) {
      // Update status to sending
      setSendResults(prev => prev.map(r => 
        r.techId === tech.id ? { ...r, status: 'sending' as const } : r
      ));

      const result = await sendAgendaToTechnician(tech);
      
      // Update status based on result
      setSendResults(prev => prev.map(r => 
        r.techId === tech.id 
          ? { ...r, status: result.success ? 'success' : 'error', error: result.error } 
          : r
      ));

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    setIsSending(false);

    if (successCount > 0 && errorCount === 0) {
      toast.success(`Agenda enviada para ${successCount} técnico(s)!`);
    } else if (successCount > 0 && errorCount > 0) {
      toast.warning(`Enviado para ${successCount}, falhou para ${errorCount}`);
    } else {
      toast.error('Falha ao enviar para todos os técnicos');
    }
  };

  const getResultIcon = (result: SendResult) => {
    switch (result.status) {
      case 'sending':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
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
          {sendResults.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Resultado do envio:
              </p>
              <ScrollArea className="h-[250px] border rounded-lg p-3">
                <div className="space-y-2">
                  {sendResults.map((result) => (
                    <div 
                      key={result.techId}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        {getResultIcon(result)}
                        <span className="font-medium">{result.techName}</span>
                      </div>
                      {result.error && (
                        <span className="text-xs text-destructive max-w-[200px] truncate" title={result.error}>
                          {result.error}
                        </span>
                      )}
                      {result.status === 'success' && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                          Enviado
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Selecione os técnicos que receberão a agenda de <strong>amanhã</strong> por WhatsApp:
            </p>
          )}

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
            {sendResults.length > 0 ? 'Fechar' : 'Cancelar'}
          </Button>
          {sendResults.length === 0 && (
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
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
