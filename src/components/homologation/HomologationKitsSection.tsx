import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Trash2,
  Edit,
  Package,
  Wrench,
  Box,
  Loader2,
  Search,
  ChevronDown,
  ChevronRight,
  Copy,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileUp
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import { cleanItemName } from '@/utils/itemNormalization';
import { HomologationKit, HomologationKitItem, ItemType, CreateKitRequest, UpdateKitRequest } from '@/types/homologationKit';
import { fetchHomologationKits, createHomologationKit, updateHomologationKit, deleteHomologationKit } from '@/services/homologationKitService';
import { SelectOrCreateInput } from '@/components/kit-items';
import { checkMultipleKitsHomologation, type HomologationStatus } from '@/services/kitHomologationService';
import { supabase } from '@/integrations/supabase/client';
import KitImportModal from './KitImportModal';
import { KitCreationModal } from '@/components/configuration/KitCreationModal';

interface HomologationKitsSectionProps {
  homologationCardId?: string;
}

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

const HomologationKitsSection: React.FC<HomologationKitsSectionProps> = ({ homologationCardId }) => {
  const [kits, setKits] = useState<HomologationKit[]>([]);
  const [filteredKits, setFilteredKits] = useState<HomologationKit[]>([]);
  const [formData, setFormData] = useState<KitFormData>(initialFormData);
  const [isCreating, setIsCreating] = useState(false);
  const [editingKitId, setEditingKitId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedKits, setExpandedKits] = useState<Set<string>>(new Set());
  const [homologationStatuses, setHomologationStatuses] = useState<Map<string, HomologationStatus>>(new Map());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isKitModalOpen, setIsKitModalOpen] = useState(false);

  // Load kits on component mount
  useEffect(() => {
    loadKits();
  }, [homologationCardId]);

  // Load homologation statuses when kits change
  useEffect(() => {
    if (kits.length > 0) {
      loadHomologationStatuses();
    }
  }, [kits]);

  // Set up real-time subscription for kit_item_options changes
  useEffect(() => {
    const channel = supabase
      .channel('kit-homologation-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kit_item_options'
        },
        (payload) => {
          console.log('Kit item option changed:', payload);
          // Reload homologation statuses when kit_item_options changes
          if (kits.length > 0) {
            loadHomologationStatuses();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [kits]);

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

  // Don't render if no homologation card ID - show all kits instead
  const loadKits = async () => {
    try {
      setIsLoading(true);
      // If no specific card ID, fetch all kits
      const fetchedKits = await fetchHomologationKits(homologationCardId);
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

  const loadHomologationStatuses = async () => {
    try {
      const statuses = await checkMultipleKitsHomologation(kits);
      setHomologationStatuses(statuses);
    } catch (error) {
      console.error('Error loading homologation statuses:', error);
      toast({
        title: "Erro ao verificar homologações",
        description: "Não foi possível verificar o status de homologação dos kits.",
        variant: "destructive"
      });
    }
  };

  const toggleKitExpansion = (kitId: string) => {
    const newExpanded = new Set(expandedKits);
    if (newExpanded.has(kitId)) {
      newExpanded.delete(kitId);
    } else {
      newExpanded.add(kitId);
    }
    setExpandedKits(newExpanded);
  };

  // Kit operations
  const createKit = async () => {
    if (!formData.name.trim()) return;

    try {
      setIsSaving(true);
      const kitData: CreateKitRequest = {
        homologation_card_id: homologationCardId || undefined,
        name: formData.name,
        description: formData.description,
        equipment: formData.equipment,
        accessories: formData.accessories,
        supplies: formData.supplies,
      };

      const newKit = await createHomologationKit(kitData);
      setKits(prev => [newKit, ...prev]);
      // Reload homologation statuses for the updated list
      setTimeout(() => loadHomologationStatuses(), 100);
      setFormData(initialFormData);
      setIsCreating(false);

      toast({
        title: "Kit criado com sucesso",
        description: homologationCardId ? "O kit foi adicionado à homologação." : "O kit foi criado com sucesso.",
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

      // Reload homologation statuses for the updated list
      setTimeout(() => loadHomologationStatuses(), 100);
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

  const duplicateKit = async (kit: HomologationKit) => {
    try {
      const kitData: CreateKitRequest = {
        homologation_card_id: homologationCardId || undefined,
        name: `${kit.name} (Cópia)`,
        description: kit.description,
        equipment: kit.equipment.map(item => ({ ...item, id: undefined })),
        accessories: kit.accessories.map(item => ({ ...item, id: undefined })),
        supplies: kit.supplies.map(item => ({ ...item, id: undefined })),
      };

      const newKit = await createHomologationKit(kitData);
      setKits(prev => [newKit, ...prev]);
      // Reload homologation statuses
      setTimeout(() => loadHomologationStatuses(), 100);

      toast({
        title: "Kit duplicado",
        description: "O kit foi duplicado com sucesso.",
      });
    } catch (error) {
      console.error('Error duplicating kit:', error);
      toast({
        title: "Erro ao duplicar kit",
        description: "Não foi possível duplicar o kit. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const deleteKit = async (kitId: string) => {
    try {
      await deleteHomologationKit(kitId);
      setKits(prev => prev.filter(kit => kit.id !== kitId));
      // Remove from expanded set if it was expanded
      setExpandedKits(prev => {
        const newSet = new Set(prev);
        newSet.delete(kitId);
        return newSet;
      });
      toast({
        title: "Kit removido",
        description: "O kit foi removido da homologação.",
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
                <SelectOrCreateInput
                  value={item.item_name}
                  onChange={(value) => updateItem(type, index, 'item_name', value)}
                  itemType={type}
                  placeholder={`Selecione ${type === 'equipment' ? 'equipamento' : type === 'accessory' ? 'acessório' : 'insumo'}...`}
                  className="w-full"
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

  // Don't render if explicitly disabled - this component works with or without homologation card ID
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Gerenciamento de Kits
          <div className="text-sm text-muted-foreground font-normal">
            Status de homologação e distribuição dos kits
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Carregando kits...</span>
          </div>
        )}

        {!isLoading && (
          <>
            {/* Header with Search and Add Button */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              {/* Search Bar */}
              {kits.length > 0 && (
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar kits..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
              
              {/* Add Kit Button */}
              {!isCreating && (
                <Button onClick={() => setIsKitModalOpen(true)} className="shrink-0">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Kit
                </Button>
              )}
            </div>

            {/* Kit Cards */}
            {!isCreating && filteredKits.length > 0 && (
              <div className="space-y-3">
                {filteredKits.map((kit) => {
                  const isExpanded = expandedKits.has(kit.id!);
                  const primaryEquipment = kit.equipment[0]?.item_name || 'Nenhum equipamento';
                  const homologationStatus = homologationStatuses.get(kit.id!);
                  const isHomologated = homologationStatus?.isHomologated ?? false;
                  const pendingItemsCount = homologationStatus ? 
                    (homologationStatus.pendingItems.equipment.length + 
                     homologationStatus.pendingItems.accessories.length + 
                     homologationStatus.pendingItems.supplies.length) : 0;
                  
                  // Determinar categoria do kit - usa o campo category ou fallback para lógica de equipamentos
                  const getCategoryLabel = () => {
                    if (kit.category) {
                      const categoryMap: Record<string, string> = {
                        'telemetria': 'Telemetria',
                        'videomonitoramento': 'Videomonitoramento',
                        'rastreamento': 'Rastreamento'
                      };
                      return categoryMap[kit.category] || null;
                    }
                    // Fallback para lógica antiga baseada em equipamentos
                    const hasFMC150 = kit.equipment.some(e => {
                      const name = e.item_name.toLowerCase();
                      return name.includes('fmc150') || name.includes('fmc 150');
                    });
                    const hasFMC130 = kit.equipment.some(e => {
                      const name = e.item_name.toLowerCase();
                      return name.includes('fmc130') || name.includes('fmc 130');
                    });
                    return hasFMC150 ? 'Telemetria' : hasFMC130 ? 'Rastreamento' : null;
                  };
                  const kitCategory = getCategoryLabel();
                  
                  return (
                    <Collapsible
                      key={kit.id}
                      open={isExpanded}
                      onOpenChange={() => toggleKitExpansion(kit.id!)}
                    >
                      <Card className="overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  <CardTitle className="text-lg">{kit.name}</CardTitle>
                                  {/* Kit Category Badge */}
                                  {kitCategory && (
                                    <Badge 
                                      variant="outline"
                                      className={
                                        kitCategory === 'Telemetria' 
                                          ? "bg-blue-50 text-blue-700 border-blue-200" 
                                          : kitCategory === 'Videomonitoramento'
                                            ? "bg-purple-50 text-purple-700 border-purple-200"
                                            : "bg-orange-50 text-orange-700 border-orange-200"
                                      }
                                    >
                                      {kitCategory}
                                    </Badge>
                                  )}
                                  {/* Homologation Status Badge */}
                                   {homologationStatus && (
                                    <Badge 
                                      variant={isHomologated ? "default" : "destructive"} 
                                      className={`flex items-center gap-1 ${
                                        isHomologated 
                                          ? "bg-success-light text-success border-success-border" 
                                          : "bg-warning-light text-warning border-warning-border"
                                      }`}
                                    >
                                      {isHomologated ? (
                                        <>
                                          <CheckCircle className="h-3 w-3" />
                                          Homologado
                                        </>
                                      ) : (
                                        <>
                                          <AlertTriangle className="h-3 w-3" />
                                          Não Homologado ({pendingItemsCount} pendentes)
                                        </>
                                      )}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <Wrench className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">
                                    {primaryEquipment}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEdit(kit)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => duplicateKit(kit)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteKit(kit.id!)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <div className="space-y-4">
                              {kit.description && !kit.description.includes('Importado automaticamente de arquivo TXT') && (
                                <p className="text-sm text-muted-foreground">
                                  {kit.description}
                                </p>
                              )}

                              {/* Homologation Status Details */}
                              {homologationStatus && !isHomologated && (
                                <div className="bg-warning-light border border-warning-border rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <AlertTriangle className="h-4 w-4 text-warning" />
                                      <span className="text-sm font-medium text-warning">
                                        Itens Pendentes de Homologação
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-xs text-warning space-y-1">
                                    {homologationStatus.pendingItems.equipment.length > 0 && (
                                      <p>• {homologationStatus.pendingItems.equipment.length} equipamento(s): {homologationStatus.pendingItems.equipment.map(item => cleanItemName(item.item_name)).join(', ')}</p>
                                    )}
                                    {homologationStatus.pendingItems.accessories.length > 0 && (
                                      <p>• {homologationStatus.pendingItems.accessories.length} acessório(s): {homologationStatus.pendingItems.accessories.map(item => cleanItemName(item.item_name)).join(', ')}</p>
                                    )}
                                    {homologationStatus.pendingItems.supplies.length > 0 && (
                                      <p>• {homologationStatus.pendingItems.supplies.length} insumo(s): {homologationStatus.pendingItems.supplies.map(item => cleanItemName(item.item_name)).join(', ')}</p>
                                    )}
                                  </div>
                                  <p className="text-xs text-warning mt-2 font-medium">
                                    O kit ficará disponível para distribuição após todos os itens serem homologados.
                                  </p>
                                </div>
                              )}

                              {homologationStatus && isHomologated && (
                                <div className="bg-success-light border border-success-border rounded-lg p-3">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-success" />
                                    <span className="text-sm font-medium text-success">
                                      Kit Totalmente Homologado
                                    </span>
                                  </div>
                                  <p className="text-xs text-success mt-1">
                                    Todos os itens foram homologados. O kit está pronto para distribuição aos técnicos.
                                  </p>
                                </div>
                              )}
                              {/* Equipment List */}
                              {kit.equipment.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Wrench className="h-4 w-4" />
                                    <span className="text-sm font-medium">
                                      Equipamentos ({kit.equipment.length})
                                    </span>
                                  </div>
                                  <div className="pl-6 space-y-1">
                                    {kit.equipment.map((item, index) => {
                                      const isItemHomologated = homologationStatus?.homologatedItems.equipment.some(hItem => hItem.item_name === item.item_name);
                                      return (
                                        <div key={index} className="flex items-center justify-between py-1 px-2 bg-muted/50 rounded text-sm">
                                          <div className="flex items-center gap-2">
                                            <span>{item.item_name}</span>
                                            {homologationStatus && (
                                              <Badge 
                                                variant={isItemHomologated ? "default" : "secondary"} 
                                                className={`text-xs ${
                                                  isItemHomologated 
                                                    ? "bg-success-light text-success" 
                                                    : "bg-warning-light text-warning"
                                                }`}
                                              >
                                                {isItemHomologated ? (
                                                  <>
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Homologado
                                                  </>
                                                ) : (
                                                  <>
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    Pendente
                                                  </>
                                                )}
                                              </Badge>
                                            )}
                                          </div>
                                          <Badge variant="secondary" className="text-xs">
                                            {item.quantity}x
                                          </Badge>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Accessories List */}
                              {kit.accessories.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Box className="h-4 w-4" />
                                    <span className="text-sm font-medium">
                                      Acessórios ({kit.accessories.length})
                                    </span>
                                  </div>
                                  <div className="pl-6 space-y-1">
                                    {kit.accessories.map((item, index) => {
                                      const isItemHomologated = homologationStatus?.homologatedItems.accessories.some(hItem => hItem.item_name === item.item_name);
                                      return (
                                        <div key={index} className="flex items-center justify-between py-1 px-2 bg-muted/50 rounded text-sm">
                                          <div className="flex items-center gap-2">
                                            <span>{item.item_name}</span>
                                            {homologationStatus && (
                                              <Badge 
                                                variant={isItemHomologated ? "default" : "secondary"} 
                                                className={`text-xs ${
                                                  isItemHomologated 
                                                    ? "bg-success-light text-success" 
                                                    : "bg-warning-light text-warning"
                                                }`}
                                              >
                                                {isItemHomologated ? (
                                                  <>
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Homologado
                                                  </>
                                                ) : (
                                                  <>
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    Pendente
                                                  </>
                                                )}
                                              </Badge>
                                            )}
                                          </div>
                                          <Badge variant="secondary" className="text-xs">
                                            {item.quantity}x
                                          </Badge>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Supplies List */}
                              {kit.supplies.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    <span className="text-sm font-medium">
                                      Insumos ({kit.supplies.length})
                                    </span>
                                  </div>
                                  <div className="pl-6 space-y-1">
                                    {kit.supplies.map((item, index) => {
                                      const isItemHomologated = homologationStatus?.homologatedItems.supplies.some(hItem => hItem.item_name === item.item_name);
                                      return (
                                        <div key={index} className="flex items-center justify-between py-1 px-2 bg-muted/50 rounded text-sm">
                                          <div className="flex items-center gap-2">
                                            <span>{item.item_name}</span>
                                            {homologationStatus && (
                                              <Badge 
                                                variant={isItemHomologated ? "default" : "secondary"} 
                                                className={`text-xs ${
                                                  isItemHomologated 
                                                    ? "bg-success-light text-success" 
                                                    : "bg-warning-light text-warning"
                                                }`}
                                              >
                                                {isItemHomologated ? (
                                                  <>
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Homologado
                                                  </>
                                                ) : (
                                                  <>
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    Pendente
                                                  </>
                                                )}
                                              </Badge>
                                            )}
                                          </div>
                                          <Badge variant="secondary" className="text-xs">
                                            {item.quantity}x
                                          </Badge>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {!isCreating && kits.length === 0 && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum kit na biblioteca</h3>
                <p className="text-muted-foreground">
                  {homologationCardId 
                    ? 'Use o botão "Novo Kit" para criar kits organizados com equipamentos, acessórios e insumos'
                    : 'A biblioteca de kits está vazia. Use o botão "Novo Kit" para começar'
                  }
                </p>
              </div>
            )}

            {/* No search results */}
            {!isCreating && kits.length > 0 && filteredKits.length === 0 && searchTerm && (
              <div className="text-center py-8">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum kit encontrado</h3>
                <p className="text-muted-foreground">
                  Tente ajustar os termos de busca
                </p>
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
          </>
        )}
      </CardContent>

      {/* Import Modal */}
      <KitImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onKitsImported={loadKits}
        homologationCardId={homologationCardId}
      />

      {/* Kit Creation Modal */}
      <KitCreationModal
        isOpen={isKitModalOpen}
        onClose={() => setIsKitModalOpen(false)}
        onSuccess={() => {
          loadKits();
          setIsKitModalOpen(false);
        }}
      />
    </Card>
  );
};

export default HomologationKitsSection;