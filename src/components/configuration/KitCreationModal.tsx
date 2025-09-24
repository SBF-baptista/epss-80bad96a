import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Minus, Package, Wrench, Box } from 'lucide-react';
import { createHomologationKit, type CreateKitRequest, type HomologationKitItem } from '@/services/homologationKitService';

interface KitCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface KitFormData {
  name: string;
  description: string;
  equipment: Omit<HomologationKitItem, 'id'>[];
  accessories: Omit<HomologationKitItem, 'id'>[];
  supplies: Omit<HomologationKitItem, 'id'>[];
}

const initialFormData: KitFormData = {
  name: '',
  description: '',
  equipment: [{ item_name: '', item_type: 'equipment', quantity: 1, description: '', notes: '' }],
  accessories: [{ item_name: '', item_type: 'accessory', quantity: 1, description: '', notes: '' }],
  supplies: [{ item_name: '', item_type: 'supply', quantity: 1, description: '', notes: '' }]
};

export const KitCreationModal = ({ isOpen, onClose, onSuccess }: KitCreationModalProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<KitFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  const addItem = (type: 'equipment' | 'accessories' | 'supplies') => {
    const newItem = { 
      item_name: '', 
      item_type: type === 'equipment' ? 'equipment' : type === 'accessories' ? 'accessory' : 'supply',
      quantity: 1, 
      description: '', 
      notes: '' 
    };
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], newItem]
    }));
  };

  const removeItem = (type: 'equipment' | 'accessories' | 'supplies', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const updateItem = (type: 'equipment' | 'accessories' | 'supplies', index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Erro de validação",
        description: "Nome do kit é obrigatório",
        variant: "destructive"
      });
      return;
    }

    // Filter out empty items
    const equipment = formData.equipment.filter(item => item.item_name.trim() !== '');
    const accessories = formData.accessories.filter(item => item.item_name.trim() !== '');
    const supplies = formData.supplies.filter(item => item.item_name.trim() !== '');

    if (equipment.length === 0 && accessories.length === 0 && supplies.length === 0) {
      toast({
        title: "Erro de validação",
        description: "Adicione pelo menos um item ao kit",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      
      const kitData: CreateKitRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        equipment,
        accessories,
        supplies
      };

      await createHomologationKit(kitData);
      
      toast({
        title: "Kit criado",
        description: `Kit "${formData.name}" foi criado com sucesso!`
      });

      // Reset form and close
      setFormData(initialFormData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating kit:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar o kit. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderItemSection = (
    title: string,
    type: 'equipment' | 'accessories' | 'supplies',
    icon: React.ReactNode,
    items: Omit<HomologationKitItem, 'id'>[]
  ) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base font-medium">
          {icon}
          {title}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addItem(type)}
        >
          <Plus className="w-3 h-3 mr-1" />
          Adicionar
        </Button>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-md">
            <div className="col-span-4">
              <Input
                placeholder="Nome do item"
                value={item.item_name}
                onChange={(e) => updateItem(type, index, 'item_name', e.target.value)}
                className="h-8"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                placeholder="Qtd"
                min="1"
                value={item.quantity}
                onChange={(e) => updateItem(type, index, 'quantity', parseInt(e.target.value) || 1)}
                className="h-8"
              />
            </div>
            <div className="col-span-5">
              <Input
                placeholder="Descrição (opcional)"
                value={item.description || ''}
                onChange={(e) => updateItem(type, index, 'description', e.target.value)}
                className="h-8"
              />
            </div>
            <div className="col-span-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(type, index)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Minus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Criar Novo Kit de Homologação
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto pr-2">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Kit *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Kit Básico Ruptela Smart5"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o kit e seu uso..."
                  rows={3}
                />
              </div>
            </div>

            {/* Items Sections */}
            {renderItemSection('Equipamentos', 'equipment', <Wrench className="w-4 h-4" />, formData.equipment)}
            {renderItemSection('Acessórios', 'accessories', <Package className="w-4 h-4" />, formData.accessories)}
            {renderItemSection('Insumos', 'supplies', <Box className="w-4 h-4" />, formData.supplies)}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Criando...' : 'Criar Kit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};