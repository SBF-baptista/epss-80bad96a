import { useState, useEffect } from "react";
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
import { BoxIcon, Send, Package, Wrench, Zap, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { HomologationKit, HomologationKitItem } from "@/services/homologationKitService";

interface KitEditRequestModalProps {
  open: boolean;
  onClose: () => void;
  kit: HomologationKit | null;
}

interface EditableItem {
  item_name: string;
  quantity: number;
}

export const KitEditRequestModal = ({ open, onClose, kit }: KitEditRequestModalProps) => {
  const { user } = useAuth();
  const [observation, setObservation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Editable items state
  const [equipment, setEquipment] = useState<EditableItem[]>([]);
  const [accessories, setAccessories] = useState<EditableItem[]>([]);
  const [supplies, setSupplies] = useState<EditableItem[]>([]);

  // Initialize state when kit changes
  useEffect(() => {
    if (kit) {
      setEquipment(kit.equipment.map(e => ({ item_name: e.item_name, quantity: e.quantity })));
      setAccessories(kit.accessories.map(a => ({ item_name: a.item_name, quantity: a.quantity })));
      setSupplies(kit.supplies.map(s => ({ item_name: s.item_name, quantity: s.quantity })));
    }
  }, [kit]);

  const handleClose = () => {
    setObservation("");
    if (kit) {
      setEquipment(kit.equipment.map(e => ({ item_name: e.item_name, quantity: e.quantity })));
      setAccessories(kit.accessories.map(a => ({ item_name: a.item_name, quantity: a.quantity })));
      setSupplies(kit.supplies.map(s => ({ item_name: s.item_name, quantity: s.quantity })));
    }
    onClose();
  };

  const hasChanges = () => {
    if (!kit) return false;
    
    const equipmentChanged = JSON.stringify(equipment) !== JSON.stringify(kit.equipment.map(e => ({ item_name: e.item_name, quantity: e.quantity })));
    const accessoriesChanged = JSON.stringify(accessories) !== JSON.stringify(kit.accessories.map(a => ({ item_name: a.item_name, quantity: a.quantity })));
    const suppliesChanged = JSON.stringify(supplies) !== JSON.stringify(kit.supplies.map(s => ({ item_name: s.item_name, quantity: s.quantity })));
    
    return equipmentChanged || accessoriesChanged || suppliesChanged;
  };

  const handleSubmit = async () => {
    if (!kit) {
      toast.error("Nenhum kit selecionado");
      return;
    }

    if (!hasChanges()) {
      toast.error("Por favor, faça alguma alteração nos itens");
      return;
    }

    setSubmitting(true);
    try {
      const requestedChanges: Record<string, any> = {};
      
      const equipmentChanged = JSON.stringify(equipment) !== JSON.stringify(kit.equipment.map(e => ({ item_name: e.item_name, quantity: e.quantity })));
      const accessoriesChanged = JSON.stringify(accessories) !== JSON.stringify(kit.accessories.map(a => ({ item_name: a.item_name, quantity: a.quantity })));
      const suppliesChanged = JSON.stringify(supplies) !== JSON.stringify(kit.supplies.map(s => ({ item_name: s.item_name, quantity: s.quantity })));
      
      if (equipmentChanged) {
        requestedChanges.equipment = equipment.filter(e => e.item_name.trim());
      }
      if (accessoriesChanged) {
        requestedChanges.accessories = accessories.filter(a => a.item_name.trim());
      }
      if (suppliesChanged) {
        requestedChanges.supplies = supplies.filter(s => s.item_name.trim());
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

  const updateItem = (
    type: 'equipment' | 'accessories' | 'supplies',
    index: number,
    field: 'item_name' | 'quantity',
    value: string | number
  ) => {
    const setters = { equipment: setEquipment, accessories: setAccessories, supplies: setSupplies };
    const lists = { equipment, accessories, supplies };
    
    const newList = [...lists[type]];
    newList[index] = { ...newList[index], [field]: value };
    setters[type](newList);
  };

  const addItem = (type: 'equipment' | 'accessories' | 'supplies') => {
    const setters = { equipment: setEquipment, accessories: setAccessories, supplies: setSupplies };
    const lists = { equipment, accessories, supplies };
    setters[type]([...lists[type], { item_name: '', quantity: 1 }]);
  };

  const removeItem = (type: 'equipment' | 'accessories' | 'supplies', index: number) => {
    const setters = { equipment: setEquipment, accessories: setAccessories, supplies: setSupplies };
    const lists = { equipment, accessories, supplies };
    setters[type](lists[type].filter((_, i) => i !== index));
  };

  if (!kit) return null;

  const renderEditableSection = (
    type: 'equipment' | 'accessories' | 'supplies',
    items: EditableItem[],
    label: string,
    icon: React.ReactNode,
    colorClass: string
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          {icon}
          {label}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => addItem(type)}
          className="h-7 px-2"
        >
          <Plus className="h-3 w-3 mr-1" />
          Adicionar
        </Button>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhum item</p>
        ) : (
          items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={item.item_name}
                onChange={(e) => updateItem(type, index, 'item_name', e.target.value.toUpperCase())}
                placeholder="Nome do item"
                className="flex-1 h-8 text-sm uppercase"
              />
              <Input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem(type, index, 'quantity', parseInt(e.target.value) || 1)}
                className="w-16 h-8 text-sm text-center"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(type, index)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );

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
            {/* Kit Name Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <BoxIcon className="h-3 w-3 mr-1" />
                {kit.name}
              </Badge>
            </div>

            {/* Editable Sections */}
            <div className="space-y-4 p-3 bg-muted/50 rounded-lg">
              {renderEditableSection(
                'equipment',
                equipment,
                'Equipamentos',
                <Zap className="h-4 w-4 text-purple-600" />,
                'bg-purple-100 text-purple-800'
              )}
              
              {renderEditableSection(
                'accessories',
                accessories,
                'Acessórios',
                <Package className="h-4 w-4 text-blue-600" />,
                'bg-blue-100 text-blue-800'
              )}
              
              {renderEditableSection(
                'supplies',
                supplies,
                'Insumos',
                <Wrench className="h-4 w-4 text-orange-600" />,
                'bg-orange-100 text-orange-800'
              )}
            </div>

            {/* Observation */}
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
            disabled={submitting || !hasChanges()}
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
