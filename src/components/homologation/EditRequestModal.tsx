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
import { Package, Wrench, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface EditRequestModalProps {
  open: boolean;
  onClose: () => void;
  item: {
    id: string;
    item_name: string;
    item_type: 'accessory' | 'supply';
    description?: string | null;
  } | null;
}

export const EditRequestModal = ({ open, onClose, item }: EditRequestModalProps) => {
  const { user } = useAuth();
  const [newName, setNewName] = useState("");
  const [observation, setObservation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setNewName("");
    setObservation("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!item || !newName.trim()) {
      toast.error("Por favor, informe o novo nome desejado");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('item_edit_requests')
        .insert({
          item_type: item.item_type,
          item_name: item.item_name,
          original_data: {
            id: item.id,
            item_name: item.item_name,
            description: item.description || null
          },
          requested_changes: {
            item_name: newName.trim().toUpperCase()
          },
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
      console.error('Error submitting edit request:', error);
      toast.error("Erro ao enviar solicitação", {
        description: "Tente novamente mais tarde."
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item.item_type === 'accessory' ? (
              <Package className="h-5 w-5 text-blue-600" />
            ) : (
              <Wrench className="h-5 w-5 text-orange-600" />
            )}
            Solicitar Edição
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={
              item.item_type === 'accessory' 
                ? "bg-blue-100 text-blue-800" 
                : "bg-orange-100 text-orange-800"
            }>
              {item.item_type === 'accessory' ? 'Acessório' : 'Insumo'}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current-name" className="text-sm font-medium">
              Nome Atual
            </Label>
            <Input
              id="current-name"
              value={item.item_name}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-name" className="text-sm font-medium">
              Novo Nome Desejado <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Digite o novo nome..."
              className="uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observation" className="text-sm font-medium">
              Observação
            </Label>
            <Textarea
              id="observation"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Justifique a alteração solicitada..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Fechar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || !newName.trim()}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Enviando..." : "Enviar solicitação para aprovação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
