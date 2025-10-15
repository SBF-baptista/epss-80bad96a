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
import { createHomologationKit, type HomologationKit } from '@/services/homologationKitService';
import type { Customer, VehicleInfo } from '@/services/customerService';
import { createKitSchedule, checkScheduleConflict } from '@/services/kitScheduleService';
import { checkItemHomologation, type HomologationStatus } from '@/services/kitHomologationService';
import { CustomerSelector } from '@/components/customers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAccessoriesByVehicleIds, aggregateAccessoriesWithoutModules, isModuleCategory } from '@/services/vehicleAccessoryService';
import { getIncomingVehiclesBySaleSummary, resolveIncomingVehicleId } from '@/services/incomingVehiclesService';
import { supabase } from '@/integrations/supabase/client';

// Helper to normalize item names (remove quantity suffix, trim, uppercase)
const normalizeName = (name: string): string => {
  return name.replace(/\s*\(\d+x\)\s*$/i, '').trim().toUpperCase();
};

// Lista conhecida de módulos (não são acessórios físicos)
const KNOWN_MODULES = [
  'GESTÃO AGRÍCOLA',
  'GESTÃO DE ENTREGAS E SERVIÇOS - DMS',
  'GESTÃO DE PASSAGEIROS - FRETAMENTO',
  'GESTÃO DE VIAGENS',
  'RANKING DE CONDUTOR - GAMIFICAÇÃO'
];

// Helper para identificar se um item é um módulo
const isModule = (itemName: string): boolean => {
  const normalized = normalizeName(itemName);
  return KNOWN_MODULES.includes(normalized);
};

// Helper to extract quantity from formatted name like "ITEM (3x)"
const extractQuantity = (formatted: string): number => {
  const match = formatted.match(/\((\d+)x\)$/i);
  return match ? parseInt(match[1], 10) : 1;
};

interface VehicleScheduleData {
  plate: string;
  brand: string;
  model: string;
  year: number;
  technician_ids: string[];
  scheduled_date: Date | null;
  installation_time: string;
  notes: string;
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
  existingSchedules?: any[];
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
  existingSchedules = [],
  onSuccess
}: ScheduleModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialCustomer || null);
  const [vehicleSchedules, setVehicleSchedules] = useState<VehicleScheduleData[]>([]);
  const [homologationStatus, setHomologationStatus] = useState<Map<string, boolean>>(new Map());
  const [scheduleConflicts, setScheduleConflicts] = useState<Map<string, string>>(new Map());
  const [accessoriesByVehicleId, setAccessoriesByVehicleId] = useState<Map<string, string[]>>(new Map());
  const [vehicleIdMap, setVehicleIdMap] = useState<Map<string, string>>(new Map());

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

    if (!selectedCustomer) {
      setVehicleSchedules([]);
      form.reset({ vehicles: [] });
      return;
    }

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

    // Filter out vehicles that already have active schedules
    const scheduledPlates = existingSchedules
      .filter(s => s.customer_id === selectedCustomer.id && ['scheduled', 'in_progress'].includes(s.status))
      .map(s => s.vehicle_plate);
    
    const unscheduledVehicles = selectedCustomer.vehicles.filter(
      vehicle => !scheduledPlates.includes(vehicle.plate)
    );

    console.log('Scheduled plates:', scheduledPlates);
    console.log('Unscheduled vehicles:', unscheduledVehicles);

    if (unscheduledVehicles.length === 0) {
      toast({
        title: "Aviso",
        description: "Todos os veículos deste cliente já possuem agendamentos ativos.",
        variant: "default"
      });
      setVehicleSchedules([]);
      form.reset({ vehicles: [] });
      return;
    }

    // Initialize schedules with EMPTY dates - manual input required
    const initialSchedules = unscheduledVehicles.map((vehicle, index) => ({
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      technician_ids: [],
      scheduled_date: null,
      installation_time: '',
      notes: `Veículo: ${vehicle.brand} ${vehicle.model} (${vehicle.year}) - Placa: ${vehicle.plate}`,
      // Per-placa accessories from customer (módulos não são considerados)
      accessories: [...(selectedCustomer.accessories || [])],
      modules: [] // Módulos não são mais utilizados
    }));

    console.log('Initial schedules created:', initialSchedules);
    setVehicleSchedules(initialSchedules);
    form.reset({ vehicles: initialSchedules });

    // ID-first: Resolve incoming_vehicle_id for each vehicle and fetch accessories
    if (selectedCustomer) {
      (async () => {
        try {
          const vehicleIdMapping = new Map<string, string>();
          const resolvedIds: string[] = [];

          for (const v of unscheduledVehicles) {
            const vehicleId = await resolveIncomingVehicleId(
              selectedCustomer.company_name,
              selectedCustomer.sale_summary_id,
              {
                plate: v.plate,
                brand: v.brand,
                model: v.model,
                year: v.year
              }
            );

            if (vehicleId) {
              const key = `${v.brand}-${v.model}-${v.plate || 'pending'}`;
              vehicleIdMapping.set(key, vehicleId);
              resolvedIds.push(vehicleId);
            }
          }

          setVehicleIdMap(vehicleIdMapping);

          // Fetch accessories by resolved IDs
          if (resolvedIds.length > 0) {
            const accessoriesMap = await fetchAccessoriesByVehicleIds(resolvedIds);
            const formattedMap = new Map<string, string[]>();

            accessoriesMap.forEach((accessories, vehicleId) => {
              formattedMap.set(vehicleId, aggregateAccessoriesWithoutModules(accessories));
            });

            setAccessoriesByVehicleId(formattedMap);

            // Update vehicle schedules with accessories
            setVehicleSchedules(prev => {
              const updated = prev.map(s => {
                const key = `${s.brand}-${s.model}-${s.plate || 'pending'}`;
                const vehicleId = vehicleIdMapping.get(key);
                if (vehicleId) {
                  const accessories = formattedMap.get(vehicleId) || [];
                  return { ...s, accessories };
                }
                return s;
              });
              form.setValue('vehicles', updated);
              return updated;
            });
          }
        } catch (error) {
          console.error('Error loading accessories by vehicle IDs:', error);
        }
      })();
    }

    // 2) Fire-and-forget: check homologation in background and update icons
    (async () => {
      try {
        const statusMap = new Map<string, boolean>();
        
        // Check accessories from customer (módulos não são mais considerados)
        const allItems = [
          ...(selectedCustomer.accessories || []).map(name => ({ name, type: 'accessory' }))
        ];
        
        await Promise.all(
          allItems.map(async (item) => {
            const normalizedName = normalizeName(item.name);
            const ok = await checkItemHomologation(normalizedName, item.type);
            statusMap.set(`${normalizedName}:${item.type}`, ok);
          })
        );
        
        // Check overall homologation status for each unscheduled vehicle
        const scheduledPlates = existingSchedules
          .filter(s => s.customer_id === selectedCustomer.id && ['scheduled', 'in_progress'].includes(s.status))
          .map(s => s.vehicle_plate);
        
        const unscheduledVehicles = selectedCustomer.vehicles?.filter(
          vehicle => !scheduledPlates.includes(vehicle.plate)
        ) || [];
        
        // Check vehicle-specific accessories from the accessories table
        for (const vehicle of unscheduledVehicles) {
          // Resolve incoming_vehicle_id
          const vehicleId = await resolveIncomingVehicleId(
            selectedCustomer.company_name,
            selectedCustomer.sale_summary_id,
            {
              plate: vehicle.plate,
              brand: vehicle.brand,
              model: vehicle.model,
              year: vehicle.year
            }
          );

          // Fetch vehicle-specific accessories from accessories table (excluindo módulos)
          let vehicleSpecificAccessories: string[] = [];
          if (vehicleId) {
            const { data: vehicleAccessories } = await supabase
              .from('accessories')
              .select('name, categories')
              .eq('vehicle_id', vehicleId);

            // Filtrar módulos usando categories E nome conhecido
            vehicleSpecificAccessories = (vehicleAccessories || [])
              .filter(a => !isModuleCategory(a.categories) && !isModule(a.name))
              .map(a => a.name);

            // Check homologation for vehicle-specific accessories (normalized)
            await Promise.all(
              vehicleSpecificAccessories.map(async (accName) => {
                const normalizedName = normalizeName(accName);
                const ok = await checkItemHomologation(normalizedName, 'accessory');
                statusMap.set(`${normalizedName}:accessory`, ok);
              })
            );
          }

          // Combine customer and vehicle-specific accessories (normalized for checking)
          // Filtrar módulos dos acessórios do cliente
          const customerAccessoriesFiltered = (selectedCustomer.accessories || [])
            .filter(acc => !isModule(acc))
            .map(normalizeName);
          
          const vehicleAccessories = [
            ...customerAccessoriesFiltered, 
            ...vehicleSpecificAccessories.map(normalizeName)
          ];
          
          // Se não há acessórios, considera pronto
          const allAccessoriesHomologated = vehicleAccessories.length === 0 ? true : 
            vehicleAccessories.every(acc => {
              const status = statusMap.get(`${acc}:accessory`);
              // Se ainda não foi verificado (undefined), considera não pronto
              return status === true;
            });
          
          console.log('🔍 Vehicle homologation check:', {
            plate: vehicle.plate,
            vehicleAccessories,
            statusMapEntries: Array.from(statusMap.entries()),
            allAccessoriesHomologated
          });
          
          const vehicleReady = allAccessoriesHomologated;
          statusMap.set(`vehicle-ready:${vehicle.plate}`, vehicleReady);
        }
        
        setHomologationStatus(statusMap);
      } catch (e) {
        console.warn('Falha ao checar homologação de itens:', e);
      }
    })();
  }, [selectedCustomer, homologationStatuses, form, toast]);

  const updateVehicleSchedule = async (plate: string, field: keyof VehicleScheduleData, value: any) => {
    const updatedSchedules = vehicleSchedules.map(schedule => 
      schedule.plate === plate ? { ...schedule, [field]: value } : schedule
    );
    setVehicleSchedules(updatedSchedules);
    form.setValue('vehicles', updatedSchedules);

    // Check for conflicts when technician, date or time changes
    if (field === 'technician_ids' || field === 'scheduled_date' || field === 'installation_time') {
      const schedule = updatedSchedules.find(s => s.plate === plate);
      if (schedule && schedule.technician_ids.length > 0 && schedule.scheduled_date) {
        await checkVehicleConflicts(schedule);
      }
    }
  };

  const checkVehicleConflicts = async (schedule: VehicleScheduleData) => {
    const conflictKey = schedule.plate;
    
    if (schedule.technician_ids.length === 0 || !schedule.scheduled_date) {
      setScheduleConflicts(prev => {
        const newMap = new Map(prev);
        newMap.delete(conflictKey);
        return newMap;
      });
      return;
    }

    for (const technicianId of schedule.technician_ids) {
      const hasConflict = await checkScheduleConflict(
        technicianId,
        schedule.scheduled_date.toISOString().split('T')[0],
        schedule.installation_time || undefined
      );

      if (hasConflict) {
        const technician = technicians.find(t => t.id === technicianId);
        const conflictMsg = `⚠️ ${technician?.name || 'Este técnico'} já possui uma instalação agendada neste horário`;
        
        setScheduleConflicts(prev => {
          const newMap = new Map(prev);
          newMap.set(conflictKey, conflictMsg);
          return newMap;
        });
        return;
      }
    }

    // No conflicts found
    setScheduleConflicts(prev => {
      const newMap = new Map(prev);
      newMap.delete(conflictKey);
      return newMap;
    });
  };


  // Check if button should be enabled
  const isButtonEnabled = () => {
    // Must have at least one vehicle ready for scheduling with all required fields
    const hasReadyVehicle = vehicleSchedules.some(vehicle => {
      const vehicleReady = homologationStatus.get(`vehicle-ready:${vehicle.plate}`);
      return vehicleReady && vehicle.scheduled_date && vehicle.technician_ids.length > 0;
    });
    
    return hasReadyVehicle;
  };

  const onSubmit = async () => {
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

      // Kit is now optional - use first available if exists, otherwise null
      const selectedKit: HomologationKit | null = kits.length > 0 ? kits[0] : null;

      let schedulesCreated = 0;
      let schedulesSkipped = 0;
      const skippedVehicles: string[] = [];

      // Check for any remaining conflicts before submitting
      const conflictingPlates: string[] = [];
      for (const vehicleSchedule of vehicleSchedules) {
        if (scheduleConflicts.has(vehicleSchedule.plate)) {
          conflictingPlates.push(vehicleSchedule.plate);
        }
      }

      if (conflictingPlates.length > 0) {
        toast({
          title: "Conflito de horário detectado",
          description: `Por favor, resolva os conflitos de horário para: ${conflictingPlates.join(', ')}. Escolha outro horário ou técnico.`,
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Process each vehicle schedule
      for (const vehicleSchedule of vehicleSchedules) {
        // Check if this vehicle is ready for scheduling (all items homologated)
        const vehicleReady = homologationStatus.get(`vehicle-ready:${vehicleSchedule.plate}`);
        
        // Skip vehicles that are not ready or don't have required data
        if (!vehicleReady || !vehicleSchedule.scheduled_date || vehicleSchedule.technician_ids.length === 0) {
          if (!vehicleReady) {
            schedulesSkipped++;
            skippedVehicles.push(vehicleSchedule.plate);
            console.log(`Skipping vehicle ${vehicleSchedule.plate} - not all items are homologated`);
          }
          continue;
        }

        // Create schedule for each technician
        for (const technicianId of vehicleSchedule.technician_ids) {
          // Resolve incoming_vehicle_id for this vehicle
          const vehicleKey = `${vehicleSchedule.brand}-${vehicleSchedule.model}-${vehicleSchedule.plate || 'pending'}`;
          const incomingVehicleId = vehicleIdMap.get(vehicleKey);

          await createKitSchedule({
            kit_id: selectedKit?.id || null,
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
            vehicle_year: vehicleSchedule.year,
            incoming_vehicle_id: incomingVehicleId || undefined,
            // Persist per-placa items (módulos não são mais salvos)
            accessories: vehicleSchedule.accessories || [],
            supplies: [] // Não salvar módulos
          });
          schedulesCreated++;
        }
      }

      // Show result toast
      if (schedulesCreated > 0 && schedulesSkipped > 0) {
        toast({
          title: "Agendamentos criados parcialmente",
          description: `${schedulesCreated} agendamento(s) criado(s) com sucesso. ${schedulesSkipped} veículo(s) ignorado(s) por falta de homologação: ${skippedVehicles.join(', ')}.`,
          variant: "default"
        });
      } else if (schedulesCreated > 0) {
        toast({
          title: "Agendamentos criados",
          description: `${schedulesCreated} agendamento(s) criado(s) com sucesso para ${selectedCustomer.name}.`
        });
      } else if (schedulesSkipped > 0) {
        toast({
          title: "Nenhum agendamento criado",
          description: `Todos os ${schedulesSkipped} veículo(s) estão aguardando homologação de acessórios/insumos: ${skippedVehicles.join(', ')}.`,
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      if (schedulesCreated === 0) {
        toast({
          title: "Nenhum agendamento criado",
          description: "Preencha pelo menos uma data e técnico para os veículos prontos para criar o agendamento.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

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
    setVehicleSchedules([]);
    setHomologationStatus(new Map());
    setScheduleConflicts(new Map());
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

                {/* Insumos */}
                {selectedCustomer.modules && selectedCustomer.modules.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4" />
                      <span className="text-sm font-medium text-muted-foreground">Insumos</span>
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

          {/* Customer Section - Show when no customer is selected */}
          {!selectedCustomer && (
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
              
              <div className="space-y-6">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Modelo</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Placa</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Ano</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Acessórios</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Técnico *</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Data *</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Horário</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vehicleSchedules.map((vehicleSchedule, index) => {
                            const vehicleReady = homologationStatus.get(`vehicle-ready:${vehicleSchedule.plate}`);
                            const hasConflict = scheduleConflicts.has(vehicleSchedule.plate);
                            return (
                            <>
                            <tr key={vehicleSchedule.plate} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                              <td className="px-4 py-3">
                                {hasConflict ? (
                                  <Badge className="bg-red-100 text-red-800 border-red-300">
                                    <X className="w-3 h-3 mr-1" />
                                    Conflito
                                  </Badge>
                                ) : vehicleReady ? (
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
                              <td className="px-4 py-3 text-sm">
                                {vehicleSchedule.brand} {vehicleSchedule.model}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="secondary">{vehicleSchedule.plate}</Badge>
                              </td>
                              <td className="px-4 py-3 text-sm">{vehicleSchedule.year}</td>
              <td className="px-4 py-3">
                                <div className="flex flex-col gap-1 max-w-[180px]">
                                  {(() => {
                                    const key = `${vehicleSchedule.brand}-${vehicleSchedule.model}-${vehicleSchedule.plate || 'pending'}`;
                                    const vehicleId = vehicleIdMap.get(key);
                                    const formattedAccessories = vehicleId ? accessoriesByVehicleId.get(vehicleId) || [] : [];
                                    
                                    if (formattedAccessories.length > 0) {
                                      return formattedAccessories.map((formatted, i) => {
                                        const normalizedName = normalizeName(formatted);
                                        const isHomologated = homologationStatus.get(`${normalizedName}:accessory`);
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
                                              {formatted}
                                            </span>
                                          </div>
                                        );
                                      });
                                    } else if (vehicleSchedule.accessories && vehicleSchedule.accessories.length > 0) {
                                      return vehicleSchedule.accessories.map((acc, i) => {
                                        const normalizedName = normalizeName(acc);
                                        const isHomologated = homologationStatus.get(`${normalizedName}:accessory`);
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
                                      });
                                    } else {
                                      return <span className="text-xs text-muted-foreground">-</span>;
                                    }
                                  })()}
                                 </div>
                               </td>
                               <td className="px-4 py-3">
                                 <div className="space-y-1">
                                   <Select 
                                     value={vehicleSchedule.technician_ids[0] || ''} 
                                     onValueChange={(value) => updateVehicleSchedule(vehicleSchedule.plate, 'technician_ids', [value])}
                                     disabled={!vehicleReady}
                                   >
                                     <SelectTrigger className={cn(
                                       "w-[180px]",
                                       hasConflict && "border-red-500"
                                     )}>
                                       <SelectValue placeholder={vehicleReady ? "Selecionar" : "Aguardando homologação"} />
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
                                   {hasConflict && (
                                     <p className="text-xs text-red-600 font-medium">
                                       {scheduleConflicts.get(vehicleSchedule.plate)}
                                     </p>
                                   )}
                                 </div>
                               </td>
                               <td className="px-4 py-3">
                                 <Popover>
                                   <PopoverTrigger asChild>
                                     <Button
                                       variant="outline"
                                       disabled={!vehicleReady}
                                       className={cn(
                                         "w-[140px] pl-3 text-left font-normal",
                                         !vehicleSchedule.scheduled_date && "text-muted-foreground"
                                       )}
                                     >
                                       {vehicleSchedule.scheduled_date ? (
                                         format(vehicleSchedule.scheduled_date, "dd/MM/yyyy")
                                       ) : (
                                         <span>{vehicleReady ? "Selecionar" : "Aguardando"}</span>
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
                                   disabled={!vehicleReady}
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
                              {!vehicleReady && (
                                <tr>
                                  <td colSpan={10} className="px-4 py-2">
                                    {(() => {
                                      const vehicleKey = `${vehicleSchedule.brand}-${vehicleSchedule.model}-${vehicleSchedule.plate || 'pending'}`;
                                      const vehicleId = vehicleIdMap.get(vehicleKey);
                                      const vehicleAccessories = vehicleId ? accessoriesByVehicleId.get(vehicleId) || [] : [];
                                      
                                      // Use Map to aggregate quantities by normalized name
                                      const nonHomologatedMap = new Map<string, number>();

                                      // Process vehicle-specific accessories (from accessories table)
                                      vehicleAccessories.forEach(formatted => {
                                        const normalizedName = normalizeName(formatted);
                                        const quantity = extractQuantity(formatted);
                                        const isHomologated = homologationStatus.get(`${normalizedName}:accessory`);
                                        
                                        if (!isHomologated) {
                                          const currentQty = nonHomologatedMap.get(normalizedName) || 0;
                                          nonHomologatedMap.set(normalizedName, currentQty + quantity);
                                        }
                                      });

                                      // Process customer accessories (only if not already in map from vehicle)
                                      (vehicleSchedule.accessories || []).forEach(acc => {
                                        const normalizedName = normalizeName(acc);
                                        const isHomologated = homologationStatus.get(`${normalizedName}:accessory`);
                                        
                                        if (!isHomologated && !nonHomologatedMap.has(normalizedName)) {
                                          nonHomologatedMap.set(normalizedName, 1);
                                        }
                                      });

                                      // Process modules (equipment)
                                      (vehicleSchedule.modules || []).forEach(mod => {
                                        const normalizedName = normalizeName(mod);
                                        const isHomologated = homologationStatus.get(`${normalizedName}:equipment`);
                                        
                                        if (!isHomologated && !nonHomologatedMap.has(normalizedName)) {
                                          nonHomologatedMap.set(normalizedName, 1);
                                        }
                                      });

                                      // Convert map to display array
                                      const nonHomologatedItems = Array.from(nonHomologatedMap.entries())
                                        .map(([name, qty]) => qty > 1 ? `${name} (${qty}x)` : name);

                                      if (nonHomologatedItems.length > 0) {
                                        return (
                                          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                            <p className="text-xs font-medium text-red-800 mb-2">
                                              ⚠️ Itens não homologados ({nonHomologatedItems.length}):
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                              {nonHomologatedItems.map(item => (
                                                <Badge key={item} variant="destructive" className="text-xs">
                                                  {item}
                                                </Badge>
                                              ))}
                                            </div>
                                            <p className="text-xs text-red-700 mt-2">
                                              Este veículo só poderá ser agendado após a homologação de todos os itens.
                                            </p>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </td>
                                </tr>
                               )}
                            </>
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
                      <Button 
                        type="button" 
                        onClick={onSubmit} 
                        disabled={isSubmitting || !isButtonEnabled()}
                      >
                        {isSubmitting ? "Criando Agendamentos..." : "Criar Agendamentos"}
                      </Button>
                    </DialogFooter>
                  </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};