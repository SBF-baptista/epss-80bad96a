import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ShipmentAddress } from "@/services/shipmentService";

interface AddressFormProps {
  address: ShipmentAddress;
  onAddressChange: (field: keyof ShipmentAddress, value: string) => void;
  addressPasteInput: string;
  onAddressPasteInputChange: (value: string) => void;
  onAddressPaste: () => void;
  isReadOnly?: boolean;
  allowManualEntry?: boolean;
  showPasteOption?: boolean;
}

const AddressForm = ({
  address,
  onAddressChange,
  addressPasteInput,
  onAddressPasteInputChange,
  onAddressPaste,
  isReadOnly = false,
  allowManualEntry = true,
  showPasteOption = true,
}: AddressFormProps) => {
  const isFieldDisabled = (field: keyof ShipmentAddress) => {
    if (isReadOnly) return true;
    if (field === 'city' || field === 'state') return true; // Always read-only from selection
    return !allowManualEntry;
  };

  return (
    <div className="space-y-4">
      {/* Address Paste Option */}
      {!isReadOnly && allowManualEntry && showPasteOption && (
        <>
          <div className="space-y-2">
            <Label>Cole o endereço completo (opcional)</Label>
            <div className="flex gap-2">
              <Textarea
                value={addressPasteInput}
                onChange={(e) => onAddressPasteInputChange(e.target.value)}
                placeholder="Ex: Rua das Palmeiras 123, Centro, São Paulo - SP, 04567-000"
                rows={2}
                className="flex-1"
              />
              <Button 
                type="button"
                variant="outline"
                onClick={onAddressPaste}
                disabled={!addressPasteInput.trim()}
              >
                Processar
              </Button>
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Address Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="street">Rua/Logradouro</Label>
          <Input
            id="street"
            value={address.street}
            onChange={(e) => onAddressChange('street', e.target.value)}
            disabled={isFieldDisabled('street')}
            placeholder="Digite a rua"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="number">Número</Label>
          <Input
            id="number"
            value={address.number}
            onChange={(e) => onAddressChange('number', e.target.value)}
            disabled={isFieldDisabled('number')}
            placeholder="Digite o número"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="neighborhood">Bairro</Label>
          <Input
            id="neighborhood"
            value={address.neighborhood}
            onChange={(e) => onAddressChange('neighborhood', e.target.value)}
            disabled={isFieldDisabled('neighborhood')}
            placeholder="Digite o bairro"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            value={address.city}
            onChange={(e) => onAddressChange('city', e.target.value)}
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
            onChange={(e) => onAddressChange('state', e.target.value)}
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
            onChange={(e) => onAddressChange('postal_code', e.target.value)}
            disabled={isFieldDisabled('postal_code')}
            placeholder="00000-000"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="complement">Complemento</Label>
          <Input
            id="complement"
            value={address.complement}
            onChange={(e) => onAddressChange('complement', e.target.value)}
            disabled={isFieldDisabled('complement')}
            placeholder="Apto, bloco, andar, etc. (opcional)"
          />
        </div>
      </div>
    </div>
  );
};

export default AddressForm;