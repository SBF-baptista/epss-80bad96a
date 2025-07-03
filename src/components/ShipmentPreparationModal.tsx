import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Order } from "@/services/orderService";
import {
  fetchShipmentRecipients,
  createShipmentRecipient,
  updateOrderShipment,
  parseAddress,
  ShipmentRecipient,
  ShipmentAddress,
} from "@/services/shipmentService";
import { useToast } from "@/hooks/use-toast";

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

  // Brazilian states
  const brazilianStates = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];

  // Cities by state (simplified list - you can expand this)
  const citiesByState: Record<string, string[]> = {
    "SP": ["São Paulo", "Campinas", "Santos", "Ribeirão Preto", "Sorocaba"],
    "RJ": ["Rio de Janeiro", "Niterói", "Duque de Caxias", "Nova Iguaçu", "São Gonçalo"],
    "MG": ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora", "Betim"],
    "RS": ["Porto Alegre", "Caxias do Sul", "Pelotas", "Canoas", "Santa Maria"],
    "PR": ["Curitiba", "Londrina", "Maringá", "Ponta Grossa", "Cascavel"],
    // Add more states and cities as needed
  };

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

  // Get available cities for selected UF
  const getAvailableCities = () => {
    if (!selectedUF) return [];
    return citiesByState[selectedUF] || [];
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
                  {/* UF Selection */}
                  <div className="space-y-2">
                    <Label>UF (Estado)</Label>
                    <Select value={selectedUF} onValueChange={handleUFChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {brazilianStates.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* City Selection */}
                  {selectedUF && (
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Select value={selectedCity} onValueChange={handleCityChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a cidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableCities().map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Recipient Selection */}
                  {selectedUF && selectedCity && (
                    <div className="space-y-2">
                      <Label>Destinatário</Label>
                      <Select value={selectedRecipientId || (isNewRecipient ? "new" : "")} onValueChange={handleRecipientChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um destinatário" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">+ Novo Destinatário</SelectItem>
                          {getFilteredRecipients().map((recipient) => (
                            <SelectItem key={recipient.id} value={recipient.id}>
                              {recipient.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {isNewRecipient && selectedUF && selectedCity && (
                    <div className="space-y-2">
                      <Label htmlFor="recipientName">Nome do Destinatário</Label>
                      <Input
                        id="recipientName"
                        value={newRecipientName}
                        onChange={(e) => setNewRecipientName(e.target.value)}
                        placeholder="Digite o nome do destinatário"
                      />
                    </div>
                  )}
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
            <CardContent className="space-y-4">
              {!isReadOnly && (isNewRecipient || !selectedRecipientId) && (
                <div className="space-y-2">
                  <Label>Cole o endereço completo (opcional)</Label>
                  <div className="flex gap-2">
                    <Textarea
                      value={addressPasteInput}
                      onChange={(e) => setAddressPasteInput(e.target.value)}
                      placeholder="Ex: Rua das Palmeiras 123, Centro, São Paulo - SP, 04567-000"
                      rows={2}
                      className="flex-1"
                    />
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={handleAddressPaste}
                      disabled={!addressPasteInput.trim()}
                    >
                      Processar
                    </Button>
                  </div>
                  <Separator />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="street">Rua/Logradouro</Label>
                  <Input
                    id="street"
                    value={address.street}
                    onChange={(e) => setAddress(prev => ({ ...prev, street: e.target.value }))}
                    disabled={isReadOnly || (!isNewRecipient && !!selectedRecipientId)}
                    placeholder="Digite a rua"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={address.number}
                    onChange={(e) => setAddress(prev => ({ ...prev, number: e.target.value }))}
                    disabled={isReadOnly || (!isNewRecipient && !!selectedRecipientId)}
                    placeholder="Digite o número"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={address.neighborhood}
                    onChange={(e) => setAddress(prev => ({ ...prev, neighborhood: e.target.value }))}
                    disabled={isReadOnly || (!isNewRecipient && !!selectedRecipientId)}
                    placeholder="Digite o bairro"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={address.city}
                    onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                    disabled={true}
                    placeholder="Cidade será preenchida automaticamente"
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">Estado (UF)</Label>
                  <Input
                    id="state"
                    value={address.state}
                    onChange={(e) => setAddress(prev => ({ ...prev, state: e.target.value }))}
                    disabled={true}
                    placeholder="Estado será preenchido automaticamente"
                    className="bg-muted"
                    maxLength={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">CEP</Label>
                  <Input
                    id="postalCode"
                    value={address.postal_code}
                    onChange={(e) => setAddress(prev => ({ ...prev, postal_code: e.target.value }))}
                    disabled={isReadOnly || (!isNewRecipient && !!selectedRecipientId)}
                    placeholder="00000-000"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={address.complement}
                    onChange={(e) => setAddress(prev => ({ ...prev, complement: e.target.value }))}
                    disabled={isReadOnly || (!isNewRecipient && !!selectedRecipientId)}
                    placeholder="Apto, bloco, andar, etc. (opcional)"
                  />
                </div>
              </div>
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