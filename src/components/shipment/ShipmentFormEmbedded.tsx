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
  onClose?: () => void;
  schedule?: KitScheduleWithDetails;
}

const ShipmentFormEmbedded = ({ order, onUpdate, onClose, schedule }: ShipmentFormEmbeddedProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [selectedUF, setSelectedUF] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [trackingCode, setTrackingCode] = useState<string>("");
  const [azulCargoTrackingCode, setAzulCargoTrackingCode] = useState<string>("");
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

  // Use schedule.id if available, otherwise fall back to order.id
  const scheduleId = schedule?.id || order.id;

  const updateShipmentMutation = useMutation({
    mutationFn: async (data: {
      installation_address_street: string;
      installation_address_number: string;
      installation_address_neighborhood: string;
      installation_address_city: string;
      installation_address_state: string;
      installation_address_postal_code: string;
      installation_address_complement?: string;
      tracking_code?: string;
    }) => {
      // Save shipment data - status is automatically set to 'shipped' by the service if tracking_code is provided
      await updateKitScheduleShipment(scheduleId, data);
    },
    onSuccess: () => {
      toast({
        title: "Envio preparado",
        description: "Informações de envio salvas e pedido movido para Enviado.",
      });
      queryClient.invalidateQueries({ queryKey: ["kit-schedules"] });
      onUpdate?.();
      onClose?.();
    },
    onError: (error) => {
      console.error('Error saving shipment:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar informações de envio.",
        variant: "destructive",
      });
    },
  });

  // Load tracking code if available from schedule or order
  useEffect(() => {
    if (schedule?.tracking_code) {
      setTrackingCode(schedule.tracking_code);
    } else if (order.trackingCode) {
      setTrackingCode(order.trackingCode);
    }
  }, [order, schedule]);

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
    <div className="space-y-5">
      {/* Technician Selection */}
      <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/50 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
            📦 Técnico Responsável
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label htmlFor="technician" className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              Selecione o técnico
            </Label>
            <Select value={selectedTechnicianId} onValueChange={handleTechnicianChange}>
              <SelectTrigger className="bg-white dark:bg-background border-2 border-blue-400 dark:border-blue-600 font-medium text-foreground">
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
            <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
              💡 Ao selecionar um técnico, o endereço será preenchido automaticamente
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Address Section */}
      <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/50 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
            📍 Endereço de Entrega
          </CardTitle>
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
      <Card className="border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
            🚚 Código de Rastreio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tracking_code" className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Código de Rastreio dos Correios
              </Label>
              <Input
                id="tracking_code"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="Ex: AA123456789BR"
                className="bg-white dark:bg-background border-2 border-emerald-400 dark:border-emerald-600 font-mono text-lg font-semibold tracking-wider"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="azul_cargo_tracking_code" className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                Código Rastreio Azul Cargo
              </Label>
              <Input
                id="azul_cargo_tracking_code"
                value={azulCargoTrackingCode}
                onChange={(e) => setAzulCargoTrackingCode(e.target.value)}
                placeholder="Ex: AZL123456789"
                className="bg-white dark:bg-background border-2 border-blue-400 dark:border-blue-600 font-mono text-lg font-semibold tracking-wider"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="flex justify-end pt-2">
        <Button 
          onClick={handleSave} 
          disabled={!isFormValid() || updateShipmentMutation.isPending} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base px-6 py-3 shadow-lg"
          size="lg"
        >
          {updateShipmentMutation.isPending ? "Salvando..." : "✅ Salvar Informações de Envio"}
        </Button>
      </div>
    </div>
  );
};

export default ShipmentFormEmbedded;

