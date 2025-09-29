import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getTechnicians, Technician } from "@/services/technicianService";
import { Calendar } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface VehicleScheduleData {
  vehicle_plate: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_year: string;
  accessories: string;
  modules: string;
  technician_id: string;
  scheduled_date: string;
  installation_time: string;
  contract_number: string;
}

interface RescheduleModalProps {
  schedule: {
    id: string;
    kit_id: string;
    technician_id: string;
    scheduled_date: string;
    installation_time?: string;
    status: string;
    notes?: string;
    customer_id?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const RescheduleModal = ({ schedule, isOpen, onClose, onUpdate }: RescheduleModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [vehicles, setVehicles] = useState<VehicleScheduleData[]>([]);

  useEffect(() => {
    if (isOpen && schedule.id) {
      loadTechnicians();
      loadExistingSchedules();
    }
  }, [schedule, isOpen]);

  const loadTechnicians = async () => {
    try {
      const data = await getTechnicians();
      setTechnicians(data);
    } catch (error) {
      console.error('Error loading technicians:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar técnicos",
        variant: "destructive"
      });
    }
  };

  const loadExistingSchedules = async () => {
    try {
      // Load all schedules for this customer
      const { data: schedules, error } = await supabase
        .from('kit_schedules')
        .select('*')
        .eq('customer_id', schedule.customer_id || schedule.id);

      if (error) throw error;

      if (schedules && schedules.length > 0) {
        const vehicleData: VehicleScheduleData[] = schedules.map((s) => ({
          vehicle_plate: s.vehicle_plate || '',
          vehicle_brand: s.vehicle_brand || '',
          vehicle_model: s.vehicle_model || '',
          vehicle_year: s.vehicle_year?.toString() || '',
          accessories: '',
          modules: '',
          technician_id: s.technician_id || '',
          scheduled_date: s.scheduled_date ? s.scheduled_date.split('T')[0] : '',
          installation_time: s.installation_time || '',
          contract_number: ''
        }));
        setVehicles(vehicleData);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar agendamentos existentes",
        variant: "destructive"
      });
    }
  };

  const handleVehicleChange = (index: number, field: keyof VehicleScheduleData, value: string) => {
    const updatedVehicles = [...vehicles];
    updatedVehicles[index] = {
      ...updatedVehicles[index],
      [field]: value
    };
    setVehicles(updatedVehicles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that all required fields are filled
    const hasEmptyFields = vehicles.some(v => 
      !v.technician_id || !v.scheduled_date
    );

    if (hasEmptyFields) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha técnico e data para todos os veículos",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      // Update all schedules for this customer
      const { error } = await supabase
        .from('kit_schedules')
        .delete()
        .eq('customer_id', schedule.customer_id || schedule.id);

      if (error) throw error;

      // Insert updated schedules
      const schedulesToInsert = vehicles.map(vehicle => ({
        customer_id: schedule.customer_id || schedule.id,
        kit_id: schedule.kit_id,
        technician_id: vehicle.technician_id,
        scheduled_date: vehicle.scheduled_date,
        installation_time: vehicle.installation_time || null,
        status: 'assigned',
        vehicle_plate: vehicle.vehicle_plate,
        vehicle_brand: vehicle.vehicle_brand,
        vehicle_model: vehicle.vehicle_model,
        vehicle_year: vehicle.vehicle_year ? parseInt(vehicle.vehicle_year) : null
      }));

      const { error: insertError } = await supabase
        .from('kit_schedules')
        .insert(schedulesToInsert);

      if (insertError) throw insertError;

      toast({
        title: "Sucesso",
        description: "Reagendamento realizado com sucesso!"
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error rescheduling:', error);
      toast({
        title: "Erro",
        description: "Erro ao reagendar instalação",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1400px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reagendar Instalação
          </DialogTitle>
          <DialogDescription>
            Atualize os dados de agendamento dos veículos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Técnico *</TableHead>
                  <TableHead>Data *</TableHead>
                  <TableHead>Horário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={vehicle.vehicle_model}
                        readOnly
                        className="min-w-[120px] bg-gray-50"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={vehicle.vehicle_plate}
                        readOnly
                        className="min-w-[100px] bg-gray-50"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={vehicle.vehicle_year}
                        readOnly
                        className="min-w-[80px] bg-gray-50"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={vehicle.technician_id}
                        onValueChange={(value) => handleVehicleChange(index, 'technician_id', value)}
                      >
                        <SelectTrigger className="min-w-[150px]">
                          <SelectValue placeholder="Selecione" />
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
                      <Input
                        type="date"
                        value={vehicle.scheduled_date}
                        onChange={(e) => handleVehicleChange(index, 'scheduled_date', e.target.value)}
                        className="min-w-[140px]"
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={vehicle.installation_time}
                        onChange={(e) => handleVehicleChange(index, 'installation_time', e.target.value)}
                        className="min-w-[100px]"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Reagendando..." : "Reagendar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};