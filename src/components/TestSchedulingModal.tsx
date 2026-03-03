import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, User, Check, ChevronsUpDown, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { scheduleTest, HomologationCard } from "@/services/homologationService";
import { getTechnicians, createTechnician, Technician } from "@/services/technicianService";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

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
  const [technicianSearch, setTechnicianSearch] = useState("");
  const [technicianPopoverOpen, setTechnicianPopoverOpen] = useState(false);
  const [formData, setFormData] = useState({
    testDate: card.test_scheduled_date?.slice(0, 16) || '',
    location: card.test_location || '',
    technician: card.test_technician || ''
  });

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const data = await getTechnicians();
        setTechnicians(data);
      } catch (error) {
        console.error('Error fetching technicians:', error);
      }
    };
    if (isOpen) {
      fetchTechnicians();
    }
  }, [isOpen]);

  const filteredTechnicians = technicians.filter(tech =>
    tech.name.toLowerCase().includes(technicianSearch.toLowerCase())
  );

  const handleSelectTechnician = (name: string) => {
    setFormData({ ...formData, technician: name });
    setTechnicianPopoverOpen(false);
    setTechnicianSearch("");
  };

  const handleCreateTechnician = async (name: string) => {
    try {
      const newTech = await createTechnician({ name: name.trim(), postal_code: "" });
      setTechnicians(prev => [newTech, ...prev]);
      setFormData({ ...formData, technician: newTech.name });
      setTechnicianPopoverOpen(false);
      setTechnicianSearch("");
      toast({ title: "Técnico criado", description: `${newTech.name} foi adicionado à lista de técnicos.` });
    } catch (error) {
      console.error('Error creating technician:', error);
      toast({ title: "Erro", description: "Erro ao criar técnico", variant: "destructive" });
    }
  };

  const showCreateOption = technicianSearch.trim() !== "" &&
    !technicians.some(t => t.name.toLowerCase() === technicianSearch.trim().toLowerCase());

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
            <Popover open={technicianPopoverOpen} onOpenChange={setTechnicianPopoverOpen} modal={true}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={technicianPopoverOpen}
                  className="w-full justify-between font-normal"
                  type="button"
                >
                  {formData.technician || "Selecione ou digite um técnico"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[100]" align="start" onWheel={(e) => e.stopPropagation()}>
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Pesquisar ou criar técnico..."
                    value={technicianSearch}
                    onValueChange={setTechnicianSearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {technicianSearch.trim() ? "Nenhum técnico encontrado." : "Digite para pesquisar..."}
                    </CommandEmpty>
                    {showCreateOption && (
                      <CommandGroup heading="Criar novo">
                        <CommandItem onSelect={() => handleCreateTechnician(technicianSearch)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Criar "{technicianSearch.trim()}"
                        </CommandItem>
                      </CommandGroup>
                    )}
                    {filteredTechnicians.length > 0 && (
                      <CommandGroup heading="Técnicos cadastrados">
                        {filteredTechnicians.map((tech) => (
                          <CommandItem
                            key={tech.id}
                            value={tech.name}
                            onSelect={() => handleSelectTechnician(tech.name)}
                          >
                            <Check className={cn("mr-2 h-4 w-4", formData.technician === tech.name ? "opacity-100" : "opacity-0")} />
                            {tech.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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