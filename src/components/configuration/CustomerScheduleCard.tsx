import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Car, Calendar, Users } from 'lucide-react';

export interface VehicleScheduleData {
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
  accessories?: string[] | null;
  supplies?: string[] | null;
  technician_id?: string | null;
  scheduled_date?: string | null;
  installation_time?: string | null;
  incoming_vehicle_id?: string | null;
}

interface CustomerGroup {
  customerName: string;
  customerPhone: string | null;
  address: string;
  vehicles: VehicleScheduleData[];
}

interface CustomerScheduleCardProps {
  customerGroup: CustomerGroup;
  onScheduleVehicle: (vehicle: VehicleScheduleData) => void;
  hiddenVehicleIds: string[];
  isModalOpen: boolean;
  onModalOpenChange: (open: boolean) => void;
}

export const CustomerScheduleCard = ({ 
  customerGroup, 
  onScheduleVehicle,
  hiddenVehicleIds,
  isModalOpen,
  onModalOpenChange
}: CustomerScheduleCardProps) => {

  // Filter out hidden vehicles
  const visibleVehicles = customerGroup.vehicles.filter(v => !hiddenVehicleIds.includes(v.id));

  if (visibleVehicles.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-primary/20 overflow-hidden">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base truncate">
                {customerGroup.customerName}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {visibleVehicles.length} veículo{visibleVehicles.length !== 1 ? 's' : ''}
              </Badge>
              <Button 
                size="sm" 
                onClick={() => onModalOpenChange(true)}
                className="gap-1"
              >
                <Calendar className="h-4 w-4" />
                Iniciar agendamento
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={onModalOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Veículos de {customerGroup.customerName}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(85vh-120px)]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[200px]">Veículo</TableHead>
                  <TableHead className="w-[100px]">Placa</TableHead>
                  <TableHead className="w-[100px]">Ano</TableHead>
                  <TableHead className="w-[150px]">Configuração</TableHead>
                  <TableHead className="w-[150px] text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-sm">
                          {vehicle.vehicle_brand} {vehicle.vehicle_model}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {vehicle.vehicle_plate || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {vehicle.vehicle_year || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-purple-600 font-medium">
                        {vehicle.configuration || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          onScheduleVehicle(vehicle);
                        }}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Agendar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
