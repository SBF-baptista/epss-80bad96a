import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { getTechnicians, Technician } from '@/services/technicianService';
import { MapPin, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const scheduleFormSchema = z.object({
  date: z.date({ required_error: 'Data é obrigatória' }),
  technician_id: z.string().min(1, 'Técnico é obrigatório'),
  technician_name: z.string().min(1, 'Nome do técnico é obrigatório'),
  technician_whatsapp: z.string().optional(),
  time: z.string().min(1, 'Horário é obrigatório'),
  scheduled_by: z.string().min(1, 'Quem agendou é obrigatório'),
  service: z.string().min(1, 'Serviço é obrigatório'),
  plate: z.string().min(1, 'Placa é obrigatória'),
  vehicle_model: z.string().min(1, 'Modelo do veículo é obrigatório'),
  tracker_model: z.string().min(1, 'Modelo do rastreador é obrigatório'),
  customer: z.string().min(1, 'Cliente é obrigatório'),
  address: z.string().min(1, 'Endereço é obrigatório'),
  reference_point: z.string().min(1, 'Ponto de referência é obrigatório'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  local_contact: z.string().min(1, 'Contato local é obrigatório'),
  observation: z.string().min(1, 'Observação é obrigatória'),
});

export type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

export interface PendingVehicleData {
  plate?: string;
  brand?: string;
  model?: string;
  year?: number;
  accessories?: string[];
  configuration?: string;
  selectedKitIds?: string[];
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
}

interface ScheduleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  selectedTime: string | null;
  onSubmit: (data: ScheduleFormData & { date: Date }) => void;
  isLoading?: boolean;
  initialVehicleData?: PendingVehicleData | null;
}

export const ScheduleFormModal = ({
  open,
  onOpenChange,
  selectedDate,
  selectedTime,
  onSubmit,
  isLoading = false,
  initialVehicleData,
}: ScheduleFormModalProps) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      date: selectedDate || new Date(),
      technician_id: '',
      technician_name: '',
      technician_whatsapp: '',
      time: '',
      scheduled_by: '',
      service: '',
      plate: '',
      vehicle_model: '',
      tracker_model: '',
      customer: '',
      address: '',
      reference_point: '',
      phone: '',
      local_contact: '',
      observation: '',
    },
  });

  useEffect(() => {
    const loadTechnicians = async () => {
      try {
        const data = await getTechnicians();
        setTechnicians(data);
      } catch (error) {
        console.error('Error loading technicians:', error);
      }
    };
    if (open) {
      loadTechnicians();
      if (selectedTime) {
        form.setValue('time', selectedTime);
      }
      if (selectedDate) {
        form.setValue('date', selectedDate);
      }
      // Pre-fill form with vehicle data from Planning page
      if (initialVehicleData) {
        if (initialVehicleData.plate) {
          form.setValue('plate', initialVehicleData.plate);
        }
        if (initialVehicleData.brand && initialVehicleData.model) {
          form.setValue('vehicle_model', `${initialVehicleData.brand} ${initialVehicleData.model}${initialVehicleData.year ? ` (${initialVehicleData.year})` : ''}`);
        }
        if (initialVehicleData.configuration) {
          form.setValue('tracker_model', initialVehicleData.configuration);
        }
        if (initialVehicleData.customerName) {
          form.setValue('customer', initialVehicleData.customerName);
        }
        if (initialVehicleData.customerPhone) {
          form.setValue('phone', initialVehicleData.customerPhone);
        }
        if (initialVehicleData.customerAddress) {
          form.setValue('address', initialVehicleData.customerAddress);
        }
        // Build observation with accessories info
        const obsLines: string[] = [];
        if (initialVehicleData.accessories && initialVehicleData.accessories.length > 0) {
          obsLines.push(`Acessórios: ${initialVehicleData.accessories.join(', ')}`);
        }
        if (obsLines.length > 0) {
          form.setValue('observation', obsLines.join('\n'));
        }
      }
    } else {
      form.reset();
    }
  }, [open, selectedTime, selectedDate, form, initialVehicleData]);

  const handleTechnicianChange = (technicianId: string) => {
    const technician = technicians.find(t => t.id === technicianId);
    if (technician) {
      form.setValue('technician_id', technicianId);
      form.setValue('technician_name', technician.name);
      form.setValue('technician_whatsapp', technician.phone || '');
    }
  };

  const selectedTechnicianPhone = form.watch('technician_whatsapp');
  const watchedDate = form.watch('date');

  const getTechnicianLocation = (technician: Technician) => {
    const parts = [technician.address_city, technician.address_state].filter(Boolean);
    return parts.length > 0 ? parts.join(' - ') : 'Localização não informada';
  };

  const handleSubmit = (data: ScheduleFormData) => {
    const dateToUse = data.date || selectedDate;
    if (dateToUse) {
      onSubmit({ ...data, date: dateToUse });
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            Novo Agendamento {watchedDate ? `- ${format(watchedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}` : ''}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Date Picker Field */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data do Agendamento *</FormLabel>
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
                              format(field.value, "PPP", { locale: ptBR })
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
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="technician_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Técnico *</FormLabel>
                    <Select onValueChange={handleTechnicianChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um técnico" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        {technicians.map((technician) => (
                          <SelectItem key={technician.id} value={technician.id!}>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{technician.name}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {getTechnicianLocation(technician)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Telefone do técnico (somente leitura) */}
              {selectedTechnicianPhone && (
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">WhatsApp do técnico:</span>
                    <span className="font-medium text-primary">
                      {selectedTechnicianPhone.startsWith('+') ? selectedTechnicianPhone : `+55${selectedTechnicianPhone}`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Uma notificação será enviada para este número ao salvar o agendamento.
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduled_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quem Agendou *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome de quem agendou" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serviço *</FormLabel>
                    <FormControl>
                      <Input placeholder="Tipo de serviço" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa *</FormLabel>
                    <FormControl>
                      <Input placeholder="Placa do veículo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehicle_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo do Veículo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Modelo do veículo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tracker_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo do Rastreador *</FormLabel>
                    <FormControl>
                      <Input placeholder="Modelo do rastreador" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço *</FormLabel>
                    <FormControl>
                      <Input placeholder="Endereço completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference_point"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ponto de Referência *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ponto de referência" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone *</FormLabel>
                    <FormControl>
                      <Input placeholder="Telefone para contato" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="local_contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contato Local *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do contato no local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observação *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações sobre o agendamento" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Salvando...' : 'Salvar Agendamento'}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
