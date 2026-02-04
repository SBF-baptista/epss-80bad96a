import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Car, Calendar } from 'lucide-react';

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
      <Card className="border-border/50 overflow-hidden rounded-lg hover:border-primary/30 hover:shadow-md transition-all duration-200 group">
        <CardHeader className="py-3 px-4 bg-muted/10 group-hover:bg-muted/20 transition-colors">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm sm:text-base font-semibold text-foreground truncate flex-1">
              {customerGroup.customerName}
            </CardTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="secondary" className="bg-muted/60 text-muted-foreground font-medium text-xs px-2 py-0.5">
                {visibleVehicles.length} veículo{visibleVehicles.length !== 1 ? 's' : ''}
              </Badge>
              <Button 
                size="sm" 
                onClick={() => onModalOpenChange(true)}
                className="gap-1.5 h-8 bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Iniciar agendamento</span>
                <span className="sm:hidden">Agendar</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={onModalOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] rounded-xl">
          <DialogHeader className="pb-4 border-b border-border/50">
            <DialogTitle className="text-lg font-semibold">
              Veículos de {customerGroup.customerName}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(85vh-120px)]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="w-[200px] font-semibold text-xs uppercase tracking-wide text-muted-foreground/80">Veículo</TableHead>
                  <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wide text-muted-foreground/80">Placa</TableHead>
                  <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wide text-muted-foreground/80">Ano</TableHead>
                  <TableHead className="w-[150px] font-semibold text-xs uppercase tracking-wide text-muted-foreground/80">Configuração</TableHead>
                  <TableHead className="w-[150px] text-right font-semibold text-xs uppercase tracking-wide text-muted-foreground/80">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-muted/50 rounded">
                          <Car className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        </div>
                        <span className="font-medium text-sm text-foreground">
                          {vehicle.vehicle_brand} {vehicle.vehicle_model}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-medium border-border/60">
                        {vehicle.vehicle_plate || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground/80">
                        {vehicle.vehicle_year || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded">
                        {vehicle.configuration || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          onScheduleVehicle(vehicle);
                        }}
                        className="h-8 bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all gap-1.5"
                      >
                        <Calendar className="h-3.5 w-3.5" />
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
