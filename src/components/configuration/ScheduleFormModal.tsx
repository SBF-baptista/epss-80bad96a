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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getTechnicians, Technician } from '@/services/technicianService';
import { MapPin, CalendarIcon, Car, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

const scheduleFormSchema = z.object({
  date: z.date({ required_error: 'Data é obrigatória' }),
  technician_id: z.string().min(1, 'Técnico é obrigatório'),
  technician_name: z.string().min(1, 'Nome do técnico é obrigatório'),
  technician_whatsapp: z.string().optional(),
  time: z.string().min(1, 'Horário é obrigatório'),
  service: z.string().min(1, 'Serviço é obrigatório'),
  plate: z.string().min(1, 'Placa é obrigatória'),
  vehicle_model: z.string().min(1, 'Modelo do veículo é obrigatório'),
  vehicle_year: z.string().optional(),
  tracker_model: z.string().min(1, 'Modelo do rastreador é obrigatório'),
  customer: z.string().min(1, 'Cliente é obrigatório'),
  address: z.string().min(1, 'Endereço é obrigatório'),
  reference_point: z.string().min(1, 'Ponto de referência é obrigatório'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  local_contact: z.string().min(1, 'Contato local é obrigatório'),
  observation: z.string().optional(),
});

export type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

export interface PendingVehicleData {
  kitScheduleId?: string; // ID from kit_schedules to update status after scheduling
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
  technicianId?: string;
  scheduledDate?: string;
  installationTime?: string;
  incomingVehicleId?: string;
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
  const [isFromSegsale, setIsFromSegsale] = useState(false);

  // Determine if fields should be locked (has initial data from pipeline)
  const hasInitialData = Boolean(initialVehicleData?.plate || initialVehicleData?.model);

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      date: selectedDate || new Date(),
      technician_id: '',
      technician_name: '',
      technician_whatsapp: '',
      time: '',
      service: '',
      plate: '',
      vehicle_model: '',
      vehicle_year: '',
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
        
        // After technicians are loaded, pre-fill from planning data
        if (initialVehicleData?.technicianId && data.length > 0) {
          const planningTechnician = data.find(t => t.id === initialVehicleData.technicianId);
          if (planningTechnician) {
            form.setValue('technician_id', planningTechnician.id!);
            form.setValue('technician_name', planningTechnician.name);
            form.setValue('technician_whatsapp', planningTechnician.phone || '');
          }
        }
      } catch (error) {
        console.error('Error loading technicians:', error);
      }
    };
    if (open) {
      loadTechnicians();
      
      // Pre-fill date and time from planning
      if (initialVehicleData?.scheduledDate) {
        const date = new Date(initialVehicleData.scheduledDate + 'T12:00:00');
        form.setValue('date', date);
      } else if (selectedDate) {
        form.setValue('date', selectedDate);
      }
      
      if (initialVehicleData?.installationTime) {
        form.setValue('time', initialVehicleData.installationTime.substring(0, 5));
      } else if (selectedTime) {
        form.setValue('time', selectedTime);
      }
      
      // Pre-fill form with vehicle data from Planning page
      if (initialVehicleData) {
        if (initialVehicleData.plate) {
          form.setValue('plate', initialVehicleData.plate);
        }
        if (initialVehicleData.brand && initialVehicleData.model) {
          form.setValue('vehicle_model', `${initialVehicleData.brand} ${initialVehicleData.model}`);
        }
        if (initialVehicleData.year) {
          form.setValue('vehicle_year', String(initialVehicleData.year));
        }
        // Pre-fill tracker model with configuration from kit
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
        // Observação vazia para o usuário preencher
        form.setValue('observation', '');
        
        // Set service based on usage type (frota from Segsale = fixed "Instalação")
        // For now, we'll check if incomingVehicleId exists (meaning it came from Segsale pipeline)
        if (initialVehicleData.incomingVehicleId) {
          form.setValue('service', 'Instalação');
          setIsFromSegsale(true);
        } else {
          setIsFromSegsale(false);
        }
      } else {
        setIsFromSegsale(false);
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
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] p-3 sm:p-6 overflow-hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base sm:text-lg truncate">
            Novo Agendamento {watchedDate ? `- ${format(watchedDate, "dd 'de' MMMM", { locale: ptBR })}` : ''}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)] pr-2 sm:pr-4">
          {/* Vehicle Data Header */}
          {initialVehicleData && (initialVehicleData.plate || initialVehicleData.model) && (
            <Card className="bg-muted/50 border-primary/20 mb-4">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="font-semibold text-sm">Dados do Veículo</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                  {initialVehicleData.model && (
                    <div className="min-w-0">
                      <span className="text-xs text-muted-foreground block">Modelo</span>
                      <span className="font-medium text-xs truncate block">{initialVehicleData.brand} {initialVehicleData.model}</span>
                    </div>
                  )}
                  {initialVehicleData.plate && (
                    <div className="min-w-0">
                      <span className="text-xs text-muted-foreground block">Placa</span>
                      <Badge variant="secondary" className="text-xs">{initialVehicleData.plate}</Badge>
                    </div>
                  )}
                  {initialVehicleData.year && (
                    <div className="min-w-0">
                      <span className="text-xs text-muted-foreground block">Ano</span>
                      <span className="font-medium text-xs">{initialVehicleData.year}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-xs text-muted-foreground block">Config.</span>
                    <div className="flex items-center gap-1">
                      <Cpu className="h-3 w-3 text-purple-600 flex-shrink-0" />
                      <span className="font-medium text-xs text-purple-700 truncate">{initialVehicleData.configuration || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
                    <FormLabel className="text-sm">Horário *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} className="h-9" />
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
                    <FormLabel className="text-sm">Serviço *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isFromSegsale}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecione o serviço" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        <SelectItem value="Instalação">Instalação</SelectItem>
                        <SelectItem value="Manutenção">Manutenção</SelectItem>
                        <SelectItem value="Retirada">Retirada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="plate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Placa *</FormLabel>
                      <FormControl>
                        <Input placeholder="Placa do veículo" {...field} className="h-9" disabled={hasInitialData} />
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
                      <FormLabel className="text-sm">Modelo do Veículo *</FormLabel>
                      <FormControl>
                        <Input placeholder="Modelo do veículo" {...field} className="h-9" disabled={hasInitialData} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vehicle_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Ano</FormLabel>
                      <FormControl>
                        <Input placeholder="Ano" {...field} className="h-9" disabled={hasInitialData} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tracker_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Modelo do Rastreador *</FormLabel>
                    <FormControl>
                      <Input placeholder="Modelo do rastreador" {...field} className="h-9" disabled={hasInitialData} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="customer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Cliente *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do cliente" {...field} className="h-9" disabled={hasInitialData} />
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
                      <FormLabel className="text-sm">Telefone *</FormLabel>
                      <FormControl>
                        <Input placeholder="Telefone para contato" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Endereço *</FormLabel>
                    <FormControl>
                      <Input placeholder="Endereço completo" {...field} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="reference_point"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Ponto de Referência *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ponto de referência" {...field} className="h-9" />
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
                      <FormLabel className="text-sm">Contato Local *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do contato no local" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="observation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Observação</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações sobre o agendamento" {...field} className="min-h-[60px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
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
