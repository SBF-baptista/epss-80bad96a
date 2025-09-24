import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Technician } from '@/services/technicianService';
import type { HomologationKit } from '@/services/homologationKitService';
import type { KitScheduleWithDetails } from '@/services/kitScheduleService';
import { createKitSchedule, checkScheduleConflict } from '@/services/kitScheduleService';

const formSchema = z.object({
  technician_id: z.string().min(1, 'Selecione um técnico'),
  scheduled_date: z.date({ required_error: 'Selecione uma data' }),
  installation_time: z.string().optional(),
  notes: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

interface KitScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  kit: HomologationKit;
  technicians: Technician[];
  existingSchedules: KitScheduleWithDetails[];
  onSuccess: () => void;
}

export const KitScheduleModal = ({
  isOpen,
  onClose,
  kit,
  technicians,
  existingSchedules,
  onSuccess
}: KitScheduleModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      technician_id: '',
      installation_time: '',
      notes: ''
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);

      // Check for conflicts
      const hasConflict = await checkScheduleConflict(
        data.technician_id,
        data.scheduled_date.toISOString().split('T')[0],
        data.installation_time || undefined
      );

      if (hasConflict) {
        toast({
          title: "Conflito de horário",
          description: "Este técnico já possui um agendamento neste horário.",
          variant: "destructive"
        });
        return;
      }

      // Create the schedule
      await createKitSchedule({
        kit_id: kit.id!,
        technician_id: data.technician_id,
        scheduled_date: data.scheduled_date.toISOString().split('T')[0],
        installation_time: data.installation_time || undefined,
        notes: data.notes || undefined
      });

      toast({
        title: "Agendamento criado",
        description: `Kit "${kit.name}" agendado com sucesso.`
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar agendamento",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  // Generate time slots
  const timeSlots = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Agendar Instalação - {kit.name}</DialogTitle>
          <DialogDescription>
            Selecione o técnico, data e horário para a instalação do kit.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Technician Selection */}
            <FormField
              control={form.control}
              name="technician_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Técnico</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um técnico" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {technicians.map((technician) => (
                        <SelectItem key={technician.id} value={technician.id!}>
                          <div className="flex flex-col">
                            <span>{technician.name}</span>
                            {technician.address_city && technician.address_state && (
                              <span className="text-xs text-muted-foreground">
                                {technician.address_city} - {technician.address_state}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Selection */}
            <FormField
              control={form.control}
              name="scheduled_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data da Instalação</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Selection */}
            <FormField
              control={form.control}
              name="installation_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um horário" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre a instalação..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Existing Schedules Info */}
            {existingSchedules.length > 0 && (
              <div className="bg-muted/50 p-3 rounded-md">
                <h4 className="text-sm font-medium mb-2">Agendamentos Existentes:</h4>
                <div className="space-y-1">
                  {existingSchedules.map((schedule) => (
                    <div key={schedule.id} className="flex items-center justify-between text-xs">
                      <span>{schedule.technician.name}</span>
                      <span>
                        {new Date(schedule.scheduled_date).toLocaleDateString('pt-BR')}
                        {schedule.installation_time && ` às ${schedule.installation_time}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Agendando..." : "Agendar Instalação"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
