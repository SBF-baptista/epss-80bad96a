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
import { ScheduleHistoryModal } from './ScheduleHistoryModal';
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
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
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

  const handleViewHistory = (customer: Customer) => {
    console.log('Viewing history for customer:', customer.id, customer.name);
    setSelectedCustomer(customer);
    setIsHistoryModalOpen(true);
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
    <div className="h-full space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground/70 font-medium">Total de Veículos</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                  {customers.reduce((acc, c) => acc + (c.vehicles?.length || 0), 0)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground/70 font-medium">Kits Homologados</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">
                  {getHomologatedKits().length}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-green-100">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground/70 font-medium">Aguardando Envio</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                  {schedules.filter(s => ['scheduled', 'in_progress'].includes(s.status)).length}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-100">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground/70 font-medium">Enviados para Esteira</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-600">
                  {schedules.filter(s => s.status === 'completed').length}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-100">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <div className="flex-1 overflow-hidden">
        <Card className="h-full border-border/50 shadow-sm">
          <CardHeader className="pb-4 border-b border-border/30">
            <CardTitle className="text-lg font-semibold text-foreground">
              {isCompletedView ? 'Veículos Enviados para Esteira' : 'Veículos'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 h-full overflow-auto max-h-[calc(100vh-420px)] scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-transparent">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-muted-foreground/60" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum veículo cadastrado'}
                </h3>
                <p className="text-sm text-muted-foreground/70 mb-5">
                  {searchTerm ? 'Tente ajustar os termos de busca.' : 'Nenhum veículo encontrado.'}
                </p>
                <Button onClick={loadCustomers} variant="outline" size="sm" className="h-9">
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
                    <Card key={customer.id} className="hover:shadow-lg transition-all duration-200 border-border/50 rounded-xl overflow-hidden group">
                      <CardContent className="p-4 sm:p-5">
                        <div className="space-y-4">
                          {/* Customer Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-foreground text-base leading-tight truncate">
                                {customer.name}
                              </h4>
                              <p className="text-sm text-foreground/70 mt-0.5">
                                {customer.document_type === 'cpf' ? 'CPF' : 'CNPJ'}: {customer.document_number}
                              </p>
                            </div>
                            {/* View History Button - Only in completed view */}
                            {isCompletedView && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewHistory(customer)}
                                className="h-8 w-8 p-0 hover:bg-muted/80 transition-colors flex-shrink-0"
                                title="Ver histórico"
                              >
                                <Eye className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            )}
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2.5 text-sm text-foreground/80">
                              <Phone className="w-3.5 h-3.5 text-muted-foreground/70 flex-shrink-0" />
                              <span>{customer.phone}</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-sm text-muted-foreground/70">
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
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

                          </div>

                          {/* Action Buttons - Only show in non-completed view */}
                          {!isCompletedView && (
                            <div className="space-y-2 pt-1">
                              {/* Check if vehicle has accessories before showing button */}
                              {!hasAccessories ? (
                                <div className="text-xs text-amber-700 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200/70">
                                  Veículo sem acessórios vinculados. Vincule acessórios para prosseguir.
                                </div>
                              ) : (() => {
                                const scheduledPlates = activeSchedules.map(s => s.vehicle_plate);
                                const hasUnscheduledVehicles = customer.vehicles?.some(v => !scheduledPlates.includes(v.plate));
                                
                                return hasUnscheduledVehicles || activeSchedules.length === 0 ? (
                                  <Button
                                    size="sm"
                                    onClick={() => handleScheduleCustomer(customer)}
                                    className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all"
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Iniciar planejamento
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

      {/* Schedule Modal - For new schedules */}
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

      {/* History Modal - For viewing completed schedules */}
      <ScheduleHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        schedules={schedules}
      />
    </div>
  );
};