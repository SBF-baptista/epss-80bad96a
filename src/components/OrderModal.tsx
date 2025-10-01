
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
import { Order } from "@/services/orderService";
import { KitScheduleWithDetails } from "@/services/kitScheduleService";
import { HomologationKit } from "@/types/homologationKit";

interface OrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  schedule?: KitScheduleWithDetails;
  kit?: HomologationKit;
}

const OrderModal = ({ order, isOpen, onClose, schedule, kit }: OrderModalProps) => {
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

  const equipment = kit?.equipment || [];
  const accessories = kit?.accessories || [];
  const supplies = kit?.supplies || [];

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

          {/* Configuração de Items */}
          <div className="space-y-6">
            {/* Veículos */}
            {order.vehicles.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4 text-primary">Veículo</h3>
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <div className="space-y-2">
                    <p className="font-medium text-foreground text-base">
                      {order.vehicles[0].brand} {order.vehicles[0].model}
                    </p>
                    {order.vehicles[0].year && (
                      <p className="text-sm text-muted-foreground">Ano: {order.vehicles[0].year}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Rastreadores */}
            {equipment.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4 text-primary">
                  Rastreadores ({equipment.reduce((sum, eq) => sum + eq.quantity, 0)} unidades)
                </h3>
                <div className="space-y-2">
                  {equipment.map((item, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-foreground">{item.item_name}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="font-semibold">
                          {item.quantity}x
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Acessórios */}
            {accessories.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4 text-primary">
                  Acessórios ({accessories.reduce((sum, acc) => sum + acc.quantity, 0)} unidades)
                </h3>
                <div className="space-y-2">
                  {accessories.map((accessory, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-foreground">{accessory.item_name}</p>
                          {accessory.description && (
                            <p className="text-sm text-muted-foreground">{accessory.description}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="font-semibold">
                          {accessory.quantity}x
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insumos */}
            {supplies.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4 text-primary">
                  Insumos ({supplies.reduce((sum, sup) => sum + sup.quantity, 0)} unidades)
                </h3>
                <div className="space-y-2">
                  {supplies.map((supply, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-foreground">{supply.item_name}</p>
                          {supply.description && (
                            <p className="text-sm text-muted-foreground">{supply.description}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="font-semibold">
                          {supply.quantity}x
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default OrderModal;
