import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShipmentAddress } from "@/services/shipmentService";

interface AddressFormProps {
  address: ShipmentAddress;
  onAddressChange: (field: keyof ShipmentAddress, value: string) => void;
  isReadOnly?: boolean;
  allowManualEntry?: boolean;
}

const AddressForm = ({
  address,
  onAddressChange,
  isReadOnly = false,
  allowManualEntry = true,
}: AddressFormProps) => {
  const isFieldDisabled = (field: keyof ShipmentAddress) => {
    if (isReadOnly) return true;
    if (field === "city" || field === "state") return true; // Always read-only from selection
    return false;
  };

  const hasPrefilledAddress = address.street && address.number && address.neighborhood;

  return (
    <div className="space-y-4">
      {/* Pre-filled address notification */}
      {hasPrefilledAddress && !allowManualEntry && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800 font-medium">
            📍 Endereço carregado automaticamente do destinatário selecionado
          </p>
          <p className="text-xs text-green-600 mt-1">
            Os campos de endereço foram preenchidos. Você pode editá-los se necessário.
          </p>
        </div>
      )}

      {/* Address Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="street">Rua/Logradouro</Label>
          <Input
            id="street"
            value={address.street}
            onChange={(e) => onAddressChange("street", e.target.value)}
            disabled={isFieldDisabled("street")}
            placeholder="Digite a rua"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="number">Número</Label>
          <Input
            id="number"
            value={address.number}
            onChange={(e) => onAddressChange("number", e.target.value)}
            disabled={isFieldDisabled("number")}
            placeholder="Digite o número"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="neighborhood">Bairro</Label>
          <Input
            id="neighborhood"
            value={address.neighborhood}
            onChange={(e) => onAddressChange("neighborhood", e.target.value)}
            disabled={isFieldDisabled("neighborhood")}
            placeholder="Digite o bairro"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            value={address.city}
            onChange={(e) => onAddressChange("city", e.target.value)}
            disabled
            placeholder="Cidade será preenchida automaticamente"
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">Estado (UF)</Label>
          <Input
            id="state"
            value={address.state}
            onChange={(e) => onAddressChange("state", e.target.value)}
            disabled
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
            onChange={(e) => onAddressChange("postal_code", e.target.value)}
            disabled={isFieldDisabled("postal_code")}
            placeholder="00000-000"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="complement">Complemento</Label>
          <Input
            id="complement"
            value={address.complement}
            onChange={(e) => onAddressChange("complement", e.target.value)}
            disabled={isFieldDisabled("complement")}
            placeholder="Apto, bloco, andar, etc. (opcional)"
          />
        </div>
      </div>
    </div>
  );
};

export default AddressForm;
