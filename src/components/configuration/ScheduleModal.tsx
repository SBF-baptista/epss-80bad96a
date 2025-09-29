import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Clock, User, Truck, Package, Cpu, DollarSign, FileText } from 'lucide-react';
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
import { generateMockScheduleData, type ExtendedScheduleData, type VehicleData } from '@/services/mockScheduleDataService';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formSchema = z.object({
  kit_id: z.string().min(1, 'Selecione um kit'),
  technician_ids: z.array(z.string()).min(1, 'Selecione pelo menos um técnico'),
  scheduled_date: z.date({ required_error: 'Selecione uma data' }),
  installation_time: z.string().optional(),
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
  const [mockData, setMockData] = useState<ExtendedScheduleData | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kit_id: '',
      technician_ids: [],
      installation_time: '',
      notes: ''
    }
  });

  // Generate mock data when modal opens
  useEffect(() => {
    if (isOpen && !mockData) {
      const selectedKit = kits.length > 0 ? kits[0] : {
        id: 'mock-kit',
        name: 'Kit Exemplo',
        description: 'Kit de exemplo',
        homologation_card_id: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as HomologationKit;
      const generated = generateMockScheduleData(technicians, [selectedKit], 1)[0];
      setMockData(generated);
    }
  }, [isOpen, technicians, kits, mockData]);


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

      // Check for conflicts for each technician
      for (const technicianId of data.technician_ids) {
        const hasConflict = await checkScheduleConflict(
          technicianId,
          data.scheduled_date.toISOString().split('T')[0],
          data.installation_time || undefined
        );

        if (hasConflict) {
          const technician = technicians.find(t => t.id === technicianId);
          toast({
            title: "Conflito de horário",
            description: `O técnico ${technician?.name} já possui um agendamento neste horário.`,
            variant: "destructive"
          });
          return;
        }
      }

      // Create schedules for each technician
      const selectedKit = kits.find(k => k.id === data.kit_id);
      for (const technicianId of data.technician_ids) {
        await createKitSchedule({
          kit_id: data.kit_id,
          technician_id: technicianId,
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
          installation_address_complement: selectedCustomer.address_complement || undefined
        });
      }

      const technicianNames = data.technician_ids.map(id => 
        technicians.find(t => t.id === id)?.name
      ).filter(Boolean).join(', ');
      
      toast({
        title: "Agendamento(s) criado(s)",
        description: `Kit "${selectedKit?.name}" agendado com sucesso para ${selectedCustomer.name} com os técnicos: ${technicianNames}.`
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
    setMockData(null);
    onClose();
  };

  const handleCustomerCreated = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerForm(false);
  };

  const handleCustomerUpdated = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerEdit(false);
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

                {/* Modules */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4" />
                    <span className="text-sm font-medium text-muted-foreground">Módulos</span>
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
                    name="technician_ids"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Técnicos *</FormLabel>
                        <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                          {technicians.map((technician) => (
                            <div key={technician.id} className="flex items-start space-x-2">
                              <input
                                type="checkbox"
                                id={`technician-${technician.id}`}
                                checked={field.value?.includes(technician.id!) || false}
                                onChange={(e) => {
                                  const currentValues = field.value || [];
                                  if (e.target.checked) {
                                    field.onChange([...currentValues, technician.id!]);
                                  } else {
                                    field.onChange(currentValues.filter(id => id !== technician.id));
                                  }
                                }}
                                className="mt-1"
                              />
                              <label 
                                htmlFor={`technician-${technician.id}`}
                                className="flex-1 cursor-pointer"
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{technician.name}</span>
                                  {technician.address_city && technician.address_state && (
                                    <span className="text-xs text-muted-foreground">
                                      {technician.address_city} - {technician.address_state}
                                    </span>
                                  )}
                                </div>
                              </label>
                            </div>
                          ))}
                        </div>
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