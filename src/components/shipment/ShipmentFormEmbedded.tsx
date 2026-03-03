import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
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
import { AddressForm } from "./index";
import { UserCheck, MapPin, Truck, CheckCircle, Package } from "lucide-react";

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
  const [selectedCarrier, setSelectedCarrier] = useState<string>("correios");
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

  const { data: technicians = [] } = useQuery({
    queryKey: ["technicians"],
    queryFn: getTechnicians,
  });

  const handleTechnicianChange = (technicianId: string) => {
    setSelectedTechnicianId(technicianId);
    const technician = technicians.find((t: Technician) => t.id === technicianId);
    if (technician) {
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
      await updateKitScheduleShipment(scheduleId, data);
    },
    onSuccess: () => {
      toast({
        title: "✅ Envio salvo com sucesso",
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

  useEffect(() => {
    if (schedule?.tracking_code) {
      setTrackingCode(schedule.tracking_code);
    } else if (order.trackingCode) {
      setTrackingCode(order.trackingCode);
    }
  }, [order, schedule]);

  useEffect(() => {
    if (hasInitialized || technicians.length === 0) return;
    const scheduleTechnicianId = schedule?.technician_id;
    if (scheduleTechnicianId) {
      const technician = technicians.find((t: Technician) => t.id === scheduleTechnicianId);
      if (technician) {
        setSelectedTechnicianId(scheduleTechnicianId);
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

  const handleSave = async () => {
    const activeTrackingCode = selectedCarrier === "correios" ? trackingCode : azulCargoTrackingCode;
    await updateShipmentMutation.mutateAsync({
      installation_address_street: address.street,
      installation_address_number: address.number,
      installation_address_neighborhood: address.neighborhood,
      installation_address_city: address.city,
      installation_address_state: address.state,
      installation_address_postal_code: address.postal_code,
      installation_address_complement: address.complement || undefined,
      tracking_code: activeTrackingCode || undefined,
    });
  };

  const activeTrackingCode = selectedCarrier === "correios" ? trackingCode : azulCargoTrackingCode;
  const isAddressComplete = address.street && address.number && address.neighborhood && address.city && address.state && address.postal_code;
  const hasTrackingCode = activeTrackingCode && activeTrackingCode.trim() !== '';
  const isFormValid = Boolean(isAddressComplete && hasTrackingCode);

  const technicianName = technicians.find((t: Technician) => t.id === selectedTechnicianId)?.name;

  // Tracking code validation patterns
  const isCorreiosValid = trackingCode && /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(trackingCode.toUpperCase());
  const isAzulValid = azulCargoTrackingCode && azulCargoTrackingCode.trim().length >= 5;

  return (
    <div className="space-y-6">
      {/* Section 1: Technician Info */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Técnico Responsável</h4>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3 border border-border/50">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <UserCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {technicianName || "Nenhum técnico atribuído"}
            </p>
            <p className="text-xs text-muted-foreground">Definido no agendamento</p>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">
            Agendamento
          </Badge>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-border/40" />

      {/* Section 2: Delivery Address */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Endereço de Entrega</h4>
          </div>
          {isAddressComplete && (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completo
            </Badge>
          )}
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4 shadow-sm">
          <AddressForm
            address={address}
            onAddressChange={handleAddressChange}
            isReadOnly={false}
            allowManualEntry
          />
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-border/40" />

      {/* Section 3: Tracking Code */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Código de Rastreio</h4>
        </div>

        {/* Carrier Selector */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelectedCarrier("correios")}
            className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
              selectedCarrier === "correios"
                ? "border-primary bg-primary/5 text-primary shadow-sm"
                : "border-border/50 bg-card text-muted-foreground hover:border-border hover:bg-muted/30"
            }`}
          >
            📦 Correios
          </button>
          <button
            type="button"
            onClick={() => setSelectedCarrier("azul")}
            className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
              selectedCarrier === "azul"
                ? "border-primary bg-primary/5 text-primary shadow-sm"
                : "border-border/50 bg-card text-muted-foreground hover:border-border hover:bg-muted/30"
            }`}
          >
            ✈️ Azul Cargo
          </button>
        </div>

        {/* Tracking Input */}
        <div className="rounded-lg border border-border/50 bg-card p-4 shadow-sm">
          {selectedCarrier === "correios" ? (
            <div className="space-y-2">
              <Label htmlFor="tracking_code" className="text-xs font-medium text-muted-foreground">
                Código de Rastreio dos Correios
              </Label>
              <Input
                id="tracking_code"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                placeholder="Ex: AA123456789BR"
                className={`font-mono text-base tracking-wider transition-colors ${
                  trackingCode
                    ? isCorreiosValid
                      ? "border-emerald-400 focus-visible:ring-emerald-500/30"
                      : "border-amber-400 focus-visible:ring-amber-500/30"
                    : ""
                }`}
              />
              {trackingCode && (
                <p className={`text-xs flex items-center gap-1 ${isCorreiosValid ? "text-emerald-600" : "text-amber-600"}`}>
                  {isCorreiosValid ? (
                    <><CheckCircle className="h-3 w-3" /> Formato válido</>
                  ) : (
                    <>⚠️ Formato esperado: AA123456789BR</>
                  )}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="azul_cargo_tracking_code" className="text-xs font-medium text-muted-foreground">
                Código Rastreio Azul Cargo
              </Label>
              <Input
                id="azul_cargo_tracking_code"
                value={azulCargoTrackingCode}
                onChange={(e) => setAzulCargoTrackingCode(e.target.value)}
                placeholder="Ex: AZL123456789"
                className={`font-mono text-base tracking-wider transition-colors ${
                  azulCargoTrackingCode
                    ? isAzulValid
                      ? "border-emerald-400 focus-visible:ring-emerald-500/30"
                      : "border-amber-400 focus-visible:ring-amber-500/30"
                    : ""
                }`}
              />
              {azulCargoTrackingCode && (
                <p className={`text-xs flex items-center gap-1 ${isAzulValid ? "text-emerald-600" : "text-amber-600"}`}>
                  {isAzulValid ? (
                    <><CheckCircle className="h-3 w-3" /> Código informado</>
                  ) : (
                    <>⚠️ Informe o código de rastreio</>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-2">
        <Button
          onClick={handleSave}
          disabled={!isFormValid || updateShipmentMutation.isPending}
          className="w-full h-12 text-base font-semibold shadow-md transition-all gap-2"
          size="lg"
        >
          {updateShipmentMutation.isPending ? (
            <>
              <Package className="h-5 w-5 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5" />
              Salvar Informações de Envio
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ShipmentFormEmbedded;
