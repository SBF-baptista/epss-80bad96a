import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Building2, Car, ChevronDown, ChevronUp, Calendar as CalendarIcon, Phone, MapPin, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Technician } from '@/services/technicianService';
import { toast } from 'sonner';

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
}

interface VehicleFormData {
  date: Date | null;
  time: string;
  technician_id: string;
  technician_name: string;
  technician_whatsapp: string;
  service: string;
  scheduled_by: string;
  reference_point: string;
  phone: string;
  local_contact: string;
  observation: string;
}

interface CustomerGroup {
  customerName: string;
  customerPhone: string | null;
  address: string;
  vehicles: VehicleScheduleData[];
}

interface CustomerScheduleCardProps {
  customerGroup: CustomerGroup;
  technicians: Technician[];
  onScheduleVehicles: (vehicles: Array<{ 
    vehicle: VehicleScheduleData; 
    formData: VehicleFormData 
  }>) => Promise<void>;
  hiddenVehicleIds: string[];
}

export const CustomerScheduleCard = ({ 
  customerGroup, 
  technicians, 
  onScheduleVehicles,
  hiddenVehicleIds
}: CustomerScheduleCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleForms, setVehicleForms] = useState<Record<string, VehicleFormData>>({});

  // Filter out hidden vehicles
  const visibleVehicles = customerGroup.vehicles.filter(v => !hiddenVehicleIds.includes(v.id));

  if (visibleVehicles.length === 0) {
    return null;
  }

  const initializeForm = (vehicleId: string): VehicleFormData => ({
    date: null,
    time: '',
    technician_id: '',
    technician_name: '',
    technician_whatsapp: '',
    service: 'Instalação',
    scheduled_by: '',
    reference_point: '',
    phone: customerGroup.customerPhone || '',
    local_contact: '',
    observation: '',
  });

  const getFormData = (vehicleId: string): VehicleFormData => {
    if (!vehicleForms[vehicleId]) {
      return initializeForm(vehicleId);
    }
    return vehicleForms[vehicleId];
  };

  const updateFormData = (vehicleId: string, field: keyof VehicleFormData, value: any) => {
    setVehicleForms(prev => ({
      ...prev,
      [vehicleId]: {
        ...(prev[vehicleId] || initializeForm(vehicleId)),
        [field]: value,
      }
    }));
  };

  const handleTechnicianChange = (vehicleId: string, technicianId: string) => {
    const technician = technicians.find(t => t.id === technicianId);
    if (technician) {
      setVehicleForms(prev => ({
        ...prev,
        [vehicleId]: {
          ...(prev[vehicleId] || initializeForm(vehicleId)),
          technician_id: technicianId,
          technician_name: technician.name,
          technician_whatsapp: technician.phone || '',
        }
      }));
    }
  };

  const isVehicleComplete = (vehicleId: string): boolean => {
    const form = getFormData(vehicleId);
    return !!(
      form.date &&
      form.time &&
      form.technician_id &&
      form.service &&
      form.scheduled_by
    );
  };

  const getCompletedVehicles = () => {
    return visibleVehicles.filter(v => isVehicleComplete(v.id));
  };

  const handleSubmit = async () => {
    const completedVehicles = getCompletedVehicles();
    
    if (completedVehicles.length === 0) {
      toast.error('Preencha pelo menos um veículo para agendar');
      return;
    }

    setIsSubmitting(true);
    try {
      const vehiclesToSchedule = completedVehicles.map(vehicle => ({
        vehicle,
        formData: getFormData(vehicle.id),
      }));

      await onScheduleVehicles(vehiclesToSchedule);
      
      // Clear forms for scheduled vehicles
      setVehicleForms(prev => {
        const newForms = { ...prev };
        completedVehicles.forEach(v => delete newForms[v.id]);
        return newForms;
      });
      
      toast.success(`${completedVehicles.length} veículo(s) agendado(s) com sucesso!`);
    } catch (error) {
      console.error('Error scheduling vehicles:', error);
      toast.error('Erro ao agendar veículos');
    } finally {
      setIsSubmitting(false);
    }
  };

  const completedCount = getCompletedVehicles().length;

  return (
    <Card className="border-primary/20 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
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
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 px-0 pb-4">
            <ScrollArea className="w-full">
              <div className="min-w-[1200px] px-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[180px]">Veículo</TableHead>
                      <TableHead className="w-[100px]">Placa</TableHead>
                      <TableHead className="w-[120px]">Configuração</TableHead>
                      <TableHead className="w-[140px]">Data *</TableHead>
                      <TableHead className="w-[100px]">Horário *</TableHead>
                      <TableHead className="w-[160px]">Técnico *</TableHead>
                      <TableHead className="w-[120px]">Serviço *</TableHead>
                      <TableHead className="w-[140px]">Quem Agendou *</TableHead>
                      <TableHead className="w-[140px]">Contato Local</TableHead>
                      <TableHead className="w-[140px]">Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleVehicles.map((vehicle) => {
                      const form = getFormData(vehicle.id);
                      const isComplete = isVehicleComplete(vehicle.id);
                      
                      return (
                        <TableRow 
                          key={vehicle.id}
                          className={cn(
                            isComplete && "bg-green-50/50 dark:bg-green-950/20"
                          )}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-sm truncate">
                                {vehicle.vehicle_brand} {vehicle.vehicle_model}
                                {vehicle.vehicle_year && ` (${vehicle.vehicle_year})`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {vehicle.vehicle_plate || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-purple-600 font-medium">
                              {vehicle.configuration || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "w-full justify-start text-left font-normal h-8 text-xs",
                                    !form.date && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-1 h-3 w-3" />
                                  {form.date ? format(form.date, "dd/MM/yy") : "Selecionar"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={form.date || undefined}
                                  onSelect={(date) => updateFormData(vehicle.id, 'date', date)}
                                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                  locale={ptBR}
                                />
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={form.time}
                              onChange={(e) => updateFormData(vehicle.id, 'time', e.target.value)}
                              className="h-8 text-xs w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={form.technician_id} 
                              onValueChange={(v) => handleTechnicianChange(vehicle.id, v)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Selecionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {technicians.map((tech) => (
                                  <SelectItem key={tech.id} value={tech.id!}>
                                    {tech.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={form.service} 
                              onValueChange={(v) => updateFormData(vehicle.id, 'service', v)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Instalação">Instalação</SelectItem>
                                <SelectItem value="Manutenção">Manutenção</SelectItem>
                                <SelectItem value="Retirada">Retirada</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={form.scheduled_by}
                              onChange={(e) => updateFormData(vehicle.id, 'scheduled_by', e.target.value)}
                              placeholder="Nome"
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={form.local_contact}
                              onChange={(e) => updateFormData(vehicle.id, 'local_contact', e.target.value)}
                              placeholder="Contato"
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={form.observation}
                              onChange={(e) => updateFormData(vehicle.id, 'observation', e.target.value)}
                              placeholder="Obs."
                              className="h-8 text-xs"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>

            {/* Action buttons */}
            <div className="flex items-center justify-between px-4 mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {completedCount > 0 ? (
                  <span className="text-green-600 font-medium">
                    {completedCount} veículo{completedCount !== 1 ? 's' : ''} pronto{completedCount !== 1 ? 's' : ''} para agendar
                  </span>
                ) : (
                  <span>Preencha os campos obrigatórios (*) para agendar</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Fechar
                </Button>
                <Button
                  size="sm"
                  disabled={completedCount === 0 || isSubmitting}
                  onClick={handleSubmit}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isSubmitting ? 'Salvando...' : `Agendar ${completedCount > 0 ? `(${completedCount})` : ''}`}
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
