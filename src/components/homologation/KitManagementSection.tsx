import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit, Package, Wrench, Box } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { HomologationKit, HomologationKitItem, ItemType } from '@/types/homologationKit';

interface KitManagementSectionProps {
  homologationCardId?: string;
}

interface KitFormData {
  name: string;
  description: string;
  equipment: HomologationKitItem[];
  accessories: HomologationKitItem[];
  supplies: HomologationKitItem[];
}

interface ManualKit {
  id: string;
  name: string;
  description: string;
  equipment: HomologationKitItem[];
  accessories: HomologationKitItem[];
  supplies: HomologationKitItem[];
}

const initialFormData: KitFormData = {
  name: '',
  description: '',
  equipment: [],
  accessories: [],
  supplies: [],
};

const KitManagementSection: React.FC<KitManagementSectionProps> = () => {
  const [kits, setKits] = useState<ManualKit[]>([]);
  const [formData, setFormData] = useState<KitFormData>(initialFormData);
  const [isCreating, setIsCreating] = useState(false);
  const [editingKitId, setEditingKitId] = useState<string | null>(null);

  // Kit operations
  const createKit = () => {
    if (!formData.name.trim()) return;

    const newKit: ManualKit = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      equipment: [...formData.equipment],
      accessories: [...formData.accessories],
      supplies: [...formData.supplies],
    };

    setKits(prev => [newKit, ...prev]);
    setFormData(initialFormData);
    setIsCreating(false);

    toast({
      title: "Kit criado com sucesso",
      description: "O kit foi adicionado à homologação.",
    });
  };

  const updateKit = () => {
    if (!editingKitId || !formData.name.trim()) return;

    setKits(prev =>
      prev.map(kit =>
        kit.id === editingKitId
          ? {
              ...kit,
              name: formData.name,
              description: formData.description,
              equipment: [...formData.equipment],
              accessories: [...formData.accessories],
              supplies: [...formData.supplies],
            }
          : kit
      )
    );

    setFormData(initialFormData);
    setEditingKitId(null);

    toast({
      title: "Kit atualizado",
      description: "As alterações foram salvas com sucesso.",
    });
  };

  const deleteKit = (kitId: string) => {
    setKits(prev => prev.filter(kit => kit.id !== kitId));
    toast({
      title: "Kit removido",
      description: "O kit foi removido da homologação.",
    });
  };

  // Item operations for each type
  const addItem = (type: ItemType) => {
    const newItem: HomologationKitItem = {
      id: Date.now().toString() + Math.random(),
      item_name: '',
      item_type: type,
      quantity: 1,
      description: '',
      notes: '',
    };

    setFormData(prev => ({
      ...prev,
      [type === 'equipment' ? 'equipment' : type === 'accessory' ? 'accessories' : 'supplies']: [
        ...prev[type === 'equipment' ? 'equipment' : type === 'accessory' ? 'accessories' : 'supplies'],
        newItem,
      ],
    }));
  };

  const removeItem = (type: ItemType, index: number) => {
    setFormData(prev => ({
      ...prev,
      [type === 'equipment' ? 'equipment' : type === 'accessory' ? 'accessories' : 'supplies']:
        prev[type === 'equipment' ? 'equipment' : type === 'accessory' ? 'accessories' : 'supplies'].filter(
          (_, i) => i !== index
        ),
    }));
  };

  const updateItem = (type: ItemType, index: number, field: keyof HomologationKitItem, value: string | number) => {
    setFormData(prev => {
      const itemsKey = type === 'equipment' ? 'equipment' : type === 'accessory' ? 'accessories' : 'supplies';
      const items = [...prev[itemsKey]];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, [itemsKey]: items };
    });
  };

  // Form operations
  const startEdit = (kit: ManualKit) => {
    setFormData({
      name: kit.name,
      description: kit.description,
      equipment: [...kit.equipment],
      accessories: [...kit.accessories],
      supplies: [...kit.supplies],
    });
    setEditingKitId(kit.id);
    setIsCreating(true);
  };

  const cancelEdit = () => {
    setFormData(initialFormData);
    setIsCreating(false);
    setEditingKitId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do kit.",
        variant: "destructive"
      });
      return;
    }

    const totalItems = formData.equipment.length + formData.accessories.length + formData.supplies.length;
    if (totalItems === 0) {
      toast({
        title: "Items obrigatórios",
        description: "Adicione pelo menos um equipamento, acessório ou insumo ao kit.",
        variant: "destructive"
      });
      return;
    }

    // Check for empty item names in any category
    const allItems = [...formData.equipment, ...formData.accessories, ...formData.supplies];
    const hasEmptyItem = allItems.some(item => !item.item_name.trim());
    
    if (hasEmptyItem) {
      toast({
        title: "Items incompletos",
        description: "Todos os items devem ter um nome.",
        variant: "destructive"
      });
      return;
    }

    if (editingKitId) {
      updateKit();
    } else {
      createKit();
    }
  };

  const getTypeIcon = (type: ItemType) => {
    switch (type) {
      case 'equipment':
        return <Wrench className="h-4 w-4" />;
      case 'accessory':
        return <Box className="h-4 w-4" />;
      case 'supply':
        return <Package className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: ItemType) => {
    switch (type) {
      case 'equipment':
        return 'Equipamento';
      case 'accessory':
        return 'Acessório';
      case 'supply':
        return 'Insumo';
    }
  };

  const renderItemSection = (type: ItemType, items: HomologationKitItem[]) => {
    const sectionTitle = type === 'equipment' ? 'Equipamentos' : type === 'accessory' ? 'Acessórios' : 'Insumos';
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getTypeIcon(type)}
            <Label className="text-sm font-medium">{sectionTitle}</Label>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addItem(type)}
            className="flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Adicionar
          </Button>
        </div>

        {items.map((item, index) => (
          <div key={`${type}-${index}`} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="flex items-center gap-1">
                {getTypeIcon(type)}
                {getTypeLabel(type)}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(type, index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Nome *</Label>
                <Input
                  value={item.item_name}
                  onChange={(e) => updateItem(type, index, 'item_name', e.target.value)}
                  placeholder="Nome do item"
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Quantidade *</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(type, index, 'quantity', parseInt(e.target.value) || 1)}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Input
                  value={item.description || ''}
                  onChange={(e) => updateItem(type, index, 'description', e.target.value)}
                  placeholder="Descrição opcional"
                  className="h-8"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea
                value={item.notes || ''}
                onChange={(e) => updateItem(type, index, 'notes', e.target.value)}
                placeholder="Observações opcionais"
                className="min-h-[60px] resize-none"
              />
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Nenhum {sectionTitle.toLowerCase()} adicionado
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Gerenciamento de Kits
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing Kits */}
        {kits.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Kits Cadastrados</h4>
            <div className="space-y-3">
              {kits.map((kit) => (
                <div key={kit.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="font-medium">{kit.name}</h5>
                      {kit.description && (
                        <p className="text-sm text-muted-foreground">{kit.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(kit)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteKit(kit.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 mt-3">
                    {/* Equipment Section */}
                    {kit.equipment.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          <span className="text-xs font-medium">Equipamentos ({kit.equipment.length})</span>
                        </div>
                        <div className="pl-4 space-y-1">
                          {kit.equipment.map((item, index) => (
                            <div key={index} className="flex items-center justify-between py-1 px-2 bg-muted/50 rounded text-xs">
                              <span>{item.item_name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {item.quantity}x
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Accessories Section */}
                    {kit.accessories.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Box className="h-3 w-3" />
                          <span className="text-xs font-medium">Acessórios ({kit.accessories.length})</span>
                        </div>
                        <div className="pl-4 space-y-1">
                          {kit.accessories.map((item, index) => (
                            <div key={index} className="flex items-center justify-between py-1 px-2 bg-muted/50 rounded text-xs">
                              <span>{item.item_name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {item.quantity}x
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Supplies Section */}
                    {kit.supplies.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          <span className="text-xs font-medium">Insumos ({kit.supplies.length})</span>
                        </div>
                        <div className="pl-4 space-y-1">
                          {kit.supplies.map((item, index) => (
                            <div key={index} className="flex items-center justify-between py-1 px-2 bg-muted/50 rounded text-xs">
                              <span>{item.item_name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {item.quantity}x
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {kit.equipment.length === 0 && kit.accessories.length === 0 && kit.supplies.length === 0 && (
                      <div className="text-xs text-muted-foreground italic">
                        Nenhum item cadastrado neste kit
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {kits.length === 0 && !isCreating && (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Nenhum kit cadastrado</p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Kit
            </Button>
          </div>
        )}

        {kits.length > 0 && !isCreating && (
          <Button onClick={() => setIsCreating(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Novo Kit
          </Button>
        )}

        {/* Kit Form */}
        {isCreating && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {editingKitId ? 'Editar Kit' : 'Novo Kit'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="kitName">Nome do Kit *</Label>
                    <Input
                      id="kitName"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome do kit"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="kitDescription">Descrição</Label>
                    <Input
                      id="kitDescription"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição opcional"
                    />
                  </div>
                </div>

                <ScrollArea className="h-96 pr-4">
                  <div className="space-y-6">
                    {renderItemSection('equipment', formData.equipment)}
                    <Separator />
                    {renderItemSection('accessory', formData.accessories)}
                    <Separator />
                    {renderItemSection('supply', formData.supplies)}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingKitId ? 'Salvar Alterações' : 'Criar Kit'}
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default KitManagementSection;
