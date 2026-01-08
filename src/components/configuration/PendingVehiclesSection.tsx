import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Car, Truck, Calendar, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PendingVehicleData } from './ScheduleFormModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PendingSchedule {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_plate: string | null;
  configuration: string | null;
  installation_address_street: string | null;
  installation_address_number: string | null;
  installation_address_neighborhood: string | null;
  installation_address_city: string | null;
  installation_address_state: string | null;
  installation_address_postal_code: string | null;
  installation_address_complement: string | null;
  kit_id: string | null;
  selected_kit_ids: string[] | null;
}

interface PendingVehiclesSectionProps {
  onScheduleVehicle: (vehicleData: PendingVehicleData) => void;
  hiddenKitScheduleIds?: string[];
}

export const PendingVehiclesSection = ({ onScheduleVehicle, hiddenKitScheduleIds = [] }: PendingVehiclesSectionProps) => {
  const [pendingSchedules, setPendingSchedules] = useState<PendingSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);

  // Filter out hidden schedules (already scheduled in this session)
  const visibleSchedules = pendingSchedules.filter(s => !hiddenKitScheduleIds.includes(s.id));

  const fetchPendingSchedules = async () => {
    setIsLoading(true);
    try {
      // Fetch kit_schedules with status "shipped" (Enviado no Kanban)
      const { data: schedules, error: schedulesError } = await supabase
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
          selected_kit_ids
        `)
        .eq('status', 'shipped');

      if (schedulesError) {
        console.error('Error fetching pending schedules:', schedulesError);
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

    // Subscribe to realtime updates on kit_schedules
    const channel = supabase
      .channel('pending-schedules-changes')
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

  const handleScheduleClick = (schedule: PendingSchedule) => {
    // Build address string
    const addressParts = [
      schedule.installation_address_street,
      schedule.installation_address_number,
      schedule.installation_address_neighborhood,
      schedule.installation_address_city,
      schedule.installation_address_state,
    ].filter(Boolean);
    
    const vehicleData: PendingVehicleData = {
      kitScheduleId: schedule.id, // Pass the kit_schedule id to update status later
      brand: schedule.vehicle_brand || undefined,
      model: schedule.vehicle_model || undefined,
      year: schedule.vehicle_year || undefined,
      plate: schedule.vehicle_plate || undefined,
      configuration: schedule.configuration || undefined,
      customerName: schedule.customer_name || undefined,
      customerPhone: schedule.customer_phone || undefined,
      customerAddress: addressParts.length > 0 ? addressParts.join(', ') : undefined,
    };

    onScheduleVehicle(vehicleData);
  };

  const getVehicleIcon = (brand: string | null) => {
    const brandLower = brand?.toLowerCase() || '';
    if (brandLower.includes('scania') || brandLower.includes('volvo') || brandLower.includes('mercedes')) {
      return <Truck className="h-4 w-4" />;
    }
    return <Car className="h-4 w-4" />;
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

  if (visibleSchedules.length === 0) {
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
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-6">
      <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-950/10 dark:border-orange-900/30">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-orange-100/50 dark:hover:bg-orange-900/20 transition-colors rounded-t-lg">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-500" />
                <span>Veículos Pendentes de Agendamento</span>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                  {visibleSchedules.length}
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
            <ScrollArea className="h-[280px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
                {visibleSchedules.map((schedule) => (
                  <Card 
                    key={schedule.id} 
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                      "bg-background"
                    )}
                    onClick={() => handleScheduleClick(schedule)}
                  >
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-foreground mb-1 truncate">
                        {schedule.customer_name || 'Cliente não informado'}
                      </p>
                      
                      <div className="flex items-center gap-2 mb-3">
                        {getVehicleIcon(schedule.vehicle_brand)}
                        <span className="text-sm text-muted-foreground truncate">
                          {schedule.vehicle_brand || ''} {schedule.vehicle_model || 'Veículo não informado'}
                        </span>
                      </div>
                      
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleScheduleClick(schedule);
                        }}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Agendar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
