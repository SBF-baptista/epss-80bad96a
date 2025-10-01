import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { InstallationOrder } from "@/types/installationOrder";

interface InstallationOrderModalProps {
  order: InstallationOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

const InstallationOrderModal = ({ order, isOpen, onClose }: InstallationOrderModalProps) => {
  if (!order) return null;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "scheduled":
        return "Agendado";
      case "in_progress":
        return "Em Andamento";
      case "completed":
        return "Concluído";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const accessories = order.kit_accessories?.filter(item => item.item_type === 'accessory') || [];
  const supplies = order.kit_accessories?.filter(item => item.item_type === 'supply') || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                Pedido de Instalação - {order.customer_name}
              </DialogTitle>
              <DialogDescription>
                Kit: {order.kit_name}
              </DialogDescription>
            </div>
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

            {/* Cliente e Técnico */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                <p className="text-foreground font-medium text-lg">{order.customer_name}</p>
                {order.customer_phone && (
                  <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                )}
                {order.customer_email && (
                  <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Técnico Responsável</label>
                <p className="text-foreground font-medium text-lg">{order.technician_name}</p>
              </div>
            </div>

            <Separator />

            {/* Veículo */}
            {(order.vehicle_brand || order.vehicle_model) && (
              <>
                <div>
                  <h3 className="font-semibold text-lg mb-4 text-primary">Veículo</h3>
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <div className="space-y-2">
                      {order.vehicle_brand && order.vehicle_model && (
                        <p className="font-medium text-foreground text-base">
                          {order.vehicle_brand} {order.vehicle_model}
                        </p>
                      )}
                      {order.vehicle_year && (
                        <p className="text-sm text-muted-foreground">Ano: {order.vehicle_year}</p>
                      )}
                      {order.vehicle_plate && (
                        <p className="text-sm text-muted-foreground">Placa: {order.vehicle_plate}</p>
                      )}
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Acessórios */}
            {accessories.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4 text-primary">
                  Acessórios ({accessories.reduce((sum, acc) => sum + acc.quantity, 0)} unidades)
                </h3>
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-4" style={{ minWidth: 'max-content' }}>
                    {accessories.map((accessory, index) => (
                      <div key={index} className="flex-shrink-0 w-80 p-4 bg-muted/50 rounded-lg border">
                        <div className="space-y-3">
                          <div>
                            <p className="font-medium text-foreground text-base">{accessory.item_name}</p>
                            {accessory.description && (
                              <p className="text-sm text-muted-foreground mt-1">{accessory.description}</p>
                            )}
                          </div>
                          <div className="flex justify-end">
                            <Badge variant="secondary" className="font-semibold">
                              {accessory.quantity} {accessory.quantity === 1 ? 'unidade' : 'unidades'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}

            {/* Insumos */}
            {supplies.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4 text-primary">
                  Insumos ({supplies.reduce((sum, sup) => sum + sup.quantity, 0)} unidades)
                </h3>
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-4" style={{ minWidth: 'max-content' }}>
                    {supplies.map((supply, index) => (
                      <div key={index} className="flex-shrink-0 w-80 p-4 bg-muted/50 rounded-lg border">
                        <div className="space-y-3">
                          <div>
                            <p className="font-medium text-foreground text-base">{supply.item_name}</p>
                            {supply.description && (
                              <p className="text-sm text-muted-foreground mt-1">{supply.description}</p>
                            )}
                          </div>
                          <div className="flex justify-end">
                            <Badge variant="secondary" className="font-semibold">
                              {supply.quantity} {supply.quantity === 1 ? 'unidade' : 'unidades'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}

            {/* Configuração de Protocolo */}
            {order.configuration && (
              <div>
                <h3 className="font-semibold text-lg mb-4 text-primary">Configuração de Protocolo</h3>
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <p className="text-primary font-semibold text-lg">{order.configuration}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Protocolo de comunicação específico para os dispositivos deste pedido
                  </p>
                </div>
              </div>
            )}

            {/* Endereço de Instalação */}
            {order.installation_address_street && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-lg mb-4 text-primary">Endereço de Instalação</h3>
                  <div className="p-4 bg-muted/50 rounded-lg border space-y-1">
                    <p className="text-foreground">
                      {order.installation_address_street}, {order.installation_address_number}
                    </p>
                    {order.installation_address_complement && (
                      <p className="text-muted-foreground text-sm">{order.installation_address_complement}</p>
                    )}
                    <p className="text-muted-foreground text-sm">
                      {order.installation_address_neighborhood}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {order.installation_address_city} - {order.installation_address_state}
                    </p>
                    {order.installation_address_postal_code && (
                      <p className="text-muted-foreground text-sm">
                        CEP: {order.installation_address_postal_code}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Notas */}
            {order.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-primary">Observações</h3>
                  <p className="text-muted-foreground">{order.notes}</p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default InstallationOrderModal;
