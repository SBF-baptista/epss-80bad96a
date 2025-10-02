
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Order } from "@/services/orderService";
import { KitScheduleWithDetails, getSchedulesByCustomer } from "@/services/kitScheduleService";
import { HomologationKit } from "@/types/homologationKit";
import { Calendar, User, MapPin } from "lucide-react";

interface OrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  schedule?: KitScheduleWithDetails;
  kit?: HomologationKit;
}

const OrderModal = ({ order, isOpen, onClose, schedule, kit }: OrderModalProps) => {
  const [allSchedules, setAllSchedules] = useState<KitScheduleWithDetails[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAllSchedules = async () => {
      if (!schedule || !isOpen) return;
      
      setLoading(true);
      try {
        const schedules = await getSchedulesByCustomer(
          schedule.customer_name,
          schedule.customer_id
        );
        setAllSchedules(schedules);
      } catch (error) {
        console.error("Error fetching customer schedules:", error);
        setAllSchedules([schedule]); // Fallback to single schedule
      } finally {
        setLoading(false);
      }
    };

    fetchAllSchedules();
  }, [schedule, isOpen]);

  if (!order) return null;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "novos":
        return "Pedidos";
      case "producao":
        return "Em Produção";
      case "aguardando":
        return "Aguardando Envio";
      case "enviado":
        return "Enviado";
      case "standby":
        return "Em Stand-by";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "novos":
        return "bg-blue-100 text-blue-800";
      case "producao":
        return "bg-yellow-100 text-yellow-800";
      case "aguardando":
        return "bg-orange-100 text-orange-800";
      case "enviado":
        return "bg-green-100 text-green-800";
      case "standby":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div>
            <DialogTitle className="text-xl">
              Pedido de Instalação - {order.company_name}
            </DialogTitle>
            <DialogDescription>
              Detalhes completos do pedido
            </DialogDescription>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center space-x-3">
              <Badge className={getStatusColor(order.status)}>
                {getStatusLabel(order.status)}
              </Badge>
            </div>

            <Separator />

            {/* Customer Info */}
            <div className="bg-muted/30 p-4 rounded-lg border">
              <h3 className="font-semibold text-base mb-2 text-primary">Cliente</h3>
              <p className="font-medium text-foreground">{order.company_name}</p>
              {schedule?.customer_phone && (
                <p className="text-sm text-muted-foreground mt-1">Tel: {schedule.customer_phone}</p>
              )}
              {schedule?.customer_email && (
                <p className="text-sm text-muted-foreground">Email: {schedule.customer_email}</p>
              )}
            </div>

            <Separator />

            {/* All Vehicles/Plates Section */}
            {loading ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Carregando placas...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-primary">
                  Veículos Agendados ({allSchedules.length} {allSchedules.length === 1 ? 'placa' : 'placas'})
                </h3>
                
                {allSchedules.map((sched, idx) => {
                  const equipment = sched.kit?.equipment || [];
                  const accessoriesItems = (sched.kit?.accessories && sched.kit.accessories.length > 0)
                    ? (sched.kit.accessories as any[])
                    : (Array.isArray(sched.accessories) ? (sched.accessories as any[]).map((name: string, i: number) => ({ id: `${sched.id}-acc-${i}` as string, item_name: name, quantity: 1 })) : []);
                  const suppliesItems = (sched.kit?.supplies && sched.kit.supplies.length > 0)
                    ? (sched.kit.supplies as any[])
                    : (Array.isArray(sched.supplies) ? (sched.supplies as any[]).map((name: string, i: number) => ({ id: `${sched.id}-sup-${i}` as string, item_name: name, quantity: 1 })) : []);
                  
                  return (
                    <div key={sched.id || idx} className="p-4 bg-card border-2 border-primary/20 rounded-lg space-y-4">
                      {/* Vehicle Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {sched.vehicle_plate && (
                              <Badge variant="outline" className="text-base font-bold px-3 py-1">
                                {sched.vehicle_plate}
                              </Badge>
                            )}
                            <Badge variant="secondary">Placa {idx + 1}</Badge>
                          </div>
                          <p className="font-semibold text-foreground text-lg">
                            {sched.vehicle_brand} {sched.vehicle_model}
                          </p>
                          {sched.vehicle_year && (
                            <p className="text-sm text-muted-foreground">Ano: {sched.vehicle_year}</p>
                          )}
                        </div>
                      </div>

                      {/* Installation Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="text-muted-foreground">Data:</span>
                          <span className="font-medium">{formatDate(sched.scheduled_date)}</span>
                        </div>
                        {sched.technician && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-primary" />
                            <span className="text-muted-foreground">Técnico:</span>
                            <span className="font-medium">{sched.technician.name}</span>
                          </div>
                        )}
                        {sched.installation_address_city && (
                          <div className="flex items-center gap-2 text-sm md:col-span-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="text-muted-foreground">Local:</span>
                            <span className="font-medium">
                              {sched.installation_address_city}, {sched.installation_address_state}
                            </span>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Equipment/Trackers */}
                      {equipment.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2 text-primary">
                            Rastreadores ({equipment.reduce((sum, eq) => sum + eq.quantity, 0)} unidades)
                          </h4>
                          <div className="space-y-2">
                            {equipment.map((item, index) => (
                              <div key={index} className="p-2 bg-muted/30 rounded border text-sm">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium text-foreground">{item.item_name}</p>
                                    {item.description && (
                                      <p className="text-xs text-muted-foreground">{item.description}</p>
                                    )}
                                  </div>
                                  <Badge variant="secondary" className="text-xs">
                                    {item.quantity}x
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Accessories */}
                      {accessoriesItems.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2 text-primary">
                            Acessórios ({accessoriesItems.reduce((sum, a) => sum + (a.quantity || 0), 0)} unidades)
                          </h4>
                          <div className="space-y-2">
                            {accessoriesItems.map((item, index) => (
                              <div key={item.id || index} className="p-2 bg-muted/30 rounded border text-sm">
                                <div className="flex justify-between items-center">
                                  <p className="font-medium text-foreground">{item.item_name}</p>
                                  <Badge variant="secondary" className="text-xs">{item.quantity}x</Badge>
                                </div>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground">{item.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Supplies */}
                      {suppliesItems.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2 text-primary">
                            Insumos ({suppliesItems.reduce((sum, s) => sum + (s.quantity || 0), 0)} unidades)
                          </h4>
                          <div className="space-y-2">
                            {suppliesItems.map((item, index) => (
                              <div key={item.id || index} className="p-2 bg-muted/30 rounded border text-sm">
                                <div className="flex justify-between items-center">
                                  <p className="font-medium text-foreground">{item.item_name}</p>
                                  <Badge variant="secondary" className="text-xs">{item.quantity}x</Badge>
                                </div>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground">{item.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {sched.notes && (
                        <div className="mt-2 p-2 bg-muted/20 rounded text-sm">
                          <p className="text-muted-foreground">{sched.notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default OrderModal;
