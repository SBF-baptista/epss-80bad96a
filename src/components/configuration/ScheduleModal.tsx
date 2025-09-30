import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Clock, User, Truck, Package, Cpu, DollarSign, FileText, Building, Check, X } from 'lucide-react';
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
import type { Customer, VehicleInfo } from '@/services/customerService';
import { createKitSchedule, checkScheduleConflict } from '@/services/kitScheduleService';
import { checkItemHomologation, type HomologationStatus } from '@/services/kitHomologationService';
import { CustomerSelector } from '@/components/customers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VehicleScheduleData {
  plate: string;
  brand: string;
  model: string;
  year: number;
  technician_ids: string[];
  scheduled_date: Date | null;
  installation_time: string;
  notes: string;
  contract_number: string;
  accessories: string[];
  modules: string[];
}

const vehicleScheduleSchema = z.object({
  plate: z.string(),
  brand: z.string(),
  model: z.string(),
  year: z.number(),
  technician_ids: z.array(z.string()).min(1, 'Selecione pelo menos um técnico'),
  scheduled_date: z.date({ required_error: 'Selecione uma data' }),
  installation_time: z.string().optional(),
  notes: z.string().optional()
});

const formSchema = z.object({
  vehicles: z.array(vehicleScheduleSchema).min(1, 'Configure pelo menos um veículo')
});

type FormData = z.infer<typeof formSchema>;

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomer?: Customer | null;
  selectedVehicle?: VehicleInfo | null;
  kits: HomologationKit[];
  technicians: Technician[];
  homologationStatuses: Map<string, HomologationStatus>;
  onSuccess: () => void;
}

export const ScheduleModal = ({
  isOpen,
  onClose,
  selectedCustomer: initialCustomer,
  selectedVehicle: initialVehicle,
  kits,
  technicians,
  homologationStatuses,
  onSuccess
}: ScheduleModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialCustomer || null);
  const [vehicleSchedules, setVehicleSchedules] = useState<VehicleScheduleData[]>([]);
  const [homologationStatus, setHomologationStatus] = useState<Map<string, boolean>>(new Map());

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicles: []
    }
  });

  // Initialize vehicle schedules when customer is selected
  useEffect(() => {
    console.log('Customer selected:', selectedCustomer);
    console.log('Customer vehicles:', selectedCustomer?.vehicles);

    if (!selectedCustomer) return;

    // Check if customer has vehicles
    if (!selectedCustomer.vehicles || selectedCustomer.vehicles.length === 0) {
      console.warn('Customer has no vehicles registered');
      toast({
        title: "Aviso",
        description: "Este cliente não possui veículos cadastrados. Por favor, adicione veículos ao cliente antes de agendar.",
        variant: "destructive"
      });
      setVehicleSchedules([]);
      form.reset({ vehicles: [] });
      return;
    }

    // 1) Initialize schedules immediately to render UI without delay
    const initialSchedules = selectedCustomer.vehicles.map((vehicle, index) => ({
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      technician_ids: [],
      scheduled_date: null,
      installation_time: '',
      notes: `Veículo: ${vehicle.brand} ${vehicle.model} (${vehicle.year}) - Placa: ${vehicle.plate}`,
      contract_number: `${selectedCustomer.contract_number || 'CONT'}-${String(index + 1).padStart(3, '0')}`,
      // clone arrays to avoid shared references
      accessories: [...(selectedCustomer.accessories || [])],
      modules: [...(selectedCustomer.modules || [])]
    }));

    console.log('Initial schedules created:', initialSchedules);
    setVehicleSchedules(initialSchedules);
    form.reset({ vehicles: initialSchedules });

    // 2) Fire-and-forget: check homologation in background and update icons
    (async () => {
      try {
        const statusMap = new Map<string, boolean>();
        
        // Check accessories and modules
        const allItems = [
          ...(selectedCustomer.accessories || []).map(name => ({ name, type: 'accessory' })),
          ...(selectedCustomer.modules || []).map(name => ({ name, type: 'equipment' }))
        ];
        
        await Promise.all(
          allItems.map(async (item) => {
            const ok = await checkItemHomologation(item.name, item.type);
            statusMap.set(`${item.name}:${item.type}`, ok);
          })
        );
        
        // Check overall homologation status for each vehicle/plate
        // A vehicle is ready for scheduling if all its accessories and modules are homologated
        for (const vehicle of selectedCustomer.vehicles || []) {
          const vehicleAccessories = selectedCustomer.accessories || [];
          const vehicleModules = selectedCustomer.modules || [];
          
          const allAccessoriesHomologated = vehicleAccessories.every(acc => 
            statusMap.get(`${acc}:accessory`) === true
          );
          const allModulesHomologated = vehicleModules.every(mod => 
            statusMap.get(`${mod}:equipment`) === true
          );
          
          const vehicleReady = allAccessoriesHomologated && allModulesHomologated;
          statusMap.set(`vehicle-ready:${vehicle.plate}`, vehicleReady);
        }
        
        setHomologationStatus(statusMap);
      } catch (e) {
        console.warn('Falha ao checar homologação de itens:', e);
      }
    })();
  }, [selectedCustomer, homologationStatuses, form, toast]);

  const updateVehicleSchedule = (plate: string, field: keyof VehicleScheduleData, value: any) => {
    const updatedSchedules = vehicleSchedules.map(schedule => 
      schedule.plate === plate ? { ...schedule, [field]: value } : schedule
    );
    setVehicleSchedules(updatedSchedules);
    form.setValue('vehicles', updatedSchedules);
  };


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

      // Get first available kit
      const selectedKit = kits.length > 0 ? kits[0] : null;
      if (!selectedKit) {
        toast({
          title: "Erro",
          description: "Nenhum kit homologado disponível para agendamento.",
          variant: "destructive"
        });
        return;
      }

      let schedulesCreated = 0;

      // Process each vehicle schedule
      for (const vehicleSchedule of data.vehicles) {
        if (!vehicleSchedule.scheduled_date) continue;

        // Check for conflicts for each technician
        for (const technicianId of vehicleSchedule.technician_ids) {
          const hasConflict = await checkScheduleConflict(
            technicianId,
            vehicleSchedule.scheduled_date.toISOString().split('T')[0],
            vehicleSchedule.installation_time || undefined
          );

          if (hasConflict) {
            const technician = technicians.find(t => t.id === technicianId);
            toast({
              title: "Conflito de horário",
              description: `O técnico ${technician?.name} já possui um agendamento no dia ${format(vehicleSchedule.scheduled_date, 'dd/MM/yyyy')} para o veículo ${vehicleSchedule.plate}.`,
              variant: "destructive"
            });
            return;
          }
        }

        // Create schedule for each technician
        for (const technicianId of vehicleSchedule.technician_ids) {
          await createKitSchedule({
            kit_id: selectedKit.id!,
            technician_id: technicianId,
            scheduled_date: vehicleSchedule.scheduled_date.toISOString().split('T')[0],
            installation_time: vehicleSchedule.installation_time || undefined,
            notes: vehicleSchedule.notes || undefined,
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
            installation_address_complement: selectedCustomer.address_complement || undefined,
            vehicle_plate: vehicleSchedule.plate,
            vehicle_brand: vehicleSchedule.brand,
            vehicle_model: vehicleSchedule.model,
            vehicle_year: vehicleSchedule.year
          });
          schedulesCreated++;
        }
      }

      toast({
        title: "Agendamentos criados",
        description: `${schedulesCreated} agendamento(s) criado(s) com sucesso para ${selectedCustomer.name}.`
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
    setVehicleSchedules([]);
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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-[1400px] h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Novo Agendamento de Instalação</DialogTitle>
          <DialogDescription>
            Selecione o cliente, kit, técnico e configure os detalhes da instalação.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Customer Information */}
          {selectedCustomer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informações do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Customer Info */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nome</p>
                  <p className="font-semibold">{selectedCustomer.name}</p>
                </div>

                {/* Company and Package Info */}
                {(selectedCustomer.company_name || selectedCustomer.package_name) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    {selectedCustomer.company_name && (
                      <div>
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          <span className="text-sm font-medium text-muted-foreground">Empresa</span>
                        </div>
                        <p className="font-semibold">{selectedCustomer.company_name}</p>
                      </div>
                    )}
                    {selectedCustomer.package_name && (
                      <div>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          <span className="text-sm font-medium text-muted-foreground">Pacote</span>
                        </div>
                        <p className="font-semibold">{selectedCustomer.package_name}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Vehicles */}
                {selectedCustomer.vehicles && selectedCustomer.vehicles.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="w-4 h-4" />
                      <span className="text-sm font-medium text-muted-foreground">Veículos</span>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedCustomer.vehicles.map((vehicle, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <p className="font-medium">{vehicle.brand} {vehicle.model}</p>
                             <p className="text-sm text-muted-foreground">
                               Ano: {vehicle.year} | Placa: {vehicle.plate}
                             </p>
                          </div>
                        ))}
                     </div>
                  </div>
                )}

                {/* Accessories */}
                {selectedCustomer.accessories && selectedCustomer.accessories.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4" />
                      <span className="text-sm font-medium text-muted-foreground">Acessórios</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedCustomer.accessories.map((accessory, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {accessory}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Accessories (previously modules) */}
                {selectedCustomer.modules && selectedCustomer.modules.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Cpu className="w-4 h-4" />
                      <span className="text-sm font-medium text-muted-foreground">Acessórios</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedCustomer.modules.map((module, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {module}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Customer Section - Only show if no customer is pre-selected */}
          {!initialCustomer && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Cliente</h3>
              
              <CustomerSelector
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
              />
            </div>
          )}

          {/* Warning message when no vehicles */}
          {selectedCustomer && (!selectedCustomer.vehicles || selectedCustomer.vehicles.length === 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-semibold">Cliente sem veículos cadastrados</span>
              </div>
              <p className="text-sm text-yellow-700 mt-2">
                Este cliente não possui veículos cadastrados. Por favor, edite o cliente e adicione veículos antes de criar um agendamento.
              </p>
            </div>
          )}

          {/* Vehicle Schedules */}
          {selectedCustomer && selectedCustomer.vehicles && selectedCustomer.vehicles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Detalhes da Instalação por Veículo</h3>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Contrato (Placa)</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Modelo</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Placa</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Ano</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Acessórios</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Acessórios</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Técnico *</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Data *</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Horário</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vehicleSchedules.map((vehicleSchedule, index) => {
                            const vehicleReady = homologationStatus.get(`vehicle-ready:${vehicleSchedule.plate}`);
                            return (
                            <tr key={vehicleSchedule.plate} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                              <td className="px-4 py-3">
                                {vehicleReady ? (
                                  <Badge className="bg-green-100 text-green-800 border-green-300">
                                    <Check className="w-3 h-3 mr-1" />
                                    Pronto
                                  </Badge>
                                ) : (
                                  <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                                    <X className="w-3 h-3 mr-1" />
                                    Pendente
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {vehicleSchedule.contract_number}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {vehicleSchedule.brand} {vehicleSchedule.model}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="secondary">{vehicleSchedule.plate}</Badge>
                              </td>
                              <td className="px-4 py-3 text-sm">{vehicleSchedule.year}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-1 max-w-[180px]">
                                  {vehicleSchedule.accessories.length > 0 ? (
                                    vehicleSchedule.accessories.map((acc, i) => {
                                      const isHomologated = homologationStatus.get(`${acc}:accessory`);
                                      return (
                                        <div key={i} className="flex items-center gap-1">
                                          {isHomologated ? (
                                            <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                                          ) : (
                                            <X className="h-3 w-3 text-red-600 flex-shrink-0" />
                                          )}
                                          <span className={cn(
                                            "text-xs",
                                            isHomologated ? "text-green-700" : "text-red-700"
                                          )}>
                                            {acc}
                                          </span>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-1 max-w-[180px]">
                                  {vehicleSchedule.modules.length > 0 ? (
                                    vehicleSchedule.modules.map((mod, i) => {
                                      const isHomologated = homologationStatus.get(`${mod}:equipment`);
                                      return (
                                        <div key={i} className="flex items-center gap-1">
                                          {isHomologated ? (
                                            <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                                          ) : (
                                            <X className="h-3 w-3 text-red-600 flex-shrink-0" />
                                          )}
                                          <span className={cn(
                                            "text-xs",
                                            isHomologated ? "text-green-700" : "text-red-700"
                                          )}>
                                            {mod}
                                          </span>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Select 
                                  value={vehicleSchedule.technician_ids[0] || ''} 
                                  onValueChange={(value) => updateVehicleSchedule(vehicleSchedule.plate, 'technician_ids', [value])}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Selecionar" />
                                  </SelectTrigger>
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
                              </td>
                              <td className="px-4 py-3">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-[140px] pl-3 text-left font-normal",
                                        !vehicleSchedule.scheduled_date && "text-muted-foreground"
                                      )}
                                    >
                                      {vehicleSchedule.scheduled_date ? (
                                        format(vehicleSchedule.scheduled_date, "dd/MM/yyyy")
                                      ) : (
                                        <span>Selecionar</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={vehicleSchedule.scheduled_date || undefined}
                                      onSelect={(date) => updateVehicleSchedule(vehicleSchedule.plate, 'scheduled_date', date)}
                                      disabled={(date) => date < new Date()}
                                      initialFocus
                                      className="pointer-events-auto"
                                    />
                                  </PopoverContent>
                                </Popover>
                              </td>
                              <td className="px-4 py-3">
                                <Select 
                                  value={vehicleSchedule.installation_time} 
                                  onValueChange={(value) => updateVehicleSchedule(vehicleSchedule.plate, 'installation_time', value)}
                                >
                                  <SelectTrigger className="w-[100px]">
                                    <SelectValue placeholder="--:--" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeSlots.map((time) => (
                                      <SelectItem key={time} value={time}>
                                        {time}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                            </tr>
                          );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="sticky bottom-0 bg-background pt-4 border-t px-6 pb-6 -mx-6">
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={handleClose}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Criando Agendamentos..." : "Criar Agendamentos"}
                      </Button>
                    </DialogFooter>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};