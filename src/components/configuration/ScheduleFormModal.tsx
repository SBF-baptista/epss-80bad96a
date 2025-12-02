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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

const scheduleFormSchema = z.object({
  technician_name: z.string().min(1, 'Nome do técnico é obrigatório'),
  time: z.string().min(1, 'Horário é obrigatório'),
  scheduled_by: z.string().min(1, 'Quem agendou é obrigatório'),
  service: z.string().min(1, 'Serviço é obrigatório'),
  plate: z.string().min(1, 'Placa é obrigatória'),
  vehicle_model: z.string().min(1, 'Modelo do veículo é obrigatório'),
  tracker_model: z.string().min(1, 'Modelo do rastreador é obrigatório'),
  customer: z.string().min(1, 'Cliente é obrigatório'),
  address: z.string().min(1, 'Endereço é obrigatório'),
  reference_point: z.string().min(1, 'Ponto de referência é obrigatório'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  local_contact: z.string().min(1, 'Contato local é obrigatório'),
  observation: z.string().min(1, 'Observação é obrigatória'),
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

interface ScheduleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  onSubmit: (data: ScheduleFormData & { date: Date }) => void;
}

export const ScheduleFormModal = ({
  open,
  onOpenChange,
  selectedDate,
  onSubmit,
}: ScheduleFormModalProps) => {
  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      technician_name: '',
      time: '',
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

  const handleSubmit = (data: ScheduleFormData) => {
    if (selectedDate) {
      onSubmit({ ...data, date: selectedDate });
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Novo Agendamento - {selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : ''}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="technician_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Técnico *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do técnico" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
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
                      <Input placeholder="Nome de quem agendou" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serviço *</FormLabel>
                    <FormControl>
                      <Input placeholder="Tipo de serviço" {...field} />
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
                      <Input placeholder="Placa do veículo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehicle_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo do Veículo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Modelo do veículo" {...field} />
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
                      <Input placeholder="Modelo do rastreador" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do cliente" {...field} />
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
                      <Input placeholder="Endereço completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference_point"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ponto de Referência *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ponto de referência" {...field} />
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
                    <FormLabel>Telefone *</FormLabel>
                    <FormControl>
                      <Input placeholder="Telefone para contato" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="local_contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contato Local *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do contato no local" {...field} />
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
                    <FormLabel>Observação *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações sobre o agendamento" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar Agendamento
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
