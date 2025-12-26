import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Order } from "@/services/orderService";
import {
  fetchShipmentRecipients,
  createShipmentRecipient,
  updateKitScheduleShipment,
  parseAddress,
  ShipmentAddress,
} from "@/services/shipmentService";
import { useToast } from "@/hooks/use-toast";
import { LocationSelector, AddressForm, RecipientSelector } from "./index";

interface ShipmentFormEmbeddedProps {
  order: Order;
  onUpdate?: () => void;
}

const ShipmentFormEmbedded = ({ order, onUpdate }: ShipmentFormEmbeddedProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedUF, setSelectedUF] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");
  const [isNewRecipient, setIsNewRecipient] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState("");
  const [newRecipientPhone, setNewRecipientPhone] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [addressPasteInput, setAddressPasteInput] = useState("");
  const [address, setAddress] = useState<ShipmentAddress>({
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    postal_code: "",
    complement: "",
  });

  const { data: recipients = [] } = useQuery({
    queryKey: ['shipment-recipients'],
    queryFn: fetchShipmentRecipients,
  });

  const createRecipientMutation = useMutation({
    mutationFn: createShipmentRecipient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment-recipients'] });
      toast({
        title: "Destinatário criado",
        description: "Novo destinatário adicionado com sucesso.",
      });
    },
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
    }) => updateKitScheduleShipment(order.id, data),
    onSuccess: () => {
      toast({
        title: "Envio preparado",
        description: "Informações de envio salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['kit-schedules'] });
      onUpdate?.();
    },
  });

  // Load existing shipment data if available
  useEffect(() => {
    if (order.shipment_recipient_id) {
      setSelectedRecipientId(order.shipment_recipient_id);
      const recipient = recipients.find(r => r.id === order.shipment_recipient_id);
      if (recipient) {
        setSelectedUF(recipient.state);
        setSelectedCity(recipient.city);
      }
    }
    if (order.shipment_address_state) {
      setSelectedUF(order.shipment_address_state);
    }
    if (order.shipment_address_city) {
      setSelectedCity(order.shipment_address_city);
    }
    if (order.shipment_address_street) {
      setAddress({
        street: order.shipment_address_street || "",
        number: order.shipment_address_number || "",
        neighborhood: order.shipment_address_neighborhood || "",
        city: order.shipment_address_city || "",
        state: order.shipment_address_state || "",
        postal_code: order.shipment_address_postal_code || "",
        complement: order.shipment_address_complement || "",
      });
    }
    setTrackingCode(order.trackingCode || "");
  }, [order, recipients]);

  // Handle UF change
  const handleUFChange = (value: string) => {
    setSelectedUF(value);
    setSelectedCity("");
    setSelectedRecipientId("");
    setIsNewRecipient(false);
    setAddress(prev => ({ ...prev, state: value, city: "" }));
  };

  // Handle City change with auto-selection and smart pre-filling
  const handleCityChange = (value: string) => {
    setSelectedCity(value);
    setAddress(prev => ({ ...prev, city: value }));
    
    // Auto-select recipient based on location
    const filteredRecipients = recipients.filter(r => r.state === selectedUF && r.city === value);
    
    if (filteredRecipients.length === 1) {
      // Auto-select the only recipient and pre-fill address
      const recipient = filteredRecipients[0];
      setSelectedRecipientId(recipient.id);
      setIsNewRecipient(false);
      setAddress({
        street: recipient.street,
        number: recipient.number,
        neighborhood: recipient.neighborhood,
        city: recipient.city,
        state: recipient.state,
        postal_code: recipient.postal_code,
        complement: recipient.complement || "",
      });
      
      toast({
        title: "Destinatário selecionado automaticamente",
        description: `${recipient.name} foi selecionado e o endereço foi preenchido automaticamente.`,
      });
    } else if (filteredRecipients.length > 1) {
      // Multiple recipients - clear selection but keep location
      setSelectedRecipientId("");
      setIsNewRecipient(false);
      setAddress(prev => ({
        street: "",
        number: "",
        neighborhood: "",
        city: value,
        state: selectedUF,
        postal_code: "",
        complement: "",
      }));
    } else {
      // No recipients found - prepare for new recipient creation
      setSelectedRecipientId("");
      setIsNewRecipient(false);
      setAddress(prev => ({
        street: "",
        number: "",
        neighborhood: "",
        city: value,
        state: selectedUF,
        postal_code: "",
        complement: "",
      }));
    }
  };

  const handleRecipientChange = (value: string) => {
    if (value === "new") {
      setIsNewRecipient(true);
      setSelectedRecipientId("");
      // Keep the selected UF and City, clear other fields
      setAddress({
        street: "",
        number: "",
        neighborhood: "",
        city: selectedCity,
        state: selectedUF,
        postal_code: "",
        complement: "",
      });
      toast({
        title: "Novo destinatário",
        description: "Preencha as informações do novo destinatário.",
      });
    } else {
      setIsNewRecipient(false);
      setSelectedRecipientId(value);
      
      const recipient = recipients.find(r => r.id === value);
      if (recipient) {
        setAddress({
          street: recipient.street,
          number: recipient.number,
          neighborhood: recipient.neighborhood,
          city: recipient.city,
          state: recipient.state,
          postal_code: recipient.postal_code,
          complement: recipient.complement || "",
        });
        toast({
          title: "Destinatário selecionado",
          description: `Endereço de ${recipient.name} carregado automaticamente.`,
        });
      }
    }
  };

  const handleAddressPaste = () => {
    if (addressPasteInput.trim()) {
      const parsedAddress = parseAddress(addressPasteInput);
      setAddress(prev => ({
        ...prev,
        ...parsedAddress,
      }));
      setAddressPasteInput("");
      toast({
        title: "Endereço processado",
        description: "Verifique os campos preenchidos automaticamente.",
      });
    }
  };

  const handleAddressChange = (field: keyof ShipmentAddress, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      // Create new recipient if needed (for future reference)
      if (isNewRecipient && newRecipientName.trim()) {
        await createRecipientMutation.mutateAsync({
          name: newRecipientName,
          phone: newRecipientPhone,
          ...address,
        });
      }

      // Update kit_schedule with shipment address information
      await updateShipmentMutation.mutateAsync({
        installation_address_street: address.street,
        installation_address_number: address.number,
        installation_address_neighborhood: address.neighborhood,
        installation_address_city: address.city,
        installation_address_state: address.state,
        installation_address_postal_code: address.postal_code,
        installation_address_complement: address.complement || undefined,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar informações de envio.",
        variant: "destructive",
      });
    }
  };

  const isFormValid = () => {
    const hasLocation = selectedUF && selectedCity;
    const hasRecipient = selectedRecipientId || (isNewRecipient && newRecipientName.trim());
    const hasAddress = address.street && address.number && address.neighborhood && 
                     address.city && address.state && address.postal_code;
    return hasLocation && hasRecipient && hasAddress;
  };

  return (
    <div className="space-y-4">
      {/* Location and Recipient Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Localização e Destinatário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location Selector */}
          <LocationSelector
            selectedUF={selectedUF}
            selectedCity={selectedCity}
            onUFChange={handleUFChange}
            onCityChange={handleCityChange}
            disabled={false}
          />

          {/* Recipient Selector */}
          <RecipientSelector
            recipients={recipients}
            selectedRecipientId={selectedRecipientId}
            onRecipientChange={handleRecipientChange}
            isNewRecipient={isNewRecipient}
            newRecipientName={newRecipientName}
            onNewRecipientNameChange={setNewRecipientName}
            newRecipientPhone={newRecipientPhone}
            onNewRecipientPhoneChange={setNewRecipientPhone}
            selectedUF={selectedUF}
            selectedCity={selectedCity}
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
            addressPasteInput={addressPasteInput}
            onAddressPasteInputChange={setAddressPasteInput}
            onAddressPaste={handleAddressPaste}
            isReadOnly={false}
            allowManualEntry={isNewRecipient || !selectedRecipientId}
            showPasteOption={isNewRecipient || !selectedRecipientId}
          />
        </CardContent>
      </Card>

      {/* Tracking Code Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Código de Rastreamento (Correios)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="trackingCode">Código de Rastreamento</Label>
            <Input
              id="trackingCode"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              placeholder="Ex: AA123456789BR"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={!isFormValid() || updateShipmentMutation.isPending}
        >
          {updateShipmentMutation.isPending ? "Salvando..." : "Salvar Informações de Envio"}
        </Button>
      </div>
    </div>
  );
};

export default ShipmentFormEmbedded;
