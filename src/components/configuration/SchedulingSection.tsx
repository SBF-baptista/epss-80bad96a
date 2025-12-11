import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, Calendar, User, Package, MapPin, FileText, Phone, Clock, Plus, Truck, Eye } from 'lucide-react';
import type { Technician } from '@/services/technicianService';
import type { HomologationKit } from '@/services/homologationKitService';
import type { KitScheduleWithDetails } from '@/services/kitScheduleService';
import type { HomologationStatus } from '@/services/kitHomologationService';
import type { Customer, VehicleInfo } from '@/services/customerService';
import { getCustomers } from '@/services/customerService';
import { ScheduleModal } from './ScheduleModal';
import { supabase } from '@/integrations/supabase/client';

interface SchedulingSectionProps {
  kits: HomologationKit[];
  technicians: Technician[];
  schedules: KitScheduleWithDetails[];
  homologationStatuses: Map<string, HomologationStatus>;
  accessoriesByPlate: Map<string, number>;
  onRefresh: () => void;
  isCompletedView?: boolean;
}

export const SchedulingSection = ({
  kits,
  technicians,
  schedules,
  homologationStatuses,
  accessoriesByPlate,
  onRefresh,
  isCompletedView = false
}: SchedulingSectionProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleInfo | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [searchTerm]);

  // Real-time subscription for customers table
  useEffect(() => {
    const channel = supabase
      .channel('planning-customers-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: 'show_in_planning=eq.true'
        },
        (payload) => {
          console.log('Customer changed in Planning:', payload);
          loadCustomers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const data = await getCustomers(searchTerm || undefined);
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar clientes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleCustomer = (customer: Customer, vehicle?: VehicleInfo) => {
    console.log('Scheduling for customer:', customer.id, customer.name);
    console.log('Selected vehicle:', vehicle);
    setSelectedCustomer(customer);
    setSelectedVehicle(vehicle || null);
    // Open directly without intermediate tab
    setIsScheduleModalOpen(true);
  };

  const getCustomerSchedules = (customerId: string) => {
    return schedules.filter(schedule => schedule.customer_id === customerId);
  };

  const getHomologatedKits = () => {
    return kits.filter(kit => {
      const status = homologationStatuses.get(kit.id!);
      return status?.isHomologated ?? false;
    });
  };

  // Helper to check if a vehicle has accessories (by plate)
  const vehicleHasAccessories = (plate: string | undefined) => {
    if (!plate) return false;
    const normalizedPlate = plate.trim().toUpperCase();
    return (accessoriesByPlate.get(normalizedPlate) || 0) > 0;
  };

  // Helper to check if a vehicle is scheduled (has active or completed schedule)
  const isVehicleScheduled = (plate: string | undefined, customerId: string) => {
    if (!plate) return false;
    const normalizedPlate = plate.trim().toUpperCase();
    return schedules.some(s => 
      s.customer_id === customerId && 
      s.vehicle_plate?.trim().toUpperCase() === normalizedPlate
    );
  };

  // Helper to check if a vehicle schedule is completed (sent to orders pipeline)
  const isVehicleCompleted = (plate: string | undefined, customerId: string) => {
    if (!plate) return false;
    const normalizedPlate = plate.trim().toUpperCase();
    return schedules.some(s => 
      s.customer_id === customerId && 
      s.vehicle_plate?.trim().toUpperCase() === normalizedPlate &&
      s.status === 'completed'
    );
  };

  // Check if customer has at least one vehicle with accessories that is NOT yet scheduled (for pending view)
  const customerHasPendingVehiclesWithAccessories = (customer: Customer) => {
    if (!customer.vehicles || customer.vehicles.length === 0) return false;
    
    return customer.vehicles.some(vehicle => {
      const hasAccessories = vehicleHasAccessories(vehicle.plate);
      const isScheduled = isVehicleScheduled(vehicle.plate, customer.id!);
      // For pending view: has accessories AND not scheduled yet
      return hasAccessories && !isScheduled;
    });
  };

  // Check if customer has at least one vehicle that has been scheduled/completed (for completed view)
  const customerHasScheduledVehicles = (customer: Customer) => {
    if (!customer.vehicles || customer.vehicles.length === 0) return false;
    
    return customer.vehicles.some(vehicle => {
      return isVehicleScheduled(vehicle.plate, customer.id!);
    });
  };

  // Get total accessory count for a customer's pending vehicles (not scheduled)
  const getCustomerPendingAccessoryCount = (customer: Customer) => {
    if (!customer.vehicles || customer.vehicles.length === 0) return 0;
    
    let total = 0;
    customer.vehicles.forEach(vehicle => {
      if (vehicle.plate && !isVehicleScheduled(vehicle.plate, customer.id!)) {
        const normalizedPlate = vehicle.plate.trim().toUpperCase();
        total += accessoriesByPlate.get(normalizedPlate) || 0;
      }
    });
    return total;
  };

  // Get total accessory count for a customer's scheduled vehicles
  const getCustomerScheduledAccessoryCount = (customer: Customer) => {
    if (!customer.vehicles || customer.vehicles.length === 0) return 0;
    
    let total = 0;
    customer.vehicles.forEach(vehicle => {
      if (vehicle.plate && isVehicleScheduled(vehicle.plate, customer.id!)) {
        const normalizedPlate = vehicle.plate.trim().toUpperCase();
        total += accessoriesByPlate.get(normalizedPlate) || 0;
      }
    });
    return total;
  };

  // Filter customers based on view type
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.document_number.includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (isCompletedView) {
      // For completed view: show customers that have at least one vehicle scheduled
      return customerHasScheduledVehicles(customer);
    }
    
    // For pending view: only show customers with at least one vehicle with accessories AND not scheduled
    return customerHasPendingVehiclesWithAccessories(customer);
  });

  return (
    <div className="h-full space-y-4">
      {/* Header - Only show search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nome, documento ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Veículos</p>
                <p className="text-2xl font-bold">{customers.reduce((acc, c) => acc + (c.vehicles?.length || 0), 0)}</p>
                <button 
                  onClick={loadCustomers}
                  className="text-xs text-blue-600 hover:underline mt-1"
                >
                  Atualizar
                </button>
              </div>
              <Truck className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kits Homologados</p>
                <p className="text-2xl font-bold">{getHomologatedKits().length}</p>
              </div>
              <Package className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aguardando Envio</p>
                <p className="text-2xl font-bold">
                  {schedules.filter(s => ['scheduled', 'in_progress'].includes(s.status)).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enviados para Esteira</p>
                <p className="text-2xl font-bold">
                  {schedules.filter(s => s.status === 'completed').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <div className="flex-1 overflow-hidden">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>{isCompletedView ? 'Veículos Enviados para Esteira' : 'Veículos'}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 h-full overflow-auto max-h-[calc(100vh-400px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum veículo cadastrado'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'Tente ajustar os termos de busca.' : 'Nenhum veículo encontrado.'}
                </p>
                <Button onClick={loadCustomers} variant="outline">
                  Recarregar
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-4">
                {filteredCustomers.map((customer) => {
                  const customerSchedules = getCustomerSchedules(customer.id!);
                  const activeSchedules = customerSchedules.filter(s => 
                    ['scheduled', 'in_progress'].includes(s.status)
                  );
                  const completedSchedules = customerSchedules.filter(s => 
                    s.status === 'completed'
                  );

                  // Check if customer has pending accessories (based on view type)
                  const hasAccessories = isCompletedView 
                    ? customerHasScheduledVehicles(customer) 
                    : customerHasPendingVehiclesWithAccessories(customer);
                  const accessoryCount = isCompletedView 
                    ? getCustomerScheduledAccessoryCount(customer) 
                    : getCustomerPendingAccessoryCount(customer);

                  return (
                    <Card key={customer.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Customer Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{customer.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {customer.document_type === 'cpf' ? 'CPF' : 'CNPJ'}: {customer.document_number}
                              </p>
                            </div>
                            {/* View Details Button - Only in completed view */}
                            {isCompletedView && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleScheduleCustomer(customer)}
                                className="h-8 w-8 p-0"
                                title="Ver detalhes"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3" />
                              <span>{customer.phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              <span>{customer.address_city} - {customer.address_state}</span>
                            </div>
                          </div>

                          {/* Schedules Info - Show scheduled vehicles and technicians */}
                          <div className="space-y-2">
                            {/* Scheduled Vehicles with Details - Only show in completed view */}
                            {isCompletedView && activeSchedules.length > 0 && (
                              <div className="space-y-2">
                                {activeSchedules.map((schedule) => (
                                  <div key={schedule.id} className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                                    <div className="flex items-center justify-between mb-2">
                                      <Badge className="bg-blue-600 text-white">
                                        Placa Agendada
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {new Date(schedule.scheduled_date).toLocaleDateString('pt-BR')}
                                        {schedule.installation_time && ` - ${schedule.installation_time}`}
                                      </Badge>
                                    </div>
                                    
                                    <div className="space-y-1 text-xs">
                                      <div className="flex items-center gap-2 text-blue-900 font-semibold">
                                        <Truck className="w-3 h-3" />
                                        <span>Placa: {schedule.vehicle_plate}</span>
                                      </div>
                                      <div className="text-blue-800">
                                        {schedule.vehicle_brand} {schedule.vehicle_model} ({schedule.vehicle_year})
                                      </div>
                                      <div className="flex items-center gap-2 text-blue-700">
                                        <User className="w-3 h-3" />
                                        <span>Técnico: {schedule.technician.name}</span>
                                      </div>
                                      {schedule.notes && (
                                        <div className="flex items-start gap-2 text-blue-700 mt-2 pt-2 border-t border-blue-200">
                                          <FileText className="w-3 h-3 mt-0.5" />
                                          <span className="flex-1">{schedule.notes}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {isCompletedView && completedSchedules.length > 0 && (
                              <div className="bg-green-50 border border-green-200 p-2 rounded-md">
                                <p className="text-xs font-semibold text-green-800">
                                  {completedSchedules.length} veículo(s) enviado(s) para esteira
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons - Only show in non-completed view */}
                          {!isCompletedView && (
                            <div className="space-y-2">
                              {/* Check if vehicle has accessories before showing button */}
                              {!hasAccessories ? (
                                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                                  Veículo sem acessórios vinculados. Vincule acessórios para prosseguir.
                                </div>
                              ) : (() => {
                                const scheduledPlates = activeSchedules.map(s => s.vehicle_plate);
                                const hasUnscheduledVehicles = customer.vehicles?.some(v => !scheduledPlates.includes(v.plate));
                                
                                return hasUnscheduledVehicles || activeSchedules.length === 0 ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleScheduleCustomer(customer)}
                                    className="w-full"
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Enviar para esteira de pedidos
                                  </Button>
                                ) : null;
                              })()}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setSelectedCustomer(null);
          setSelectedVehicle(null);
        }}
        selectedCustomer={selectedCustomer}
        selectedVehicle={selectedVehicle}
        kits={getHomologatedKits()}
        technicians={technicians}
        homologationStatuses={homologationStatuses}
        existingSchedules={schedules}
        onSuccess={() => {
          onRefresh();
          setIsScheduleModalOpen(false);
          setSelectedCustomer(null);
          setSelectedVehicle(null);
          loadCustomers();
        }}
      />
    </div>
  );
};