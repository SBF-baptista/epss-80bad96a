import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, Calendar, User, Package, MapPin, FileText, Phone, Clock, Plus, Truck } from 'lucide-react';
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
  onRefresh: () => void;
  isCompletedView?: boolean;
}

export const SchedulingSection = ({
  kits,
  technicians,
  schedules,
  homologationStatuses,
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
  const [accessoriesByPlate, setAccessoriesByPlate] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    loadCustomers();
    loadAccessoriesCounts();
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [searchTerm]);

  // Load accessories counts by vehicle plate from accessories table (via incoming_vehicles)
  const loadAccessoriesCounts = async () => {
    try {
      // Get all accessories with their linked vehicle's plate
      const { data, error } = await supabase
        .from('accessories')
        .select('vehicle_id, incoming_vehicles!accessories_vehicle_id_fkey(plate)')
        .not('vehicle_id', 'is', null);

      if (error) {
        console.error('Error loading accessories counts:', error);
        return;
      }

      const counts = new Map<string, number>();
      data?.forEach((acc: any) => {
        const plate = acc.incoming_vehicles?.plate;
        if (plate) {
          // Normalize plate for comparison (uppercase and trimmed)
          const normalizedPlate = plate.trim().toUpperCase();
          const current = counts.get(normalizedPlate) || 0;
          counts.set(normalizedPlate, current + 1);
        }
      });
      console.log('Accessories counts by plate (normalized):', Object.fromEntries(counts));
      setAccessoriesByPlate(counts);
    } catch (error) {
      console.error('Error loading accessories counts:', error);
    }
  };

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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accessories'
        },
        (payload) => {
          console.log('Accessories changed:', payload);
          loadAccessoriesCounts();
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

  // Helper to check if a customer has at least one vehicle with accessories (by plate)
  const customerHasVehiclesWithAccessories = (customer: Customer) => {
    // Check if any of the customer's vehicles have accessories linked by plate
    if (!customer.vehicles || customer.vehicles.length === 0) return false;
    
    return customer.vehicles.some(vehicle => {
      if (!vehicle.plate) return false;
      const normalizedPlate = vehicle.plate.trim().toUpperCase();
      const count = accessoriesByPlate.get(normalizedPlate) || 0;
      return count > 0;
    });
  };

  // Get total accessory count for a customer's vehicles
  const getCustomerAccessoryCount = (customer: Customer) => {
    if (!customer.vehicles || customer.vehicles.length === 0) return 0;
    
    let total = 0;
    customer.vehicles.forEach(vehicle => {
      if (vehicle.plate) {
        const normalizedPlate = vehicle.plate.trim().toUpperCase();
        total += accessoriesByPlate.get(normalizedPlate) || 0;
      }
    });
    return total;
  };

  // Filter customers: for pending view, only show those with at least one vehicle with accessories
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.document_number.includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // For completed view, show all customers that match search
    if (isCompletedView) return true;
    
    // For pending view, only show customers with at least one vehicle with accessories
    return customerHasVehiclesWithAccessories(customer);
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

                  // Check if customer has accessories (from accessories table)
                  const hasAccessories = customerHasVehiclesWithAccessories(customer);
                  const accessoryCount = getCustomerAccessoryCount(customer);

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
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant={activeSchedules.length > 0 ? 'default' : 'outline'}>
                                {activeSchedules.length > 0 ? 'Ativo' : 'Disponível'}
                              </Badge>
                              {accessoryCount > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {accessoryCount} acessório(s)
                                </Badge>
                              )}
                            </div>
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
                            {/* Scheduled Vehicles with Details */}
                            {activeSchedules.length > 0 && (
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

                            {completedSchedules.length > 0 && (
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