import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Truck, User, Calendar, MapPin, FileText, Package, Clock, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Customer } from '@/services/customerService';
import type { KitScheduleWithDetails } from '@/services/kitScheduleService';

interface ScheduleHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  schedules: KitScheduleWithDetails[];
}

export const ScheduleHistoryModal = ({
  isOpen,
  onClose,
  customer,
  schedules
}: ScheduleHistoryModalProps) => {
  if (!customer) return null;

  // Filter schedules for this customer
  const customerSchedules = schedules.filter(s => s.customer_id === customer.id);
  const completedSchedules = customerSchedules.filter(s => s.status === 'completed');
  const activeSchedules = customerSchedules.filter(s => ['scheduled', 'in_progress'].includes(s.status));

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600 text-white">Enviado para Esteira</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-600 text-white">Agendado</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-600 text-white">Em Andamento</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Histórico de Veículos - {customer.name}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Customer Info */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cliente:</span>
                    <p className="font-medium">{customer.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Documento:</span>
                    <p className="font-medium">{customer.document_type.toUpperCase()}: {customer.document_number}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Telefone:</span>
                    <p className="font-medium">{customer.phone}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Localização:</span>
                    <p className="font-medium">{customer.address_city} - {customer.address_state}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{customer.vehicles?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Veículos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{completedSchedules.length}</p>
                  <p className="text-xs text-muted-foreground">Enviados</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{activeSchedules.length}</p>
                  <p className="text-xs text-muted-foreground">Agendados</p>
                </CardContent>
              </Card>
            </div>

            {/* Completed Schedules */}
            {completedSchedules.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Veículos Enviados para Esteira ({completedSchedules.length})
                </h3>
                {completedSchedules.map((schedule) => (
                  <Card key={schedule.id} className="border-green-200 bg-green-50/50">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-green-700" />
                          <span className="font-semibold text-green-900">
                            {schedule.vehicle_plate}
                          </span>
                        </div>
                        {getStatusBadge(schedule.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="space-y-1">
                          <p className="text-muted-foreground text-xs">Veículo</p>
                          <p className="font-medium">
                            {schedule.vehicle_brand} {schedule.vehicle_model} ({schedule.vehicle_year})
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground text-xs">Data de Envio</p>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(schedule.scheduled_date)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground text-xs">Técnico</p>
                          <p className="font-medium flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {schedule.technician?.name || 'Não informado'}
                          </p>
                        </div>
                        {schedule.configuration && (
                          <div className="space-y-1">
                            <p className="text-muted-foreground text-xs">Configuração</p>
                            <p className="font-medium flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {schedule.configuration}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Accessories and Supplies */}
                      {(schedule.accessories?.length > 0 || schedule.supplies?.length > 0) && (
                        <div className="pt-2 border-t space-y-2">
                          {schedule.accessories?.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Acessórios:</p>
                              <div className="flex flex-wrap gap-1">
                                {schedule.accessories.map((acc, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs bg-green-100">
                                    {acc}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {schedule.supplies?.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Insumos:</p>
                              <div className="flex flex-wrap gap-1">
                                {schedule.supplies.map((sup, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs bg-yellow-100">
                                    {sup}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {schedule.notes && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Observações:
                          </p>
                          <p className="text-sm mt-1">{schedule.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Active/Scheduled */}
            {activeSchedules.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Veículos Agendados ({activeSchedules.length})
                </h3>
                {activeSchedules.map((schedule) => (
                  <Card key={schedule.id} className="border-blue-200 bg-blue-50/50">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-blue-700" />
                          <span className="font-semibold text-blue-900">
                            {schedule.vehicle_plate}
                          </span>
                        </div>
                        {getStatusBadge(schedule.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="space-y-1">
                          <p className="text-muted-foreground text-xs">Veículo</p>
                          <p className="font-medium">
                            {schedule.vehicle_brand} {schedule.vehicle_model} ({schedule.vehicle_year})
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground text-xs">Data Agendada</p>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(schedule.scheduled_date)}
                            {schedule.installation_time && ` às ${schedule.installation_time}`}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground text-xs">Técnico</p>
                          <p className="font-medium flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {schedule.technician?.name || 'Não informado'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {customerSchedules.length === 0 && (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  Nenhum veículo foi enviado para a esteira de pedidos ainda.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
