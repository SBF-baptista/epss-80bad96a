import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Clock, MapPin } from 'lucide-react';
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
import type { Customer } from '@/services/customerService';
import { createKitSchedule, checkScheduleConflict } from '@/services/kitScheduleService';
import { CustomerSelector, CustomerForm, CustomerEditForm } from '@/components/customers';

const formSchema = z.object({
  kit_id: z.string().min(1, 'Selecione um kit'),
  technician_id: z.string().min(1, 'Selecione um técnico'),
  scheduled_date: z.date({ required_error: 'Selecione uma data' }),
  installation_time: z.string().optional(),
  installation_address_street: z.string().min(1, 'Endereço é obrigatório'),
  installation_address_number: z.string().min(1, 'Número é obrigatório'),
  installation_address_neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  installation_address_city: z.string().min(1, 'Cidade é obrigatória'),
  installation_address_state: z.string().min(1, 'Estado é obrigatório'),
  installation_address_postal_code: z.string().min(1, 'CEP é obrigatório'),
  installation_address_complement: z.string().optional(),
  notes: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomer?: Customer | null;
  kits: HomologationKit[];
  technicians: Technician[];
  onSuccess: () => void;
}

export const ScheduleModal = ({
  isOpen,
  onClose,
  selectedCustomer: initialCustomer,
  kits,
  technicians,
  onSuccess
}: ScheduleModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialCustomer || null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showCustomerEdit, setShowCustomerEdit] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kit_id: '',
      technician_id: '',
      installation_time: '',
      installation_address_street: selectedCustomer?.address_street || '',
      installation_address_number: selectedCustomer?.address_number || '',
      installation_address_neighborhood: selectedCustomer?.address_neighborhood || '',
      installation_address_city: selectedCustomer?.address_city || '',
      installation_address_state: selectedCustomer?.address_state || '',
      installation_address_postal_code: selectedCustomer?.address_postal_code || '',
      installation_address_complement: selectedCustomer?.address_complement || '',
      notes: ''
    }
  });

  // Update form when customer changes
  useState(() => {
    if (selectedCustomer) {
      form.setValue('installation_address_street', selectedCustomer.address_street);
      form.setValue('installation_address_number', selectedCustomer.address_number);
      form.setValue('installation_address_neighborhood', selectedCustomer.address_neighborhood);
      form.setValue('installation_address_city', selectedCustomer.address_city);
      form.setValue('installation_address_state', selectedCustomer.address_state);
      form.setValue('installation_address_postal_code', selectedCustomer.address_postal_code);
      form.setValue('installation_address_complement', selectedCustomer.address_complement || '');
    }
  });

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

      // Create the schedule
      await createKitSchedule({
        kit_id: data.kit_id,
        technician_id: data.technician_id,
        scheduled_date: data.scheduled_date.toISOString().split('T')[0],
        installation_time: data.installation_time || undefined,
        notes: data.notes || undefined,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        customer_document_number: selectedCustomer.document_number,
        customer_phone: selectedCustomer.phone,
        customer_email: selectedCustomer.email,
        installation_address_street: data.installation_address_street,
        installation_address_number: data.installation_address_number,
        installation_address_neighborhood: data.installation_address_neighborhood,
        installation_address_city: data.installation_address_city,
        installation_address_state: data.installation_address_state,
        installation_address_postal_code: data.installation_address_postal_code,
        installation_address_complement: data.installation_address_complement || undefined
      });

      const selectedKit = kits.find(k => k.id === data.kit_id);
      toast({
        title: "Agendamento criado",
        description: `Kit "${selectedKit?.name}" agendado com sucesso para ${selectedCustomer.name}.`
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
    setSelectedCustomer(initialCustomer || null);
    setShowCustomerForm(false);
    setShowCustomerEdit(false);
    onClose();
  };

  const handleCustomerCreated = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerForm(false);
    // Update form with new customer data
    form.setValue('installation_address_street', customer.address_street);
    form.setValue('installation_address_number', customer.address_number);
    form.setValue('installation_address_neighborhood', customer.address_neighborhood);
    form.setValue('installation_address_city', customer.address_city);
    form.setValue('installation_address_state', customer.address_state);
    form.setValue('installation_address_postal_code', customer.address_postal_code);
    form.setValue('installation_address_complement', customer.address_complement || '');
  };

  const handleCustomerUpdated = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerEdit(false);
    // Update form with updated customer data
    form.setValue('installation_address_street', customer.address_street);
    form.setValue('installation_address_number', customer.address_number);
    form.setValue('installation_address_neighborhood', customer.address_neighborhood);
    form.setValue('installation_address_city', customer.address_city);
    form.setValue('installation_address_state', customer.address_state);
    form.setValue('installation_address_postal_code', customer.address_postal_code);
    form.setValue('installation_address_complement', customer.address_complement || '');
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
          <DialogTitle>Novo Agendamento de Instalação</DialogTitle>
          <DialogDescription>
            Selecione o cliente, kit, técnico e configure os detalhes da instalação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Cliente</h3>
            
            {showCustomerForm ? (
              <CustomerForm
                onSuccess={handleCustomerCreated}
                onCancel={() => setShowCustomerForm(false)}
              />
            ) : showCustomerEdit && selectedCustomer ? (
              <CustomerEditForm
                customer={selectedCustomer}
                onSuccess={handleCustomerUpdated}
                onCancel={() => setShowCustomerEdit(false)}
              />
            ) : (
              <div className="space-y-4">
                <CustomerSelector
                  selectedCustomer={selectedCustomer}
                  onSelectCustomer={setSelectedCustomer}
                  onCreateNew={() => setShowCustomerForm(true)}
                />
                {selectedCustomer && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCustomerEdit(true)}
                    >
                      Editar Dados do Cliente
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Schedule Form */}
          {selectedCustomer && !showCustomerForm && !showCustomerEdit && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Detalhes da Instalação</h3>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Kit Selection */}
                  <FormField
                    control={form.control}
                    name="kit_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kit para Instalação *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um kit homologado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {kits.map((kit) => (
                              <SelectItem key={kit.id} value={kit.id!}>
                                <div className="flex flex-col">
                                  <span>{kit.name}</span>
                                  {kit.description && (
                                    <span className="text-xs text-muted-foreground">
                                      {kit.description}
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

                  {/* Date and Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                  </div>

                  {/* Installation Address */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <h4 className="font-medium">Local da Instalação</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name="installation_address_street"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rua *</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome da rua" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="installation_address_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número *</FormLabel>
                            <FormControl>
                              <Input placeholder="123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="installation_address_neighborhood"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bairro *</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome do bairro" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="installation_address_postal_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CEP *</FormLabel>
                            <FormControl>
                              <Input placeholder="00000-000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="installation_address_city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade *</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome da cidade" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="installation_address_state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado *</FormLabel>
                            <FormControl>
                              <Input placeholder="SP" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="installation_address_complement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complemento</FormLabel>
                          <FormControl>
                            <Input placeholder="Apartamento, casa, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
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

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Agendando..." : "Criar Agendamento"}
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