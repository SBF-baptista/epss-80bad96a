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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Package, 
  Wrench, 
  Box, 
  Send, 
  Loader2, 
  Plus, 
  Trash2,
  ArrowRight,
  Cpu
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { HomologationKit, HomologationKitItem, KitCategory } from "@/types/homologationKit";
import { SelectOrCreateInput } from "@/components/kit-items";
import { useSegsaleExtras } from "@/hooks/useSegsaleExtras";

interface KitEditRequestModalProps {
  open: boolean;
  onClose: () => void;
  kit: HomologationKit | null;
  initialMode?: 'edit' | 'delete';
}

const KIT_CATEGORIES = [
  { value: 'telemetria', label: 'Telemetria' },
  { value: 'videomonitoramento', label: 'Videomonitoramento' },
  { value: 'rastreamento', label: 'Rastreamento' },
];

export const KitEditRequestModal = ({ open, onClose, kit, initialMode = 'edit' }: KitEditRequestModalProps) => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [observation, setObservation] = useState("");
  const [mode, setMode] = useState<'edit' | 'delete'>(initialMode);
  const { accessories: segsaleAccessories, modules: segsaleModules, loading: segsaleLoading } = useSegsaleExtras();
  
  // Form state for edited values
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<string>("");
  const [newEquipment, setNewEquipment] = useState<HomologationKitItem[]>([]);
  const [newAccessories, setNewAccessories] = useState<HomologationKitItem[]>([]);
  const [newModules, setNewModules] = useState<HomologationKitItem[]>([]);
  const [newSupplies, setNewSupplies] = useState<HomologationKitItem[]>([]);

  // Reset form when kit changes
  useEffect(() => {
    if (kit) {
      setNewName(kit.name);
      setNewCategory(kit.category || "");
      setNewEquipment(kit.equipment.map(e => ({ ...e })));
      // Separate modules from accessories based on item naming patterns or keep all as accessories
      setNewAccessories(kit.accessories.map(a => ({ ...a })));
      setNewModules([]);
      setNewSupplies(kit.supplies.map(s => ({ ...s })));
      setObservation("");
      setMode(initialMode);
    }
  }, [kit, initialMode]);

  const handleClose = () => {
    setObservation("");
    onClose();
  };

  // Item management functions
  const addItem = (type: 'equipment' | 'accessory' | 'module' | 'supply') => {
    const newItem: HomologationKitItem = {
      item_name: '',
      item_type: type === 'module' ? 'accessory' : type,
      quantity: 1
    };
    
    if (type === 'equipment') {
      setNewEquipment([...newEquipment, newItem]);
    } else if (type === 'accessory') {
      setNewAccessories([...newAccessories, newItem]);
    } else if (type === 'module') {
      setNewModules([...newModules, newItem]);
    } else {
      setNewSupplies([...newSupplies, newItem]);
    }
  };

  const removeItem = (type: 'equipment' | 'accessory' | 'module' | 'supply', index: number) => {
    if (type === 'equipment') {
      setNewEquipment(newEquipment.filter((_, i) => i !== index));
    } else if (type === 'accessory') {
      setNewAccessories(newAccessories.filter((_, i) => i !== index));
    } else if (type === 'module') {
      setNewModules(newModules.filter((_, i) => i !== index));
    } else {
      setNewSupplies(newSupplies.filter((_, i) => i !== index));
    }
  };

  const updateItem = (type: 'equipment' | 'accessory' | 'module' | 'supply', index: number, field: string, value: string | number) => {
    const updateFn = (items: HomologationKitItem[]) => 
      items.map((item, i) => i === index ? { ...item, [field]: value } : item);
    
    if (type === 'equipment') {
      setNewEquipment(updateFn(newEquipment));
    } else if (type === 'accessory') {
      setNewAccessories(updateFn(newAccessories));
    } else if (type === 'module') {
      setNewModules(updateFn(newModules));
    } else {
      setNewSupplies(updateFn(newSupplies));
    }
  };


  // Check if there are any changes
  const hasChanges = () => {
    if (!kit) return false;
    
    if (newName.trim() !== kit.name) return true;
    if (newCategory !== (kit.category || "")) return true;
    
    // Compare equipment
    if (newEquipment.length !== kit.equipment.length) return true;
    for (let i = 0; i < newEquipment.length; i++) {
      if (newEquipment[i].item_name !== kit.equipment[i]?.item_name ||
          newEquipment[i].quantity !== kit.equipment[i]?.quantity) return true;
    }
    
    // Compare accessories
    if (newAccessories.length !== kit.accessories.length) return true;
    for (let i = 0; i < newAccessories.length; i++) {
      if (newAccessories[i].item_name !== kit.accessories[i]?.item_name ||
          newAccessories[i].quantity !== kit.accessories[i]?.quantity) return true;
    }
    
    // Compare supplies
    if (newSupplies.length !== kit.supplies.length) return true;
    for (let i = 0; i < newSupplies.length; i++) {
      if (newSupplies[i].item_name !== kit.supplies[i]?.item_name ||
          newSupplies[i].quantity !== kit.supplies[i]?.quantity) return true;
    }
    
    return false;
  };

  const buildChangesDescription = () => {
    if (!kit) return [];
    const changes: string[] = [];
    
    if (newName.trim() !== kit.name) {
      changes.push(`Nome: "${kit.name}" → "${newName.trim()}"`);
    }
    
    if (newCategory !== (kit.category || "")) {
      const oldCat = KIT_CATEGORIES.find(c => c.value === kit.category)?.label || 'Nenhum';
      const newCat = KIT_CATEGORIES.find(c => c.value === newCategory)?.label || 'Nenhum';
      changes.push(`Tipo: "${oldCat}" → "${newCat}"`);
    }
    
    // Equipment changes
    const eqChanges = compareItems(kit.equipment, newEquipment, 'Equipamentos');
    if (eqChanges) changes.push(eqChanges);
    
    // Accessories changes
    const accChanges = compareItems(kit.accessories, newAccessories, 'Acessórios');
    if (accChanges) changes.push(accChanges);
    
    // Supplies changes
    const supChanges = compareItems(kit.supplies, newSupplies, 'Insumos');
    if (supChanges) changes.push(supChanges);
    
    return changes;
  };

  const compareItems = (original: HomologationKitItem[], updated: HomologationKitItem[], label: string) => {
    const origNames = original.map(i => `${i.item_name} (${i.quantity}x)`).sort().join(', ');
    const newNames = updated.filter(i => i.item_name.trim()).map(i => `${i.item_name.trim().toUpperCase()} (${i.quantity}x)`).sort().join(', ');
    
    if (origNames !== newNames) {
      return `${label}: [${origNames || 'vazio'}] → [${newNames || 'vazio'}]`;
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!kit) return;
    
    // Handle delete request
    if (mode === 'delete') {
      if (!observation.trim()) {
        toast.error("Por favor, informe o motivo da exclusão");
        return;
      }
      
      setSubmitting(true);
      try {
        const insertData = {
          item_type: 'kit',
          item_name: kit.name,
          kit_id: kit.id,
          original_data: {
            id: kit.id,
            name: kit.name,
            category: kit.category,
            equipment: kit.equipment,
            accessories: kit.accessories,
            supplies: kit.supplies
          },
          requested_changes: {
            action: 'delete'
          },
          reason: observation.trim(),
          requested_by: user?.id,
          status: 'pending'
        };

        const { error } = await supabase
          .from('item_edit_requests')
          .insert(insertData as any);

        if (error) throw error;

        toast.success("Solicitação de exclusão enviada", {
          description: "O gestor irá analisar sua solicitação."
        });
        handleClose();
      } catch (error) {
        console.error('Error submitting kit delete request:', error);
        toast.error("Erro ao enviar solicitação", {
          description: "Tente novamente mais tarde."
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }
    
    // Handle edit request
    if (!hasChanges()) {
      toast.error("Nenhuma alteração foi feita");
      return;
    }

    // Validate that equipment has at least one item
    const validEquipment = newEquipment.filter(e => e.item_name.trim());
    if (validEquipment.length === 0) {
      toast.error("O kit precisa ter pelo menos um equipamento");
      return;
    }

    setSubmitting(true);
    try {
      const requestedChanges = {
        name: newName.trim(),
        category: newCategory || null,
        equipment: newEquipment.filter(e => e.item_name.trim()).map(e => ({
          ...e,
          item_name: e.item_name.trim().toUpperCase()
        })),
        accessories: newAccessories.filter(a => a.item_name.trim()).map(a => ({
          ...a,
          item_name: a.item_name.trim().toUpperCase()
        })),
        supplies: newSupplies.filter(s => s.item_name.trim()).map(s => ({
          ...s,
          item_name: s.item_name.trim().toUpperCase()
        }))
      };

      const insertData = {
        item_type: 'kit',
        item_name: kit.name,
        kit_id: kit.id,
        original_data: {
          id: kit.id,
          name: kit.name,
          category: kit.category,
          equipment: kit.equipment,
          accessories: kit.accessories,
          supplies: kit.supplies
        },
        requested_changes: requestedChanges,
        reason: observation.trim() || null,
        requested_by: user?.id,
        status: 'pending'
      };

      const { error } = await supabase
        .from('item_edit_requests')
        .insert(insertData as any);

      if (error) throw error;

      toast.success("Solicitação enviada com sucesso", {
        description: "O gestor irá analisar sua solicitação de edição do kit."
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

  const changesDescription = buildChangesDescription();

  const renderItemList = (
    items: HomologationKitItem[],
    type: 'equipment' | 'accessory' | 'supply',
    icon: React.ReactNode,
    label: string
  ) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <Label className="text-sm font-medium">{label}</Label>
          {type === 'accessory' && segsaleLoading && <Loader2 className="h-3 w-3 animate-spin" />}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addItem(type)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Adicionar
        </Button>
      </div>
      
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Nenhum item</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1">
                {type === 'accessory' ? (
                  <Select
                    value={item.item_name}
                    onValueChange={(value) => updateItem(type, index, 'item_name', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione acessório" />
                    </SelectTrigger>
                    <SelectContent>
                      {segsaleAccessories.map((option) => (
                        <SelectItem key={option.id} value={option.nome}>
                          {option.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <SelectOrCreateInput
                    itemType={type}
                    value={item.item_name}
                    onChange={(value) => updateItem(type, index, 'item_name', value)}
                    placeholder={`Nome do ${type === 'equipment' ? 'equipamento' : 'insumo'}`}
                  />
                )}
              </div>
              <Input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem(type, index, 'quantity', parseInt(e.target.value) || 1)}
                className="w-20"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(type, index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderModulesSection = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Módulos</Label>
          {segsaleLoading && <Loader2 className="h-3 w-3 animate-spin" />}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addItem('module')}
        >
          <Plus className="h-3 w-3 mr-1" />
          Adicionar
        </Button>
      </div>
      
      {newModules.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Nenhum módulo</p>
      ) : (
        <div className="space-y-2">
          {newModules.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1">
                <Select
                  value={item.item_name}
                  onValueChange={(value) => updateItem('module', index, 'item_name', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    {segsaleModules.map((option) => (
                      <SelectItem key={option.id} value={option.nome}>
                        {option.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem('module', index, 'quantity', parseInt(e.target.value) || 1)}
                className="w-20"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem('module', index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {mode === 'delete' ? 'Solicitar Exclusão de Kit' : 'Solicitar Edição de Kit'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Current Kit Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Kit Atual</p>
              <p className="font-medium">{kit.name}</p>
              {kit.category && (
                <Badge variant="secondary" className="mt-2">
                  {KIT_CATEGORIES.find(c => c.value === kit.category)?.label}
                </Badge>
              )}
            </div>

            <Separator />

            {/* Delete Mode - Only show observation field */}
            {mode === 'delete' ? (
              <div className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ Você está solicitando a exclusão deste kit. Esta ação será analisada pelo gestor.
                  </p>
                </div>
                
                {/* Observation/Reason - Required for delete */}
                <div className="space-y-2">
                  <Label htmlFor="observation" className="text-sm font-medium">
                    Motivo da Exclusão *
                  </Label>
                  <Textarea
                    id="observation"
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Descreva o motivo da solicitação de exclusão..."
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Edit Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="kit-name" className="text-sm font-medium">
                      Nome do Kit
                    </Label>
                    <Input
                      id="kit-name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nome do kit..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tipo do Kit</Label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {KIT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Equipment */}
                {renderItemList(
                  newEquipment,
                  'equipment',
                  <Wrench className="h-4 w-4 text-muted-foreground" />,
                  'Equipamentos'
                )}

                <Separator />

                {/* Accessories */}
                {renderItemList(
                  newAccessories,
                  'accessory',
                  <Box className="h-4 w-4 text-muted-foreground" />,
                  'Acessórios'
                )}

                <Separator />

                {/* Modules */}
                {renderModulesSection()}

                <Separator />

                {/* Supplies */}
                {renderItemList(
                  newSupplies,
                  'supply',
                  <Package className="h-4 w-4 text-muted-foreground" />,
                  'Insumos'
                )}

                <Separator />

                {/* Changes Preview */}
                {changesDescription.length > 0 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Alterações Solicitadas
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {changesDescription.map((change, index) => (
                        <li key={index}>• {change}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Observation */}
                <div className="space-y-2">
                  <Label htmlFor="observation" className="text-sm font-medium">
                    Observação / Motivo
                  </Label>
                  <Textarea
                    id="observation"
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Descreva o motivo da solicitação..."
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || (mode === 'edit' && !hasChanges()) || (mode === 'delete' && !observation.trim())}
            variant={mode === 'delete' ? 'destructive' : 'default'}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {mode === 'delete' ? 'Solicitar Exclusão' : 'Enviar Solicitação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
