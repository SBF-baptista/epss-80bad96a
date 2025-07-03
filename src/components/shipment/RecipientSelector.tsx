import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShipmentRecipient } from "@/services/shipmentService";

interface RecipientSelectorProps {
  selectedRecipientId: string;
  isNewRecipient: boolean;
  newRecipientName: string;
  filteredRecipients: ShipmentRecipient[];
  onRecipientChange: (value: string) => void;
  onNewRecipientNameChange: (value: string) => void;
  disabled?: boolean;
  showSelection?: boolean;
}

const RecipientSelector = ({
  selectedRecipientId,
  isNewRecipient,
  newRecipientName,
  filteredRecipients,
  onRecipientChange,
  onNewRecipientNameChange,
  disabled = false,
  showSelection = true,
}: RecipientSelectorProps) => {
  if (!showSelection) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Recipient Selection */}
      <div className="space-y-2">
        <Label>Destinatário</Label>
        <Select 
          value={selectedRecipientId || (isNewRecipient ? "new" : "")} 
          onValueChange={onRecipientChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um destinatário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">+ Novo Destinatário</SelectItem>
            {filteredRecipients.map((recipient) => (
              <SelectItem key={recipient.id} value={recipient.id}>
                {recipient.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* New Recipient Name Input */}
      {isNewRecipient && (
        <div className="space-y-2">
          <Label htmlFor="recipientName">Nome do Destinatário</Label>
          <Input
            id="recipientName"
            value={newRecipientName}
            onChange={(e) => onNewRecipientNameChange(e.target.value)}
            placeholder="Digite o nome do destinatário"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};

export default RecipientSelector;