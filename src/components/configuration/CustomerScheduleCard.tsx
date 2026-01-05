import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, Car, Calendar, Phone, MapPin, X } from 'lucide-react';

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
}

export const CustomerScheduleCard = ({ 
  customerGroup, 
  onScheduleVehicle,
  hiddenVehicleIds
}: CustomerScheduleCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Filter out hidden vehicles
  const visibleVehicles = customerGroup.vehicles.filter(v => !hiddenVehicleIds.includes(v.id));

  if (visibleVehicles.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 overflow-hidden">
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">
                {customerGroup.customerName}
              </CardTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                {customerGroup.customerPhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {customerGroup.customerPhone}
                  </span>
                )}
                {customerGroup.address && (
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3" />
                    {customerGroup.address}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {visibleVehicles.length} veículo{visibleVehicles.length !== 1 ? 's' : ''}
            </Badge>
            {!isOpen ? (
              <Button 
                size="sm" 
                onClick={() => setIsOpen(true)}
                className="gap-1"
              >
                <Calendar className="h-4 w-4" />
                Iniciar agendamento
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4 mr-1" />
                Fechar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <CardContent className="pt-0 px-0 pb-4">
            <ScrollArea className="w-full">
              <div className="min-w-[700px] px-4">
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
                            onClick={() => onScheduleVehicle(vehicle)}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Agendar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
