import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShipmentRecipient } from "@/services/shipmentService";
import { User, Plus } from "lucide-react";

interface RecipientSelectorProps {
  recipients: ShipmentRecipient[];
  selectedRecipientId: string;
  onRecipientChange: (value: string) => void;
  isNewRecipient: boolean;
  newRecipientName: string;
  onNewRecipientNameChange: (value: string) => void;
  selectedUF: string;
  selectedCity: string;
  disabled?: boolean;
}

const RecipientSelector = ({
  recipients,
  selectedRecipientId,
  onRecipientChange,
  isNewRecipient,
  newRecipientName,
  onNewRecipientNameChange,
  selectedUF,
  selectedCity,
  disabled = false,
}: RecipientSelectorProps) => {
  // Filter recipients based on selected location
  const filteredRecipients = recipients.filter(
    r => r.state === selectedUF && r.city === selectedCity
  );

  const showRecipientSelector = selectedUF && selectedCity;
  const hasMatchingRecipients = filteredRecipients.length > 0;

  return (
    <div className="space-y-4">
      {/* Auto-selected recipient feedback */}
      {showRecipientSelector && hasMatchingRecipients && !isNewRecipient && !selectedRecipientId && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2 text-blue-800">
            <User className="h-4 w-4" />
            <span className="text-sm">
              {filteredRecipients.length === 1 
                ? `Destinatário encontrado para ${selectedCity}, ${selectedUF}: ${filteredRecipients[0].name}`
                : `${filteredRecipients.length} destinatários encontrados para ${selectedCity}, ${selectedUF}`
              }
            </span>
          </div>
        </div>
      )}

      {/* Recipient Selection */}
      {showRecipientSelector && (
        <div className="space-y-2">
          <Label>Destinatário</Label>
          <Select 
            value={isNewRecipient ? "new" : selectedRecipientId} 
            onValueChange={onRecipientChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um destinatário" />
            </SelectTrigger>
            <SelectContent>
              {hasMatchingRecipients ? (
                <>
                  {filteredRecipients.map((recipient) => (
                    <SelectItem key={recipient.id} value={recipient.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{recipient.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="new">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Criar novo destinatário</span>
                    </div>
                  </SelectItem>
                </>
              ) : (
                <SelectItem value="new">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Criar novo destinatário</span>
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* New Recipient Name Input */}
      {isNewRecipient && (
        <div className="space-y-2">
          <Label>Nome do Destinatário *</Label>
          <Input
            value={newRecipientName}
            onChange={(e) => onNewRecipientNameChange(e.target.value)}
            placeholder="Digite o nome do destinatário"
            disabled={disabled}
          />
        </div>
      )}

      {/* No location selected message */}
      {!showRecipientSelector && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-600">
            Selecione o estado e cidade para ver os destinatários disponíveis
          </p>
        </div>
      )}
    </div>
  );
};

export default RecipientSelector;