import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Order } from "@/services/orderService";
import { updateKitScheduleShipment, ShipmentAddress } from "@/services/shipmentService";
import { useToast } from "@/hooks/use-toast";
import { LocationSelector, AddressForm } from "./shipment";

interface ShipmentPreparationModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const ShipmentPreparationModal = ({ order, isOpen, onClose, onUpdate }: ShipmentPreparationModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedUF, setSelectedUF] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [address, setAddress] = useState<ShipmentAddress>({
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    postal_code: "",
    complement: "",
  });

  const isReadOnly = order.status === "enviado";

  const updateShipmentMutation = useMutation({
    mutationFn: (data: {
      installation_address_street: string;
      installation_address_number: string;
      installation_address_neighborhood: string;
      installation_address_city: string;
      installation_address_state: string;
      installation_address_postal_code: string;
      installation_address_complement?: string;
    }) => updateKitScheduleShipment(order.id, data),
    onSuccess: () => {
      toast({
        title: "Envio preparado",
        description: "Informações de envio salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["kit-schedules"] });
      onUpdate();
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar informações de envio.",
        variant: "destructive",
      });
    },
  });

  // Load existing shipment data (kit_schedules fields)
  useEffect(() => {
    if (order.installation_address_state) setSelectedUF(order.installation_address_state);
    if (order.installation_address_city) setSelectedCity(order.installation_address_city);

    setAddress({
      street: order.installation_address_street || "",
      number: order.installation_address_number || "",
      neighborhood: order.installation_address_neighborhood || "",
      city: order.installation_address_city || "",
      state: order.installation_address_state || "",
      postal_code: order.installation_address_postal_code || "",
      complement: order.installation_address_complement || "",
    });
  }, [order]);

  const handleUFChange = (value: string) => {
    setSelectedUF(value);
    setSelectedCity("");
    setAddress((prev) => ({ ...prev, state: value, city: "" }));
  };

  const handleCityChange = (value: string) => {
    setSelectedCity(value);
    setAddress((prev) => ({ ...prev, city: value, state: selectedUF }));
  };

  const handleAddressChange = (field: keyof ShipmentAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    const hasLocation = selectedUF && selectedCity;
    const hasAddress =
      address.street &&
      address.number &&
      address.neighborhood &&
      address.city &&
      address.state &&
      address.postal_code;

    return Boolean(hasLocation && hasAddress);
  };

  const handleSave = async () => {
    await updateShipmentMutation.mutateAsync({
      installation_address_street: address.street,
      installation_address_number: address.number,
      installation_address_neighborhood: address.neighborhood,
      installation_address_city: address.city,
      installation_address_state: address.state,
      installation_address_postal_code: address.postal_code,
      installation_address_complement: address.complement || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isReadOnly ? "Informações de Envio" : "Preparar Envio"} - Pedido {order.number}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 p-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Localização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LocationSelector
                selectedUF={selectedUF}
                selectedCity={selectedCity}
                onUFChange={handleUFChange}
                onCityChange={handleCityChange}
                disabled={isReadOnly}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Endereço de Entrega</CardTitle>
            </CardHeader>
            <CardContent>
              <AddressForm address={address} onAddressChange={handleAddressChange} isReadOnly={isReadOnly} allowManualEntry />
            </CardContent>
          </Card>

          {!isReadOnly && (
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!isFormValid() || updateShipmentMutation.isPending}>
                {updateShipmentMutation.isPending ? "Salvando..." : "Salvar Informações"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShipmentPreparationModal;

