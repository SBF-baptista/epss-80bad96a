import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getTechnicians, Technician } from "@/services/technicianService";
import { Calendar, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteKitSchedule } from "@/services/kitScheduleService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VehicleScheduleData {
  schedule_id: string;
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
    kit_id?: string | null;
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
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);

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
          schedule_id: s.id,
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

  const handleRemoveSchedule = async () => {
    if (!scheduleToDelete) return;

    try {
      setIsLoading(true);
      await deleteKitSchedule(scheduleToDelete);

      toast({
        title: "Sucesso",
        description: "Agendamento removido com sucesso. O veículo está disponível para novo agendamento."
      });

      // Remove from local state
      setVehicles(vehicles.filter(v => v.schedule_id !== scheduleToDelete));
      setScheduleToDelete(null);
      
      // Refresh parent component
      onUpdate();
    } catch (error) {
      console.error('Error removing schedule:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover agendamento",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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

      // Insert updated schedules with 'scheduled' status
      const schedulesToInsert = vehicles.map(vehicle => ({
        customer_id: schedule.customer_id || schedule.id,
        kit_id: schedule.kit_id || null,
        technician_id: vehicle.technician_id,
        scheduled_date: vehicle.scheduled_date,
        installation_time: vehicle.installation_time || null,
        status: 'scheduled',
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
      <DialogContent className="sm:max-w-[1400px] h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reagendar Instalação
          </DialogTitle>
          <DialogDescription>
            Atualize os dados de agendamento dos veículos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Técnico *</TableHead>
                  <TableHead>Data *</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
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
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setScheduleToDelete(vehicle.schedule_id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="border-t px-6 py-4">
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Reagendando..." : "Reagendar"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>

      <AlertDialog open={!!scheduleToDelete} onOpenChange={() => setScheduleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este agendamento? O veículo ficará disponível para novo agendamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveSchedule} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};