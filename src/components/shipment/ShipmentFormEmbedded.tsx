import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Order } from "@/services/orderService";
import {
  updateKitScheduleShipment,
  ShipmentAddress,
} from "@/services/shipmentService";
import { getTechnicians, Technician } from "@/services/technicianService";
import { KitScheduleWithDetails } from "@/services/kitScheduleService";
import { useToast } from "@/hooks/use-toast";
import { LocationSelector, AddressForm } from "./index";

interface ShipmentFormEmbeddedProps {
  order: Order;
  onUpdate?: () => void;
  schedule?: KitScheduleWithDetails;
}

const ShipmentFormEmbedded = ({ order, onUpdate, schedule }: ShipmentFormEmbeddedProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
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
  const [hasInitialized, setHasInitialized] = useState(false);

  // Fetch technicians
  const { data: technicians = [] } = useQuery({
    queryKey: ["technicians"],
    queryFn: getTechnicians,
  });

  // Handle technician selection
  const handleTechnicianChange = (technicianId: string) => {
    setSelectedTechnicianId(technicianId);
    
    const technician = technicians.find((t: Technician) => t.id === technicianId);
    if (technician) {
      // Fill address fields with technician's address
      setSelectedUF(technician.address_state || "");
      setSelectedCity(technician.address_city || "");
      setAddress({
        street: technician.address_street || "",
        number: technician.address_number || "",
        neighborhood: technician.address_neighborhood || "",
        city: technician.address_city || "",
        state: technician.address_state || "",
        postal_code: technician.postal_code || "",
        complement: "",
      });
    }
  };

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

  // Load tracking code if available
  useEffect(() => {
    if (order.trackingCode) setTrackingCode(order.trackingCode);
  }, [order]);

  // Pre-fill technician from schedule when technicians are loaded
  useEffect(() => {
    if (hasInitialized || technicians.length === 0) return;
    
    // Check if there's a technician from the schedule
    const scheduleTechnicianId = schedule?.technician_id;
    if (scheduleTechnicianId) {
      const technician = technicians.find((t: Technician) => t.id === scheduleTechnicianId);
      if (technician) {
        setSelectedTechnicianId(scheduleTechnicianId);
        // Fill address fields with technician's address
        setSelectedUF(technician.address_state || "");
        setSelectedCity(technician.address_city || "");
        setAddress({
          street: technician.address_street || "",
          number: technician.address_number || "",
          neighborhood: technician.address_neighborhood || "",
          city: technician.address_city || "",
          state: technician.address_state || "",
          postal_code: technician.postal_code || "",
          complement: "",
        });
        setHasInitialized(true);
      }
    }
  }, [technicians, schedule, hasInitialized]);

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
    const hasTrackingCode = trackingCode && trackingCode.trim() !== '';

    return Boolean(hasLocation && hasAddress && hasTrackingCode);
  };

  return (
    <div className="space-y-4">
      {/* Technician Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Técnico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="technician">Selecione o técnico</Label>
            <Select value={selectedTechnicianId} onValueChange={handleTechnicianChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um técnico" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((technician: Technician) => (
                  <SelectItem key={technician.id} value={technician.id!}>
                    {technician.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Ao selecionar um técnico, o endereço será preenchido automaticamente
            </p>
          </div>
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

