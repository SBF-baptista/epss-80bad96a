
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
        // Filter schedules to only show those with the same status as the clicked schedule
        const filteredSchedules = schedules.filter(s => s.status === schedule.status);
        setAllSchedules(filteredSchedules);
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
                  // Get equipment from kit
                  const equipment = sched.kit?.equipment || [];
                  
                  // Get accessories and supplies directly from schedule fields (not from kit)
                  const accessoriesItems = Array.isArray(sched.accessories) && sched.accessories.length > 0
                    ? sched.accessories.map((name: string, i: number) => ({ 
                        id: `${sched.id}-acc-${i}`, 
                        item_name: name, 
                        quantity: 1 
                      }))
                    : [];
                  
                  const suppliesItems = Array.isArray(sched.supplies) && sched.supplies.length > 0
                    ? sched.supplies.map((name: string, i: number) => ({ 
                        id: `${sched.id}-sup-${i}`, 
                        item_name: name, 
                        quantity: 1 
                      }))
                    : [];
                  
                  const getStatusBadge = (status: string) => {
                    switch (status) {
                      case 'completed':
                        return <Badge className="bg-green-500 text-white">✓ Pronto</Badge>;
                      case 'in_progress':
                        return <Badge className="bg-yellow-500 text-white">Em Andamento</Badge>;
                      case 'scheduled':
                        return <Badge variant="secondary">Agendado</Badge>;
                      case 'cancelled':
                        return <Badge variant="destructive">Cancelado</Badge>;
                      default:
                        return <Badge variant="outline">{status}</Badge>;
                    }
                  };
                  
                  return (
                    <div key={sched.id || idx} className="p-4 bg-card border-2 border-primary/20 rounded-lg space-y-4">
                      {/* Vehicle Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getStatusBadge(sched.status || 'scheduled')}
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
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {sched.vehicle_year && (
                              <span>Ano: {sched.vehicle_year}</span>
                            )}
                            {schedule?.customer_id && (
                              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                Contrato: {schedule.customer_id.slice(0, 8).toUpperCase()}
                              </span>
                            )}
                          </div>
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
                          <div className="flex flex-wrap gap-2">
                            {accessoriesItems.map((item, index) => (
                              <div key={item.id || index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-sm border border-primary/20">
                                <span className="font-medium">✓ {item.item_name}</span>
                                {item.quantity > 1 && (
                                  <Badge variant="secondary" className="text-xs h-5">{item.quantity}x</Badge>
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
                          <div className="flex flex-wrap gap-2">
                            {suppliesItems.map((item, index) => (
                              <div key={item.id || index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 text-secondary-foreground rounded-md text-sm border border-secondary/20">
                                <span className="font-medium">✓ {item.item_name}</span>
                                {item.quantity > 1 && (
                                  <Badge variant="secondary" className="text-xs h-5">{item.quantity}x</Badge>
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

            {/* Consolidated Totals Section */}
            {allSchedules.length > 0 && (
              <>
                <Separator className="my-6" />
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-primary">
                    Totais Consolidados
                  </h3>
                  <div className="bg-muted/30 p-4 rounded-lg border">
                    {(() => {
                      const totals: Record<string, number> = {};
                      
                      allSchedules.forEach((sched) => {
                        // Equipment/Trackers
                        (sched.kit?.equipment || []).forEach((item: any) => {
                          totals[item.item_name] = (totals[item.item_name] || 0) + item.quantity;
                        });
                        
                        // Accessories
                        if (Array.isArray(sched.accessories)) {
                          sched.accessories.forEach((name: string) => {
                            totals[name] = (totals[name] || 0) + 1;
                          });
                        }
                        
                        // Supplies
                        if (Array.isArray(sched.supplies)) {
                          sched.supplies.forEach((name: string) => {
                            totals[name] = (totals[name] || 0) + 1;
                          });
                        }
                      });

                      const sortedItems = Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));

                      return sortedItems.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {sortedItems.map(([itemName, quantity]) => (
                            <div key={itemName} className="flex items-center justify-between p-3 bg-card border rounded-lg">
                              <span className="font-medium text-sm text-foreground">{itemName}</span>
                              <Badge variant="secondary" className="ml-2">{quantity}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}

            {/* By Technician Section */}
            {allSchedules.length > 0 && (
              <>
                <Separator className="my-6" />
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-primary">
                    Detalhamento por Técnico
                  </h3>
                  {(() => {
                    // Group schedules by technician
                    const byTechnician: Record<string, typeof allSchedules> = {};
                    
                    allSchedules.forEach((sched) => {
                      const techName = sched.technician?.name || 'Sem técnico atribuído';
                      if (!byTechnician[techName]) {
                        byTechnician[techName] = [];
                      }
                      byTechnician[techName].push(sched);
                    });

                    return Object.entries(byTechnician).map(([techName, schedules]) => (
                      <div key={techName} className="bg-muted/30 p-4 rounded-lg border space-y-3">
                        <h4 className="font-semibold text-base text-foreground flex items-center gap-2">
                          <User className="h-5 w-5 text-primary" />
                          {techName}
                          <Badge variant="outline" className="ml-auto">
                            {schedules.length} {schedules.length === 1 ? 'placa' : 'placas'}
                          </Badge>
                        </h4>
                        
                        <div className="space-y-3 pl-7">
                          {schedules.map((sched, idx) => {
                            const equipment = sched.kit?.equipment || [];
                            const accessories = Array.isArray(sched.accessories) ? sched.accessories : [];
                            const supplies = Array.isArray(sched.supplies) ? sched.supplies : [];
                            
                            const totalAccessories = accessories.length;
                            const totalSupplies = supplies.length;
                            const totalEquipment = equipment.reduce((sum: number, eq: any) => sum + eq.quantity, 0);

                            return (
                              <div key={sched.id || idx} className="bg-card p-3 rounded-lg border border-primary/10">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    {sched.vehicle_plate && (
                                      <Badge variant="outline" className="font-bold mb-1">
                                        {sched.vehicle_plate}
                                      </Badge>
                                    )}
                                    <p className="text-sm font-medium text-foreground">
                                      {sched.vehicle_brand} {sched.vehicle_model}
                                    </p>
                                  </div>
                                  <div className="flex gap-2 flex-wrap justify-end text-xs">
                                    {totalEquipment > 0 && (
                                      <Badge variant="secondary" className="text-xs">
                                        {totalEquipment} rastreador{totalEquipment !== 1 ? 'es' : ''}
                                      </Badge>
                                    )}
                                    {totalAccessories > 0 && (
                                      <Badge className="bg-primary/10 text-primary text-xs">
                                        {totalAccessories} acessório{totalAccessories !== 1 ? 's' : ''}
                                      </Badge>
                                    )}
                                    {totalSupplies > 0 && (
                                      <Badge className="bg-secondary/10 text-secondary-foreground text-xs">
                                        {totalSupplies} insumo{totalSupplies !== 1 ? 's' : ''}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Items list */}
                                <div className="text-xs text-muted-foreground space-y-1 mt-2">
                                  {equipment.map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between">
                                      <span>• {item.item_name}</span>
                                      <span className="font-medium">{item.quantity}x</span>
                                    </div>
                                  ))}
                                  {accessories.map((name: string, i: number) => (
                                    <div key={`acc-${i}`} className="flex justify-between">
                                      <span>• {name}</span>
                                      <span className="font-medium">1x</span>
                                    </div>
                                  ))}
                                  {supplies.map((name: string, i: number) => (
                                    <div key={`sup-${i}`} className="flex justify-between">
                                      <span>• {name}</span>
                                      <span className="font-medium">1x</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default OrderModal;
