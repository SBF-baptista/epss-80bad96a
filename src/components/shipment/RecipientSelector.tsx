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
  newRecipientPhone: string;
  onNewRecipientPhoneChange: (value: string) => void;
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
  newRecipientPhone,
  onNewRecipientPhoneChange,
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
      {/* Smart recipient feedback with enhanced messaging */}
      {showRecipientSelector && (
        <div className="space-y-3">
          {hasMatchingRecipients && !selectedRecipientId && !isNewRecipient && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-2 text-blue-800">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {filteredRecipients.length === 1 
                    ? `Destinatário encontrado: ${filteredRecipients[0].name}`
                    : `${filteredRecipients.length} destinatários encontrados para ${selectedCity}, ${selectedUF}`
                  }
                </span>
              </div>
              {filteredRecipients.length === 1 && (
                <p className="text-xs text-blue-600 mt-1">
                  Endereço será preenchido automaticamente
                </p>
              )}
            </div>
          )}

          {selectedRecipientId && !isNewRecipient && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 text-green-800">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Destinatário: {filteredRecipients.find(r => r.id === selectedRecipientId)?.name}
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Endereço carregado automaticamente
              </p>
            </div>
          )}

          {isNewRecipient && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-center gap-2 text-amber-800">
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Criando novo destinatário para {selectedCity}, {selectedUF}
                </span>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                Preencha o nome e endereço completo
              </p>
            </div>
          )}

          {!hasMatchingRecipients && !isNewRecipient && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
              <div className="flex items-center gap-2 text-gray-700">
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Nenhum destinatário encontrado para {selectedCity}, {selectedUF}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Será necessário criar um novo destinatário
              </p>
            </div>
          )}
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
                        <div className="flex flex-col">
                          <span className="font-medium">{recipient.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {recipient.street}, {recipient.number} - {recipient.neighborhood}
                          </span>
                        </div>
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

      {/* New Recipient Name and Phone Inputs */}
      {isNewRecipient && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Nome do Destinatário *</Label>
            <Input
              value={newRecipientName}
              onChange={(e) => onNewRecipientNameChange(e.target.value)}
              placeholder="Digite o nome do destinatário"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone/WhatsApp *</Label>
            <Input
              value={newRecipientPhone}
              onChange={(e) => onNewRecipientPhoneChange(e.target.value)}
              placeholder="Digite o telefone com código do país (ex: +5511999999999)"
              disabled={disabled}
            />
          </div>
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