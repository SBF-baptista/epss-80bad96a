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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InstallationOrder } from "@/types/installationOrder";
import { updateTrackingCode } from "@/services/installationOrderService";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Package } from "lucide-react";

interface InstallationOrderModalProps {
  order: InstallationOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const InstallationOrderModal = ({ order, isOpen, onClose, onUpdate }: InstallationOrderModalProps) => {
  const { toast } = useToast();
  const [trackingCode, setTrackingCode] = useState(order?.trackingCode || "");
  const [isSaving, setIsSaving] = useState(false);

  if (!order) return null;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "scheduled":
        return "Agendado";
      case "in_progress":
        return "Em Andamento";
      case "awaiting_shipment":
        return "Aguardando Envio";
      case "shipped":
        return "Enviado";
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
      case "awaiting_shipment":
        return "bg-orange-100 text-orange-800";
      case "shipped":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSaveTrackingCode = async () => {
    if (!trackingCode.trim()) {
      toast({
        title: "Erro",
        description: "Digite um código de rastreio válido",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateTrackingCode(order.id, trackingCode);
      toast({
        title: "Código salvo",
        description: "Código de rastreio atualizado com sucesso"
      });
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error saving tracking code:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar código de rastreio",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const totalAccessories = order.accessories.reduce((sum, acc) => sum + acc.quantity, 0);
  const totalSupplies = order.supplies.reduce((sum, sup) => sum + sup.quantity, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                Pedido de Instalação - {order.customerName}
              </DialogTitle>
              <DialogDescription>
                Técnico: {order.technicianName}
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

            {/* Vehicle Information */}
            <div>
              <h3 className="font-semibold text-lg mb-4 text-primary">Informações do Veículo</h3>
              <div className="p-4 bg-muted/50 rounded-lg border space-y-2">
                {order.vehicleBrand && order.vehicleModel && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Modelo</Label>
                    <p className="font-medium text-foreground">
                      {order.vehicleBrand} {order.vehicleModel}
                    </p>
                  </div>
                )}
                {order.vehicleYear && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Ano</Label>
                    <p className="font-medium text-foreground">{order.vehicleYear}</p>
                  </div>
                )}
                {order.vehiclePlate && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Placa</Label>
                    <p className="font-medium text-foreground">{order.vehiclePlate}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Configuration and Tracker */}
            {(order.configuration || order.trackerModel) && (
              <div>
                <h3 className="font-semibold text-lg mb-4 text-primary">Configuração e Rastreador</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {order.configuration && (
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <Label className="text-sm text-muted-foreground">Configuração de Protocolo</Label>
                      <p className="text-primary font-semibold text-lg mt-1">{order.configuration}</p>
                    </div>
                  )}
                  {order.trackerModel && (
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <Label className="text-sm text-muted-foreground">Modelo do Rastreador</Label>
                      <p className="font-semibold text-lg mt-1">{order.trackerModel}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Accessories */}
            {order.accessories.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4 text-primary">
                  Acessórios ({totalAccessories} unidades)
                </h3>
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-4" style={{ minWidth: 'max-content' }}>
                    {order.accessories.map((accessory, index) => (
                      <div key={index} className="flex-shrink-0 w-80 p-4 bg-muted/50 rounded-lg border">
                        <div className="space-y-2">
                          <p className="font-medium text-foreground">{accessory.name}</p>
                          {accessory.description && (
                            <p className="text-sm text-muted-foreground">{accessory.description}</p>
                          )}
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

            {/* Supplies */}
            {order.supplies.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4 text-primary">
                  Insumos ({totalSupplies} unidades)
                </h3>
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-4" style={{ minWidth: 'max-content' }}>
                    {order.supplies.map((supply, index) => (
                      <div key={index} className="flex-shrink-0 w-80 p-4 bg-muted/50 rounded-lg border">
                        <div className="space-y-2">
                          <p className="font-medium text-foreground">{supply.name}</p>
                          {supply.description && (
                            <p className="text-sm text-muted-foreground">{supply.description}</p>
                          )}
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

            {/* Tracking Code - Only show for shipped status */}
            {order.status === 'shipped' && (
              <div>
                <h3 className="font-semibold text-lg mb-4 text-primary flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Código de Rastreio
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="tracking-code">Código dos Correios</Label>
                    <Input
                      id="tracking-code"
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                      placeholder="Digite o código de rastreio"
                      className="mt-1"
                    />
                  </div>
                  <Button 
                    onClick={handleSaveTrackingCode}
                    disabled={isSaving}
                    className="w-full"
                  >
                    {isSaving ? "Salvando..." : "Salvar Código de Rastreio"}
                  </Button>
                </div>
              </div>
            )}

            {/* Installation Address */}
            {order.installationAddress && (
              <div>
                <h3 className="font-semibold text-lg mb-4 text-primary">Endereço de Instalação</h3>
                <div className="p-4 bg-muted/50 rounded-lg border space-y-1">
                  <p className="text-sm">
                    {order.installationAddress.street}, {order.installationAddress.number}
                  </p>
                  <p className="text-sm">
                    {order.installationAddress.neighborhood}
                  </p>
                  <p className="text-sm">
                    {order.installationAddress.city} - {order.installationAddress.state}
                  </p>
                  <p className="text-sm">
                    CEP: {order.installationAddress.postalCode}
                  </p>
                  {order.installationAddress.complement && (
                    <p className="text-sm text-muted-foreground">
                      {order.installationAddress.complement}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default InstallationOrderModal;
