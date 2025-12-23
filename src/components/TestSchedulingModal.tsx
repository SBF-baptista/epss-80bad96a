import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { scheduleTest, HomologationCard } from "@/services/homologationService";
import { getTechnicians, Technician } from "@/services/technicianService";

interface TestSchedulingModalProps {
  card: HomologationCard;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onCloseParent?: () => void;
}

const TestSchedulingModal = ({ card, isOpen, onClose, onUpdate, onCloseParent }: TestSchedulingModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [formData, setFormData] = useState({
    testDate: card.test_scheduled_date?.slice(0, 16) || '',
    location: card.test_location || '',
    technician: card.test_technician || ''
  });

  useEffect(() => {
    const loadTechnicians = async () => {
      try {
        const data = await getTechnicians();
        setTechnicians(data);
      } catch (error) {
        console.error('Error loading technicians:', error);
      }
    };
    
    if (isOpen) {
      loadTechnicians();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.testDate || !formData.location || !formData.technician) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await scheduleTest(card.id, formData.testDate, formData.location, formData.technician);
      toast({
        title: "Teste agendado",
        description: `Teste agendado para ${new Date(formData.testDate).toLocaleDateString('pt-BR')}`
      });
      onUpdate();
      onClose();
      onCloseParent?.();
    } catch (error) {
      console.error('Error scheduling test:', error);
      toast({
        title: "Erro",
        description: "Erro ao agendar teste",
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
            Agendamento de Teste
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted p-3 rounded-lg">
            <p className="font-medium">{card.brand} {card.model}</p>
            {card.year && <p className="text-sm text-muted-foreground">Ano: {card.year}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="testDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data e Hora do Teste *
            </Label>
            <Input
              id="testDate"
              type="datetime-local"
              value={formData.testDate}
              onChange={(e) => setFormData({ ...formData, testDate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Local do Teste *
            </Label>
            <Textarea
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Endereço completo ou descrição do local"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Técnico Responsável *
            </Label>
            <Select
              value={formData.technician}
              onValueChange={(value) => setFormData({ ...formData, technician: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um técnico" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {technicians.length === 0 ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    Nenhum técnico cadastrado
                  </div>
                ) : (
                  technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.name}>
                      {tech.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Agendando..." : "Agendar Teste"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TestSchedulingModal;