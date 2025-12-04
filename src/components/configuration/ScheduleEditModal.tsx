import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Car, Cpu, Package, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getTechnicians, Technician } from '@/services/technicianService';

const scheduleFormSchema = z.object({
  technician_id: z.string().min(1, 'Técnico é obrigatório'),
  technician_name: z.string().min(1, 'Nome do técnico é obrigatório'),
  technician_whatsapp: z.string().optional(),
  scheduled_time: z.string().min(1, 'Horário é obrigatório'),
  scheduled_by: z.string().min(1, 'Quem agendou é obrigatório'),
  service: z.string().min(1, 'Serviço é obrigatório'),
  plate: z.string().min(1, 'Placa é obrigatória'),
  vehicle_model: z.string().min(1, 'Modelo do veículo é obrigatório'),
  tracker_model: z.string().min(1, 'Modelo do rastreador é obrigatório'),
  customer: z.string().min(1, 'Cliente é obrigatório'),
  address: z.string().min(1, 'Endereço é obrigatório'),
  reference_point: z.string().optional(),
  phone: z.string().optional(),
  local_contact: z.string().optional(),
  observation: z.string().optional(),
});

export type ScheduleEditFormData = z.infer<typeof scheduleFormSchema>;

interface ScheduleEntry {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  technician_id?: string;
  technician_name: string;
  technician_whatsapp: string;
  customer: string;
  address: string;
  plate: string;
  service: string;
  vehicle_model: string;
  tracker_model: string;
  scheduled_by: string;
  reference_point: string;
  phone: string;
  local_contact: string;
  observation: string;
}

interface ScheduleEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: ScheduleEntry | null;
  onUpdate: (id: string, data: ScheduleEditFormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export const ScheduleEditModal = ({
  open,
  onOpenChange,
  schedule,
  onUpdate,
  onDelete,
  isLoading = false,
}: ScheduleEditModalProps) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);

  const form = useForm<ScheduleEditFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      technician_id: '',
      technician_name: '',
      technician_whatsapp: '',
      scheduled_time: '',
      scheduled_by: '',
      service: '',
      plate: '',
      vehicle_model: '',
      tracker_model: '',
      customer: '',
      address: '',
      reference_point: '',
      phone: '',
      local_contact: '',
      observation: '',
    },
  });

  useEffect(() => {
    const fetchTechnicians = async () => {
      const data = await getTechnicians();
      setTechnicians(data);
    };
    if (open) {
      fetchTechnicians();
      setIsEditMode(false); // Reset to view mode when opening
    }
  }, [open]);

  useEffect(() => {
    if (schedule) {
      // Try to find matching technician by name
      const matchingTech = technicians.find(t => t.name === schedule.technician_name);
      form.reset({
        technician_id: matchingTech?.id || schedule.technician_id || '',
        technician_name: schedule.technician_name,
        technician_whatsapp: schedule.technician_whatsapp || '',
        scheduled_time: schedule.scheduled_time,
        scheduled_by: schedule.scheduled_by,
        service: schedule.service,
        plate: schedule.plate,
        vehicle_model: schedule.vehicle_model,
        tracker_model: schedule.tracker_model,
        customer: schedule.customer,
        address: schedule.address,
        reference_point: schedule.reference_point || '',
        phone: schedule.phone || '',
        local_contact: schedule.local_contact || '',
        observation: schedule.observation || '',
      });
    }
  }, [schedule, form, technicians]);

  const getTechnicianLocation = (tech: Technician) => {
    const parts = [tech.address_city, tech.address_state].filter(Boolean);
    return parts.length > 0 ? parts.join(' - ') : 'Sem localização';
  };

  const handleTechnicianChange = (technicianId: string) => {
    const selectedTech = technicians.find(t => t.id === technicianId);
    if (selectedTech) {
      form.setValue('technician_id', technicianId);
      form.setValue('technician_name', selectedTech.name);
      form.setValue('technician_whatsapp', selectedTech.phone || '');
    }
  };

  const handleSubmit = async (data: ScheduleEditFormData) => {
    if (schedule) {
      await onUpdate(schedule.id, data);
      setIsEditMode(false);
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    if (schedule) {
      await onDelete(schedule.id);
      onOpenChange(false);
    }
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setIsEditMode(false);
    }
    onOpenChange(openState);
  };

  const formattedDate = schedule 
    ? format(new Date(schedule.scheduled_date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {isEditMode ? 'Editar Agendamento' : 'Detalhes do Agendamento'} - {formattedDate}
            </DialogTitle>
            <div className="flex items-center gap-2 mr-6">
              {!isEditMode && (
                <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          {/* Vehicle Header */}
          {schedule && (
            <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">Dados do Veículo</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Modelo</p>
                    <p className="font-medium text-sm">{schedule.vehicle_model || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 text-primary font-bold text-xs">ABC</span>
                  <div>
                    <p className="text-xs text-muted-foreground">Placa</p>
                    <p className="font-medium text-sm">{schedule.plate || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Rastreador</p>
                    <p className="font-medium text-sm">{schedule.tracker_model || '-'}</p>
                  </div>
                </div>
                {schedule.observation && schedule.observation.includes('Acessórios:') && (
                  <div className="flex items-start gap-2 col-span-2 md:col-span-3">
                    <Package className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Acessórios</p>
                      <p className="font-medium text-sm">
                        {schedule.observation.split('Acessórios:')[1]?.split('\n')[0]?.trim() || '-'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="technician_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Técnico *</FormLabel>
                      {isEditMode ? (
                        <Select onValueChange={handleTechnicianChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Selecione o técnico" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background z-50">
                            {technicians.map((tech) => (
                              <SelectItem key={tech.id} value={tech.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{tech.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {getTechnicianLocation(tech)}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                          {form.watch('technician_name') || '-'}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduled_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário *</FormLabel>
                      <FormControl>
                        {isEditMode ? (
                          <Input type="time" {...field} />
                        ) : (
                          <div className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                            {field.value || '-'}
                          </div>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduled_by"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quem Agendou *</FormLabel>
                      <FormControl>
                        {isEditMode ? (
                          <Input placeholder="Nome de quem agendou" {...field} />
                        ) : (
                          <div className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                            {field.value || '-'}
                          </div>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="service"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviço *</FormLabel>
                      <FormControl>
                        {isEditMode ? (
                          <Input placeholder="Tipo de serviço" {...field} />
                        ) : (
                          <div className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                            {field.value || '-'}
                          </div>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placa *</FormLabel>
                      <FormControl>
                        {isEditMode ? (
                          <Input placeholder="Placa do veículo" {...field} />
                        ) : (
                          <div className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                            {field.value || '-'}
                          </div>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vehicle_model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo do Veículo *</FormLabel>
                      <FormControl>
                        {isEditMode ? (
                          <Input placeholder="Modelo do veículo" {...field} />
                        ) : (
                          <div className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                            {field.value || '-'}
                          </div>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tracker_model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo do Rastreador *</FormLabel>
                      <FormControl>
                        {isEditMode ? (
                          <Input placeholder="Modelo do rastreador" {...field} />
                        ) : (
                          <div className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                            {field.value || '-'}
                          </div>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="customer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente *</FormLabel>
                    <FormControl>
                      {isEditMode ? (
                        <Input placeholder="Nome do cliente" {...field} />
                      ) : (
                        <div className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                          {field.value || '-'}
                        </div>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço *</FormLabel>
                    <FormControl>
                      {isEditMode ? (
                        <Input placeholder="Endereço completo" {...field} />
                      ) : (
                        <div className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                          {field.value || '-'}
                        </div>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reference_point"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ponto de Referência</FormLabel>
                      <FormControl>
                        {isEditMode ? (
                          <Input placeholder="Ponto de referência" {...field} />
                        ) : (
                          <div className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                            {field.value || '-'}
                          </div>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        {isEditMode ? (
                          <Input placeholder="Telefone para contato" {...field} />
                        ) : (
                          <div className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                            {field.value || '-'}
                          </div>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="local_contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contato Local</FormLabel>
                    <FormControl>
                      {isEditMode ? (
                        <Input placeholder="Nome do contato no local" {...field} />
                      ) : (
                        <div className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                          {field.value || '-'}
                        </div>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observação</FormLabel>
                    <FormControl>
                      {isEditMode ? (
                        <Textarea placeholder="Observações sobre o agendamento" {...field} />
                      ) : (
                        <div className="flex min-h-[80px] w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm whitespace-pre-wrap">
                          {field.value || '-'}
                        </div>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditMode && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditMode(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              )}

              {!isEditMode && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                    Fechar
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
