import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Car, Truck, Calendar, Package, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PendingVehicleData } from './ScheduleFormModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PendingVehicle {
  id: string;
  numero_pedido: string;
  company_name: string | null;
  configuracao: string;
  shipment_address_street: string | null;
  shipment_address_number: string | null;
  shipment_address_neighborhood: string | null;
  shipment_address_city: string | null;
  shipment_address_state: string | null;
  shipment_address_postal_code: string | null;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_type: string | null;
  tracker_model: string;
}

interface PendingVehiclesSectionProps {
  onScheduleVehicle: (vehicleData: PendingVehicleData) => void;
}

export const PendingVehiclesSection = ({ onScheduleVehicle }: PendingVehiclesSectionProps) => {
  const [pendingVehicles, setPendingVehicles] = useState<PendingVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);

  const fetchPendingVehicles = async () => {
    setIsLoading(true);
    try {
      // Fetch orders with status "enviado"
      const { data: orders, error: ordersError } = await supabase
        .from('pedidos')
        .select(`
          id,
          numero_pedido,
          company_name,
          configuracao,
          shipment_address_street,
          shipment_address_number,
          shipment_address_neighborhood,
          shipment_address_city,
          shipment_address_state,
          shipment_address_postal_code
        `)
        .eq('status', 'enviado');

      if (ordersError) {
        console.error('Error fetching pending orders:', ordersError);
        return;
      }

      if (!orders || orders.length === 0) {
        setPendingVehicles([]);
        return;
      }

      // Fetch vehicles and trackers for each order
      const orderIds = orders.map(o => o.id);
      
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('veiculos')
        .select('pedido_id, marca, modelo, tipo')
        .in('pedido_id', orderIds);

      const { data: trackers, error: trackersError } = await supabase
        .from('rastreadores')
        .select('pedido_id, modelo')
        .in('pedido_id', orderIds);

      if (vehiclesError) console.error('Error fetching vehicles:', vehiclesError);
      if (trackersError) console.error('Error fetching trackers:', trackersError);

      // Create vehicle map
      const vehicleMap = new Map<string, { marca: string; modelo: string; tipo: string | null }>();
      vehicles?.forEach(v => {
        if (!vehicleMap.has(v.pedido_id)) {
          vehicleMap.set(v.pedido_id, { marca: v.marca, modelo: v.modelo, tipo: v.tipo });
        }
      });

      // Create tracker map
      const trackerMap = new Map<string, string>();
      trackers?.forEach(t => {
        if (!trackerMap.has(t.pedido_id)) {
          trackerMap.set(t.pedido_id, t.modelo);
        }
      });

      // Combine data
      const combinedData: PendingVehicle[] = orders.map(order => {
        const vehicle = vehicleMap.get(order.id);
        const tracker = trackerMap.get(order.id);
        
        return {
          id: order.id,
          numero_pedido: order.numero_pedido,
          company_name: order.company_name,
          configuracao: order.configuracao,
          shipment_address_street: order.shipment_address_street,
          shipment_address_number: order.shipment_address_number,
          shipment_address_neighborhood: order.shipment_address_neighborhood,
          shipment_address_city: order.shipment_address_city,
          shipment_address_state: order.shipment_address_state,
          shipment_address_postal_code: order.shipment_address_postal_code,
          vehicle_brand: vehicle?.marca || 'N/A',
          vehicle_model: vehicle?.modelo || 'N/A',
          vehicle_type: vehicle?.tipo || null,
          tracker_model: tracker || 'N/A',
        };
      });

      setPendingVehicles(combinedData);
    } catch (error) {
      console.error('Error in fetchPendingVehicles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingVehicles();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('pending-vehicles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => {
          fetchPendingVehicles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleScheduleClick = (vehicle: PendingVehicle) => {
    // Build address string
    const addressParts = [
      vehicle.shipment_address_street,
      vehicle.shipment_address_number,
      vehicle.shipment_address_neighborhood,
      vehicle.shipment_address_city,
      vehicle.shipment_address_state,
    ].filter(Boolean);
    
    const vehicleData: PendingVehicleData = {
      brand: vehicle.vehicle_brand,
      model: vehicle.vehicle_model,
      configuration: vehicle.configuracao,
      customerName: vehicle.company_name || undefined,
      customerAddress: addressParts.length > 0 ? addressParts.join(', ') : undefined,
    };

    onScheduleVehicle(vehicleData);
  };

  const getVehicleIcon = (type: string | null) => {
    if (type?.toLowerCase().includes('caminhão') || type?.toLowerCase().includes('truck')) {
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

  if (pendingVehicles.length === 0) {
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
                  {pendingVehicles.length}
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
            <ScrollArea className="max-h-[300px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingVehicles.map((vehicle) => (
                  <Card 
                    key={vehicle.id} 
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                      "bg-background"
                    )}
                    onClick={() => handleScheduleClick(vehicle)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getVehicleIcon(vehicle.vehicle_type)}
                          <span className="font-semibold text-sm">
                            {vehicle.vehicle_brand} {vehicle.vehicle_model}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {vehicle.numero_pedido}
                        </Badge>
                      </div>
                      
                      {vehicle.company_name && (
                        <p className="text-sm text-muted-foreground mb-2 truncate">
                          {vehicle.company_name}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <Badge variant="secondary" className="text-xs px-1.5">
                          {vehicle.configuracao}
                        </Badge>
                        <span>•</span>
                        <span>{vehicle.tracker_model}</span>
                      </div>
                      
                      {vehicle.shipment_address_city && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">
                            {vehicle.shipment_address_city}, {vehicle.shipment_address_state}
                          </span>
                        </div>
                      )}
                      
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleScheduleClick(vehicle);
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
