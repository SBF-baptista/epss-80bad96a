import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { Package, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { CustomerScheduleCard, VehicleScheduleData } from './CustomerScheduleCard';
import { ScheduleFormModal, ScheduleFormData, PendingVehicleData } from './ScheduleFormModal';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CustomerGroup {
  customerName: string;
  customerPhone: string | null;
  address: string;
  vehicles: VehicleScheduleData[];
}

interface CustomerScheduleSectionProps {
  onScheduleSuccess: () => void;
}

export const CustomerScheduleSection = ({ onScheduleSuccess }: CustomerScheduleSectionProps) => {
  const [pendingSchedules, setPendingSchedules] = useState<VehicleScheduleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [hiddenVehicleIds, setHiddenVehicleIds] = useState<string[]>([]);
  
  // Modal state for schedule form
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleScheduleData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State to track which customer's vehicle table modal is open
  const [openCustomerModal, setOpenCustomerModal] = useState<string | null>(null);

  const fetchPendingSchedules = async () => {
    setIsLoading(true);
    try {
      const { data: schedules, error } = await supabase
        .from('kit_schedules')
        .select(`
          id,
          customer_name,
          customer_phone,
          vehicle_brand,
          vehicle_model,
          vehicle_year,
          vehicle_plate,
          configuration,
          installation_address_street,
          installation_address_number,
          installation_address_neighborhood,
          installation_address_city,
          installation_address_state,
          installation_address_postal_code,
          installation_address_complement,
          kit_id,
          selected_kit_ids,
          accessories,
          supplies,
          technician_id,
          scheduled_date,
          installation_time,
          incoming_vehicle_id
        `)
        .eq('status', 'shipped');

      if (error) {
        console.error('Error fetching pending schedules:', error);
        setPendingSchedules([]);
        return;
      }

      setPendingSchedules(schedules || []);
    } catch (error) {
      console.error('Error in fetchPendingSchedules:', error);
      setPendingSchedules([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingSchedules();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('customer-schedules-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kit_schedules' },
        () => {
          fetchPendingSchedules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Group vehicles by customer
  const customerGroups = useMemo((): CustomerGroup[] => {
    const groups: Record<string, CustomerGroup> = {};

    pendingSchedules
      .filter(s => !hiddenVehicleIds.includes(s.id))
      .forEach(schedule => {
        const customerName = schedule.customer_name || 'Cliente não identificado';
        
        if (!groups[customerName]) {
          const addressParts = [
            schedule.installation_address_street,
            schedule.installation_address_number,
            schedule.installation_address_neighborhood,
            schedule.installation_address_city,
            schedule.installation_address_state,
          ].filter(Boolean);

          groups[customerName] = {
            customerName,
            customerPhone: schedule.customer_phone,
            address: addressParts.join(', '),
            vehicles: [],
          };
        }

        groups[customerName].vehicles.push(schedule);
      });

    return Object.values(groups);
  }, [pendingSchedules, hiddenVehicleIds]);

  // Filter groups by search term
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return customerGroups;
    
    const term = searchTerm.toLowerCase();
    return customerGroups.filter(group => 
      group.customerName.toLowerCase().includes(term) ||
      group.vehicles.some(v => 
        v.vehicle_plate?.toLowerCase().includes(term) ||
        v.vehicle_model?.toLowerCase().includes(term) ||
        v.vehicle_brand?.toLowerCase().includes(term)
      )
    );
  }, [customerGroups, searchTerm]);

  const totalVehicles = filteredGroups.reduce((acc, g) => acc + g.vehicles.length, 0);

  const handleScheduleVehicle = (vehicle: VehicleScheduleData) => {
    setSelectedVehicle(vehicle);
    setOpenCustomerModal(null); // Close the vehicle table modal
    setIsFormModalOpen(true); // Open the form modal
  };

  const handleFormSubmit = async (data: ScheduleFormData & { date: Date }) => {
    if (!selectedVehicle) return;
    
    setIsSubmitting(true);
    try {
      const scheduleData = {
        scheduled_date: format(data.date, 'yyyy-MM-dd'),
        scheduled_time: data.time,
        technician_name: data.technician_name,
        technician_whatsapp: data.technician_whatsapp || '',
        customer: data.customer,
        address: data.address,
        plate: data.plate,
        service: data.service,
        vehicle_model: data.vehicle_model,
        tracker_model: data.tracker_model,
        scheduled_by: 'Sistema', // Auto-filled since field was removed
        reference_point: data.reference_point || null,
        phone: data.phone || null,
        local_contact: data.local_contact || null,
        observation: data.observation || null,
        kit_schedule_id: selectedVehicle.id,
      };

      // Insert schedule
      const { error: insertError } = await supabase
        .from('installation_schedules')
        .insert(scheduleData);

      if (insertError) {
        console.error('Error creating schedule:', insertError);
        toast.error('Erro ao criar agendamento');
        return;
      }

      // Immediately hide from UI
      setHiddenVehicleIds(prev => [...prev, selectedVehicle.id]);

      // Update kit_schedule status
      const { error: updateError } = await supabase
        .from('kit_schedules')
        .update({ status: 'scheduled' })
        .eq('id', selectedVehicle.id);

      if (updateError) {
        console.error('Error updating kit_schedule status:', updateError);
      }

      // WhatsApp notification removed - only sent via "Disparar Agenda" button

      toast.success('Agendamento criado com sucesso!');
      setIsFormModalOpen(false);
      setSelectedVehicle(null);
      onScheduleSuccess();
    } catch (error) {
      console.error('Error scheduling vehicle:', error);
      toast.error('Erro ao agendar veículo');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert selected vehicle to PendingVehicleData format for the modal
  const getInitialVehicleData = (): PendingVehicleData | null => {
    if (!selectedVehicle) return null;

    const addressParts = [
      selectedVehicle.installation_address_street,
      selectedVehicle.installation_address_number,
      selectedVehicle.installation_address_neighborhood,
      selectedVehicle.installation_address_city,
      selectedVehicle.installation_address_state,
    ].filter(Boolean);

    return {
      kitScheduleId: selectedVehicle.id,
      plate: selectedVehicle.vehicle_plate || undefined,
      brand: selectedVehicle.vehicle_brand || undefined,
      model: selectedVehicle.vehicle_model || undefined,
      year: selectedVehicle.vehicle_year || undefined,
      configuration: selectedVehicle.configuration || undefined,
      customerName: selectedVehicle.customer_name || undefined,
      customerPhone: selectedVehicle.customer_phone || undefined,
      customerAddress: addressParts.join(', ') || undefined,
      accessories: selectedVehicle.accessories || undefined,
      technicianId: selectedVehicle.technician_id || undefined,
      scheduledDate: selectedVehicle.scheduled_date || undefined,
      installationTime: selectedVehicle.installation_time || undefined,
      incomingVehicleId: selectedVehicle.incoming_vehicle_id || undefined,
    };
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-500" />
            Veículos Pendentes de Agendamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (customerGroups.length === 0) {
    return (
      <Card className="mb-6 border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
            <Package className="h-5 w-5" />
            Veículos Pendentes de Agendamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum veículo aguardando agendamento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-6">
        <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-950/10 dark:border-orange-900/30">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-orange-100/50 dark:hover:bg-orange-900/20 transition-colors rounded-t-lg">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-500" />
                  <span>Veículos Pendentes de Agendamento</span>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                    {customerGroups.length} cliente{customerGroups.length !== 1 ? 's' : ''} • {totalVehicles} veículo{totalVehicles !== 1 ? 's' : ''}
                  </Badge>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, placa ou veículo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Customer Cards */}
              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-4">
                  {filteredGroups.map((group) => (
                    <CustomerScheduleCard
                      key={group.customerName}
                      customerGroup={group}
                      onScheduleVehicle={handleScheduleVehicle}
                      hiddenVehicleIds={hiddenVehicleIds}
                      isModalOpen={openCustomerModal === group.customerName}
                      onModalOpenChange={(open) => setOpenCustomerModal(open ? group.customerName : null)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Schedule Form Modal */}
      <ScheduleFormModal
        open={isFormModalOpen}
        onOpenChange={(open) => {
          setIsFormModalOpen(open);
          if (!open) setSelectedVehicle(null);
        }}
        selectedDate={null}
        selectedTime={null}
        onSubmit={handleFormSubmit}
        isLoading={isSubmitting}
        initialVehicleData={getInitialVehicleData()}
      />
    </>
  );
};
