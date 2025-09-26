import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateKitSchedule } from "@/services/kitScheduleService";
import { getTechnicians, Technician } from "@/services/technicianService";
import { Calendar } from "lucide-react";

interface RescheduleModalProps {
  schedule: {
    id: string;
    kit_id: string;
    technician_id: string;
    scheduled_date: string;
    installation_time?: string;
    status: string;
    notes?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const RescheduleModal = ({ schedule, isOpen, onClose, onUpdate }: RescheduleModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [formData, setFormData] = useState({
    technician_id: "",
    scheduled_date: "",
    installation_time: "",
    notes: ""
  });

  useEffect(() => {
    if (isOpen) {
      loadTechnicians();
      setFormData({
        technician_id: schedule.technician_id,
        scheduled_date: schedule.scheduled_date.split('T')[0], // Extract date part
        installation_time: schedule.installation_time || "",
        notes: schedule.notes || ""
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.technician_id || !formData.scheduled_date) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      await updateKitSchedule(schedule.id, {
        technician_id: formData.technician_id,
        scheduled_date: formData.scheduled_date,
        installation_time: formData.installation_time || undefined,
        notes: formData.notes || undefined
      });

      toast({
        title: "Sucesso",
        description: "Agendamento reagendado com sucesso!"
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reagendar Instalação
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="technician_id">Técnico *</Label>
            <Select 
              value={formData.technician_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, technician_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um técnico" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((technician) => (
                  <SelectItem key={technician.id} value={technician.id!}>
                    {technician.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="scheduled_date">Data *</Label>
            <Input
              id="scheduled_date"
              type="date"
              value={formData.scheduled_date}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="installation_time">Horário</Label>
            <Input
              id="installation_time"
              type="time"
              value={formData.installation_time}
              onChange={(e) => setFormData(prev => ({ ...prev, installation_time: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Input
              id="notes"
              type="text"
              placeholder="Observações sobre o reagendamento..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
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