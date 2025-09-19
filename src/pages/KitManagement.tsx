import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit, Package, Wrench, Box, Loader2, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { HomologationKit, HomologationKitItem, ItemType, CreateKitRequest, UpdateKitRequest } from '@/types/homologationKit';
import { fetchHomologationKits, createHomologationKit, updateHomologationKit, deleteHomologationKit } from '@/services/homologationKitService';
import { Layout } from '@/components/Layout';

interface KitFormData {
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

const KitManagement: React.FC = () => {
  const [kits, setKits] = useState<HomologationKit[]>([]);
  const [filteredKits, setFilteredKits] = useState<HomologationKit[]>([]);
  const [formData, setFormData] = useState<KitFormData>(initialFormData);
  const [isCreating, setIsCreating] = useState(false);
  const [editingKitId, setEditingKitId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load kits on component mount
  useEffect(() => {
    loadKits();
  }, []);

  // Filter kits based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredKits(kits);
    } else {
      const filtered = kits.filter(kit =>
        kit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kit.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kit.equipment.some(item => item.item_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        kit.accessories.some(item => item.item_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        kit.supplies.some(item => item.item_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredKits(filtered);
    }
  }, [kits, searchTerm]);

  const loadKits = async () => {
    try {
      setIsLoading(true);
      const fetchedKits = await fetchHomologationKits(); // Fetch all kits, not filtered by card
      setKits(fetchedKits);
    } catch (error) {
      console.error('Error loading kits:', error);
      toast({
        title: "Erro ao carregar kits",
        description: "Não foi possível carregar os kits.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Kit operations
  const createKit = async () => {
    if (!formData.name.trim()) return;

    try {
      setIsSaving(true);
      const kitData: CreateKitRequest = {
        name: formData.name,
        description: formData.description,
        equipment: formData.equipment,
        accessories: formData.accessories,
        supplies: formData.supplies,
      };

      const newKit = await createHomologationKit(kitData);
      setKits(prev => [newKit, ...prev]);
      setFormData(initialFormData);
      setIsCreating(false);

      toast({
        title: "Kit criado com sucesso",
        description: "O kit foi criado e está disponível para uso.",
      });
    } catch (error) {
      console.error('Error creating kit:', error);
      toast({
        title: "Erro ao criar kit",
        description: "Não foi possível criar o kit. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateKit = async () => {
    if (!editingKitId || !formData.name.trim()) return;

    try {
      setIsSaving(true);
      const updateData: UpdateKitRequest = {
        name: formData.name,
        description: formData.description,
        equipment: formData.equipment,
        accessories: formData.accessories,
        supplies: formData.supplies,
      };

      const updatedKit = await updateHomologationKit(editingKitId, updateData);
      
      setKits(prev =>
        prev.map(kit =>
          kit.id === editingKitId ? updatedKit : kit
        )
      );

      setFormData(initialFormData);
      setEditingKitId(null);
      setIsCreating(false);

      toast({
        title: "Kit atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
    } catch (error) {
      console.error('Error updating kit:', error);
      toast({
        title: "Erro ao atualizar kit",
        description: "Não foi possível atualizar o kit. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteKit = async (kitId: string) => {
    try {
      await deleteHomologationKit(kitId);
      setKits(prev => prev.filter(kit => kit.id !== kitId));
      toast({
        title: "Kit removido",
        description: "O kit foi removido com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting kit:', error);
      toast({
        title: "Erro ao remover kit",
        description: "Não foi possível remover o kit. Tente novamente.",
        variant: "destructive"
      });
    }
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
  const startEdit = (kit: HomologationKit) => {
    setFormData({
      name: kit.name,
      description: kit.description || '',
      equipment: [...kit.equipment],
      accessories: [...kit.accessories],
      supplies: [...kit.supplies],
    });
    setEditingKitId(kit.id!);
    setIsCreating(true);
  };

  const cancelEdit = () => {
    setFormData(initialFormData);
    setIsCreating(false);
    setEditingKitId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      await updateKit();
    } else {
      await createKit();
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
    <Layout>
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Gerenciamento de Kits</h1>
            <p className="text-muted-foreground">
              Crie e gerencie kits com equipamentos, acessórios e insumos
            </p>
          </div>
          
          {!isCreating && kits.length > 0 && (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Kit
            </Button>
          )}
        </div>

        {/* Search Bar */}
        {kits.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar kits por nome, descrição ou itens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Carregando kits...</span>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && kits.length === 0 && !isCreating && (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum kit cadastrado</h3>
              <p className="text-muted-foreground mb-6">
                Comece criando seu primeiro kit com equipamentos, acessórios e insumos
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Kit
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Existing Kits */}
        {!isLoading && filteredKits.length > 0 && !isCreating && (
          <div className="grid gap-4">
            {filteredKits.map((kit) => (
              <Card key={kit.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{kit.name}</h3>
                      {kit.description && (
                        <p className="text-muted-foreground">{kit.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(kit)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteKit(kit.id!)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Equipment Section */}
                    {kit.equipment.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Wrench className="h-4 w-4" />
                          <span className="text-sm font-medium">Equipamentos ({kit.equipment.length})</span>
                        </div>
                        <div className="pl-5 space-y-1">
                          {kit.equipment.map((item, index) => (
                            <div key={index} className="flex items-center justify-between py-1 px-2 bg-muted/50 rounded text-sm">
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
                          <Box className="h-4 w-4" />
                          <span className="text-sm font-medium">Acessórios ({kit.accessories.length})</span>
                        </div>
                        <div className="pl-5 space-y-1">
                          {kit.accessories.map((item, index) => (
                            <div key={index} className="flex items-center justify-between py-1 px-2 bg-muted/50 rounded text-sm">
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
                          <Package className="h-4 w-4" />
                          <span className="text-sm font-medium">Insumos ({kit.supplies.length})</span>
                        </div>
                        <div className="pl-5 space-y-1">
                          {kit.supplies.map((item, index) => (
                            <div key={index} className="flex items-center justify-between py-1 px-2 bg-muted/50 rounded text-sm">
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
                      <div className="text-sm text-muted-foreground italic">
                        Nenhum item cadastrado neste kit
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Kit Form */}
        {isCreating && (
          <Card>
            <CardHeader>
              <CardTitle>
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
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={isSaving}
                  >
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingKitId ? 'Salvar Alterações' : 'Criar Kit'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={cancelEdit}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* No search results */}
        {!isLoading && kits.length > 0 && filteredKits.length === 0 && searchTerm && !isCreating && (
          <Card>
            <CardContent className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum kit encontrado</h3>
              <p className="text-muted-foreground">
                Tente ajustar os termos de busca ou criar um novo kit
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default KitManagement;
