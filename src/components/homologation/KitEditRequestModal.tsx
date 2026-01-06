import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BoxIcon, Send, Package, Wrench, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { HomologationKit, HomologationKitItem } from "@/services/homologationKitService";

interface KitEditRequestModalProps {
  open: boolean;
  onClose: () => void;
  kit: HomologationKit | null;
}

export const KitEditRequestModal = ({ open, onClose, kit }: KitEditRequestModalProps) => {
  const { user } = useAuth();
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [observation, setObservation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setNewName("");
    setNewDescription("");
    setObservation("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!kit) {
      toast.error("Nenhum kit selecionado");
      return;
    }

    // At least the name should be different
    const hasNameChange = newName.trim() && newName.trim().toUpperCase() !== kit.name.toUpperCase();
    const hasDescriptionChange = newDescription.trim() !== (kit.description || '');
    
    if (!hasNameChange && !hasDescriptionChange) {
      toast.error("Por favor, informe uma alteração");
      return;
    }

    setSubmitting(true);
    try {
      const requestedChanges: Record<string, any> = {};
      if (hasNameChange) {
        requestedChanges.name = newName.trim().toUpperCase();
      }
      if (hasDescriptionChange) {
        requestedChanges.description = newDescription.trim();
      }

      const { error } = await supabase
        .from('item_edit_requests')
        .insert({
          item_type: 'kit',
          item_name: kit.name,
          kit_id: kit.id,
          original_data: {
            id: kit.id,
            name: kit.name,
            description: kit.description || null,
            equipment: kit.equipment.map(e => ({ item_name: e.item_name, quantity: e.quantity })),
            accessories: kit.accessories.map(a => ({ item_name: a.item_name, quantity: a.quantity })),
            supplies: kit.supplies.map(s => ({ item_name: s.item_name, quantity: s.quantity }))
          },
          requested_changes: requestedChanges,
          reason: observation.trim() || null,
          requested_by: user?.id,
          status: 'pending'
        });

      if (error) throw error;

      toast.success("Solicitação enviada com sucesso", {
        description: "O gestor irá analisar sua solicitação de edição."
      });
      handleClose();
    } catch (error) {
      console.error('Error submitting kit edit request:', error);
      toast.error("Erro ao enviar solicitação", {
        description: "Tente novamente mais tarde."
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!kit) return null;

  const renderItemsList = (items: HomologationKitItem[], type: 'equipment' | 'accessory' | 'supply') => {
    const icons = {
      equipment: <Zap className="h-3 w-3" />,
      accessory: <Package className="h-3 w-3" />,
      supply: <Wrench className="h-3 w-3" />
    };
    const labels = {
      equipment: 'Equipamentos',
      accessory: 'Acessórios',
      supply: 'Insumos'
    };
    const colors = {
      equipment: 'bg-purple-100 text-purple-800',
      accessory: 'bg-blue-100 text-blue-800',
      supply: 'bg-orange-100 text-orange-800'
    };

    if (items.length === 0) return null;

    return (
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground">{labels[type]}</span>
        <div className="flex flex-wrap gap-1">
          {items.map((item, index) => (
            <Badge key={index} variant="secondary" className={`text-xs ${colors[type]}`}>
              {icons[type]}
              <span className="ml-1">{item.item_name} x{item.quantity}</span>
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BoxIcon className="h-5 w-5 text-primary" />
            Solicitar Edição de Kit
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 py-4 pr-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <BoxIcon className="h-3 w-3 mr-1" />
                Kit
              </Badge>
            </div>

            {/* Current Kit Info */}
            <div className="p-3 bg-muted rounded-lg space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Nome Atual</Label>
                <p className="font-medium">{kit.name}</p>
              </div>
              {kit.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Descrição Atual</Label>
                  <p className="text-sm">{kit.description}</p>
                </div>
              )}
              <div className="space-y-2">
                {renderItemsList(kit.equipment, 'equipment')}
                {renderItemsList(kit.accessories, 'accessory')}
                {renderItemsList(kit.supplies, 'supply')}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-kit-name" className="text-sm font-medium">
                Novo Nome
              </Label>
              <Input
                id="new-kit-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Digite o novo nome do kit..."
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-kit-description" className="text-sm font-medium">
                Nova Descrição
              </Label>
              <Input
                id="new-kit-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Digite a nova descrição..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kit-observation" className="text-sm font-medium">
                Observação
              </Label>
              <Textarea
                id="kit-observation"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Justifique a alteração solicitada..."
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Fechar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || (!newName.trim() && !newDescription.trim())}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Enviando..." : "Enviar solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
