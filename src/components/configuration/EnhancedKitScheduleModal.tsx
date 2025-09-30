import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { CustomerSelector } from '@/components/customers';
import type { Customer } from '@/services/customerService';
import { generateMockScheduleData, type ExtendedScheduleData, type VehicleData } from '@/services/mockScheduleDataService';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Package, Cpu, DollarSign, FileText, User } from 'lucide-react';

const formSchema = z.object({
  technician_id: z.string().min(1, 'Selecione um técnico'),
  scheduled_date: z.date({ required_error: 'Selecione uma data' }),
  installation_time: z.string().optional(),
  notes: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

interface EnhancedKitScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  kit: HomologationKit;
  technicians: Technician[];
  existingSchedules: KitScheduleWithDetails[];
  onSuccess: () => void;
}

export const EnhancedKitScheduleModal = ({
  isOpen,
  onClose,
  kit,
  technicians,
  existingSchedules,
  onSuccess
}: EnhancedKitScheduleModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const [mockData, setMockData] = useState<ExtendedScheduleData | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      technician_id: '',
      installation_time: '',
      notes: ''
    }
  });

  // Generate mock data when modal opens
  useEffect(() => {
    if (isOpen && !mockData) {
      const generated = generateMockScheduleData(technicians, [kit], 1)[0];
      setMockData(generated);
    }
  }, [isOpen, technicians, kit, mockData]);

  const onSubmit = async (data: FormData) => {
    if (!selectedCustomer) {
      toast({
        title: "Cliente obrigatório",
        description: "Selecione ou cadastre um cliente para continuar.",
        variant: "destructive"
      });
      return;
    }

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

      // Create the schedule with customer data
      await createKitSchedule({
        kit_id: kit.id!,
        technician_id: data.technician_id,
        scheduled_date: data.scheduled_date.toISOString().split('T')[0],
        installation_time: data.installation_time || undefined,
        notes: data.notes || undefined,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        customer_document_number: selectedCustomer.document_number,
        customer_phone: selectedCustomer.phone,
        customer_email: selectedCustomer.email,
        installation_address_street: selectedCustomer.address_street,
        installation_address_number: selectedCustomer.address_number,
        installation_address_neighborhood: selectedCustomer.address_neighborhood,
        installation_address_city: selectedCustomer.address_city,
        installation_address_state: selectedCustomer.address_state,
        installation_address_postal_code: selectedCustomer.address_postal_code,
        installation_address_complement: selectedCustomer.address_complement
      });

      toast({
        title: "Agendamento criado",
        description: `Kit "${kit.name}" agendado com sucesso para ${selectedCustomer.name}.`
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
    setSelectedCustomer(null);
    setMockData(null);
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar Instalação - {kit.name}</DialogTitle>
          <DialogDescription>
            Preencha os dados do cliente e selecione o técnico, data e horário para a instalação do kit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mock Client and Sales Data */}
          {mockData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Dados do Cliente e Vendas (Exemplo)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Company and Package Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Empresa</p>
                    <p className="font-semibold">{mockData.company_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pacote</p>
                    <p className="font-semibold">{mockData.package_name}</p>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                    <p className="font-medium">{mockData.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">CPF/CNPJ</p>
                    <p className="font-medium">{mockData.customer_document_number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                    <p className="font-medium">{mockData.customer_phone}</p>
                  </div>
                </div>

                {/* Vehicles */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-4 h-4" />
                    <span className="text-sm font-medium text-muted-foreground">Veículos</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mockData.vehicles.map((vehicle: VehicleData, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <p className="font-medium">{vehicle.brand} {vehicle.model}</p>
                        <p className="text-sm text-muted-foreground">
                          Ano: {vehicle.year} | Quantidade: {vehicle.quantity}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Accessories */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4" />
                    <span className="text-sm font-medium text-muted-foreground">Acessórios</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {mockData.accessories.map((accessory, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {accessory}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Accessories */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4" />
                    <span className="text-sm font-medium text-muted-foreground">Acessórios</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {mockData.modules.map((module, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {module}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Sales Info */}
                {mockData.sales_info && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
                    {mockData.sales_info.total_value && (
                      <div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          <span className="text-sm font-medium text-muted-foreground">Valor Total</span>
                        </div>
                        <p className="font-semibold text-green-600">
                          R$ {mockData.sales_info.total_value.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    )}
                    {mockData.sales_info.contract_number && (
                      <div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm font-medium text-muted-foreground">Contrato</span>
                        </div>
                        <p className="font-medium">{mockData.sales_info.contract_number}</p>
                      </div>
                    )}
                    {mockData.sales_info.sales_representative && (
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span className="text-sm font-medium text-muted-foreground">Vendedor</span>
                        </div>
                        <p className="font-medium">{mockData.sales_info.sales_representative}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Customer Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Dados do Cliente</h3>
            
            <CustomerSelector
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
            />
          </div>

          {/* Schedule Form */}
          {selectedCustomer && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Dados do Agendamento</h3>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Technician Selection */}
                  <FormField
                    control={form.control}
                    name="technician_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Técnico *</FormLabel>
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
                        <FormLabel>Data da Instalação *</FormLabel>
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
