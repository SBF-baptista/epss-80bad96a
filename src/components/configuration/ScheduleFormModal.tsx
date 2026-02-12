import { useEffect, useState, useCallback } from 'react';
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
import { getSchedulingServiceOptions, createSchedulingServiceOption } from '@/services/schedulingServiceOptionsService';
import { MapPin, CalendarIcon, Car, Cpu, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
  const [serviceOptions, setServiceOptions] = useState<string[]>(['Instalação', 'Manutenção', 'Retirada']);
  const [customService, setCustomService] = useState('');
  const [isAddingService, setIsAddingService] = useState(false);
  const [kickoffContacts, setKickoffContacts] = useState<{ name: string; role?: string; phone?: string }[]>([]);

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

  const fetchCustomerContacts = useCallback(async (customerId: string) => {
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('contacts')
        .eq('id', customerId)
        .maybeSingle();

      if (customer?.contacts && Array.isArray(customer.contacts)) {
        const contacts = (customer.contacts as any[])
          .filter((c: any) => c.name);

        setKickoffContacts(contacts.map((c: any) => ({
          name: c.name,
          role: c.role,
          phone: c.phone,
        })));

        const contactStrings = contacts.map((c: any) => {
          const parts = [c.name];
          if (c.role) parts.push(`(${c.role})`);
          if (c.phone) parts.push(`- ${c.phone}`);
          return parts.join(' ');
        });

        if (contactStrings.length > 0) {
          form.setValue('local_contact', contactStrings.join(' | '));
        }
      }
    } catch (error) {
      console.error('Error fetching customer contacts:', error);
    }
  }, [form]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load technicians
        const techData = await getTechnicians();
        setTechnicians(techData);
        
        // After technicians are loaded, pre-fill from planning data
        if (initialVehicleData?.technicianId && techData.length > 0) {
          const planningTechnician = techData.find(t => t.id === initialVehicleData.technicianId);
          if (planningTechnician) {
            form.setValue('technician_id', planningTechnician.id!);
            form.setValue('technician_name', planningTechnician.name);
            form.setValue('technician_whatsapp', planningTechnician.phone || '');
          }
        }
        
        // Load service options from database
        const services = await getSchedulingServiceOptions();
        if (services.length > 0) {
          setServiceOptions(services.map(s => s.service_name));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    if (open) {
      loadData();
      
      // Para novo agendamento, usar data selecionada ou data atual
      // A data do kit_schedules (scheduledDate) é apenas uma previsão antiga e não deve ser usada
      if (selectedDate) {
        form.setValue('date', selectedDate);
      } else {
        form.setValue('date', new Date());
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
        // Pre-fill local_contact from customer contacts (Kickoff data)
        if (initialVehicleData.customerId) {
          fetchCustomerContacts(initialVehicleData.customerId);
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
      setKickoffContacts([]);
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
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value} disabled={isFromSegsale}>
                        <FormControl>
                          <SelectTrigger className={`h-9 flex-1 ${isFromSegsale ? 'disabled:opacity-100 disabled:bg-muted disabled:text-foreground disabled:cursor-not-allowed' : ''}`}>
                            <SelectValue placeholder="Selecione o serviço" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background">
                          {serviceOptions.map((service) => (
                            <SelectItem key={service} value={service}>{service}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!isFromSegsale && (
                        <Popover open={isAddingService} onOpenChange={setIsAddingService}>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" size="icon" className="h-9 w-9">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3" align="end">
                            <div className="space-y-3">
                              <div className="text-sm font-medium">Adicionar novo serviço</div>
                              <Input
                                placeholder="Nome do serviço"
                                value={customService}
                                onChange={(e) => setCustomService(e.target.value)}
                                className="h-9"
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setIsAddingService(false);
                                    setCustomService('');
                                  }}
                                  className="flex-1"
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={!customService.trim()}
                                  onClick={async () => {
                                    try {
                                      await createSchedulingServiceOption(customService.trim());
                                      setServiceOptions(prev => [...prev, customService.trim()]);
                                      field.onChange(customService.trim());
                                      setCustomService('');
                                      setIsAddingService(false);
                                      toast.success('Serviço adicionado com sucesso!');
                                    } catch (error: any) {
                                      toast.error(error.message || 'Erro ao adicionar serviço');
                                    }
                                  }}
                                  className="flex-1"
                                >
                                  Adicionar
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
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
                        <Input placeholder="Placa do veículo" {...field} className={`h-9 ${hasInitialData ? 'disabled:opacity-100 disabled:bg-muted disabled:text-foreground disabled:cursor-not-allowed' : ''}`} disabled={hasInitialData} />
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
                        <Input placeholder="Modelo do veículo" {...field} className={`h-9 ${hasInitialData ? 'disabled:opacity-100 disabled:bg-muted disabled:text-foreground disabled:cursor-not-allowed' : ''}`} disabled={hasInitialData} />
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
                        <Input placeholder="Ano" {...field} className={`h-9 ${hasInitialData ? 'disabled:opacity-100 disabled:bg-muted disabled:text-foreground disabled:cursor-not-allowed' : ''}`} disabled={hasInitialData} />
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
                      <Input placeholder="Modelo do rastreador" {...field} className={`h-9 ${hasInitialData ? 'disabled:opacity-100 disabled:bg-muted disabled:text-foreground disabled:cursor-not-allowed' : ''}`} disabled={hasInitialData} />
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
                        <Input
                          placeholder="Nome do cliente"
                          {...field}
                          className={`h-9 ${hasInitialData ? 'disabled:opacity-100 disabled:bg-muted disabled:text-foreground disabled:cursor-not-allowed' : ''}`}
                          disabled={hasInitialData}
                        />
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

                {kickoffContacts.length === 0 ? (
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
                ) : (
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Contato(s) Local *</label>
                    {kickoffContacts.map((contact, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border">
                        <div className="flex-1 text-sm">
                          <span className="font-medium">{contact.name}</span>
                          {contact.role && <span className="text-muted-foreground ml-1">({contact.role})</span>}
                          {contact.phone && <span className="text-muted-foreground ml-2">- {contact.phone}</span>}
                        </div>
                      </div>
                    ))}
                    <input type="hidden" {...form.register('local_contact')} />
                  </div>
                )}
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
