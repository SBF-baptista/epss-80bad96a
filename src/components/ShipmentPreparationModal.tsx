import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Order } from "@/services/orderService";
import {
  fetchShipmentRecipients,
  createShipmentRecipient,
  updateOrderShipment,
  parseAddress,
  ShipmentAddress,
} from "@/services/shipmentService";
import { useToast } from "@/hooks/use-toast";
import { LocationSelector, AddressForm } from "./shipment";

interface ShipmentPreparationModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const ShipmentPreparationModal = ({
  order,
  isOpen,
  onClose,
  onUpdate,
}: ShipmentPreparationModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedUF, setSelectedUF] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");
  const [isNewRecipient, setIsNewRecipient] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState("");
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
    mutationFn: (data: any) => updateOrderShipment(order.id, data),
    onSuccess: () => {
      toast({
        title: "Envio preparado",
        description: "Informações de envio salvas com sucesso.",
      });
      onUpdate();
      onClose();
    },
  });

  const isReadOnly = order.status === "enviado";

  console.log('ShipmentPreparationModal opened with order:', order);
  console.log('Is read only:', isReadOnly);

  // Get filtered recipients based on UF and City selection
  const getFilteredRecipients = () => {
    if (!selectedUF || !selectedCity) return [];
    return recipients.filter(r => r.state === selectedUF && r.city === selectedCity);
  };

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
  }, [order, recipients]);

  // Handle UF change
  const handleUFChange = (value: string) => {
    setSelectedUF(value);
    setSelectedCity("");
    setSelectedRecipientId("");
    setIsNewRecipient(false);
    setAddress(prev => ({ ...prev, state: value, city: "" }));
  };

  // Handle City change
  const handleCityChange = (value: string) => {
    setSelectedCity(value);
    setSelectedRecipientId("");
    setIsNewRecipient(false);
    setAddress(prev => ({ ...prev, city: value }));
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
      let recipientId = selectedRecipientId;

      // Create new recipient if needed
      if (isNewRecipient && newRecipientName.trim()) {
        const newRecipient = await createRecipientMutation.mutateAsync({
          name: newRecipientName,
          ...address,
        });
        recipientId = newRecipient.id;
      }

      // Update order with shipment information
      await updateShipmentMutation.mutateAsync({
        shipment_recipient_id: recipientId || undefined,
        shipment_address_street: address.street,
        shipment_address_number: address.number,
        shipment_address_neighborhood: address.neighborhood,
        shipment_address_city: address.city,
        shipment_address_state: address.state,
        shipment_address_postal_code: address.postal_code,
        shipment_address_complement: address.complement || undefined,
        shipment_prepared_at: new Date().toISOString(),
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {isReadOnly ? "Informações de Envio" : "Preparar Envio"} - Pedido {order.number}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 p-1">
          {/* Location and Recipient Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Localização e Destinatário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isReadOnly ? (
                <>
                  {/* Location Selector */}
                  <LocationSelector
                    selectedUF={selectedUF}
                    selectedCity={selectedCity}
                    onUFChange={handleUFChange}
                    onCityChange={handleCityChange}
                    disabled={isReadOnly}
                  />

                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium">
                      Estado: {order.shipment_address_state || "N/A"}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium">
                      Cidade: {order.shipment_address_city || "N/A"}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium">
                      Destinatário: {recipients.find(r => r.id === order.shipment_recipient_id)?.name || "Destinatário customizado"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Address Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Endereço de Entrega</CardTitle>
            </CardHeader>
            <CardContent>
              <AddressForm
                address={address}
                onAddressChange={handleAddressChange}
                addressPasteInput={addressPasteInput}
                onAddressPasteInputChange={setAddressPasteInput}
                onAddressPaste={handleAddressPaste}
                isReadOnly={isReadOnly}
                allowManualEntry={isNewRecipient || !selectedRecipientId}
                showPasteOption={isNewRecipient || !selectedRecipientId}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {!isReadOnly && (
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!isFormValid() || updateShipmentMutation.isPending}
              >
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
