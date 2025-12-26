import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Order } from "@/services/orderService";
import {
  updateKitScheduleShipment,
  ShipmentAddress,
} from "@/services/shipmentService";
import { useToast } from "@/hooks/use-toast";
import { LocationSelector, AddressForm } from "./index";

interface ShipmentFormEmbeddedProps {
  order: Order;
  onUpdate?: () => void;
}

const ShipmentFormEmbedded = ({ order, onUpdate }: ShipmentFormEmbeddedProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedUF, setSelectedUF] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [trackingCode, setTrackingCode] = useState<string>("");
  const [address, setAddress] = useState<ShipmentAddress>({
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    postal_code: "",
    complement: "",
  });

  const updateShipmentMutation = useMutation({
    mutationFn: (data: {
      installation_address_street: string;
      installation_address_number: string;
      installation_address_neighborhood: string;
      installation_address_city: string;
      installation_address_state: string;
      installation_address_postal_code: string;
      installation_address_complement?: string;
      tracking_code?: string;
    }) => updateKitScheduleShipment(order.id, data),
    onSuccess: () => {
      toast({
        title: "Envio preparado",
        description: "Informações de envio salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["kit-schedules"] });
      onUpdate?.();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar informações de envio.",
        variant: "destructive",
      });
    },
  });

  // Load existing shipment data if available
  useEffect(() => {
    if (order.installation_address_state) setSelectedUF(order.installation_address_state);
    if (order.installation_address_city) setSelectedCity(order.installation_address_city);
    if (order.trackingCode) setTrackingCode(order.trackingCode);

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

  // Handle UF change
  const handleUFChange = (value: string) => {
    setSelectedUF(value);
    setSelectedCity("");
    setAddress((prev) => ({
      ...prev,
      state: value,
      city: "",
    }));
  };

  // Handle City change
  const handleCityChange = (value: string) => {
    setSelectedCity(value);
    setAddress((prev) => ({
      ...prev,
      city: value,
      state: selectedUF,
    }));
  };

  const handleAddressChange = (field: keyof ShipmentAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
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
      tracking_code: trackingCode || undefined,
    });
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

  return (
    <div className="space-y-4">
      {/* Location Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Localização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LocationSelector
            selectedUF={selectedUF}
            selectedCity={selectedCity}
            onUFChange={handleUFChange}
            onCityChange={handleCityChange}
            disabled={false}
          />
        </CardContent>
      </Card>

      {/* Address Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Endereço de Entrega</CardTitle>
        </CardHeader>
        <CardContent>
          <AddressForm
            address={address}
            onAddressChange={handleAddressChange}
            isReadOnly={false}
            allowManualEntry
          />
        </CardContent>
      </Card>

      {/* Tracking Code Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Código de Rastreio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="tracking_code">Código de Rastreio dos Correios</Label>
            <Input
              id="tracking_code"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              placeholder="Ex: AA123456789BR"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!isFormValid() || updateShipmentMutation.isPending}>
          {updateShipmentMutation.isPending ? "Salvando..." : "Salvar Informações de Envio"}
        </Button>
      </div>
    </div>
  );
};

export default ShipmentFormEmbedded;

