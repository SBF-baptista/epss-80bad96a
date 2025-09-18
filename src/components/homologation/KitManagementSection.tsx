import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Edit2, Package, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { HomologationKitAccessory } from "@/types/homologationKit";

interface KitManagementSectionProps {}

interface KitFormData {
  name: string;
  description: string;
  accessories: HomologationKitAccessory[];
}

interface ManualKit {
  id: string;
  name: string;
  description: string;
  accessories: HomologationKitAccessory[];
}

const KitManagementSection = ({}: KitManagementSectionProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingKit, setEditingKit] = useState<string | null>(null);
  const [kits, setKits] = useState<ManualKit[]>([]);
  const [formData, setFormData] = useState<KitFormData>({
    name: '',
    description: '',
    accessories: []
  });

  const createKit = () => {
    const newKit: ManualKit = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      accessories: [...formData.accessories]
    };
    
    setKits(prev => [...prev, newKit]);
    setIsCreating(false);
    setFormData({ name: '', description: '', accessories: [] });
    
    toast({
      title: "Kit criado com sucesso",
      description: "O kit foi adicionado.",
      variant: "default"
    });
  };

  const updateKit = () => {
    setKits(prev => prev.map(kit => 
      kit.id === editingKit 
        ? { 
            ...kit, 
            name: formData.name,
            description: formData.description,
            accessories: [...formData.accessories]
          }
        : kit
    ));
    
    setEditingKit(null);
    setFormData({ name: '', description: '', accessories: [] });
    
    toast({
      title: "Kit atualizado",
      description: "As alterações foram salvas.",
      variant: "default"
    });
  };

  const deleteKit = (kitId: string) => {
    setKits(prev => prev.filter(kit => kit.id !== kitId));
    
    toast({
      title: "Kit removido",
      description: "O kit foi removido.",
      variant: "default"
    });
  };

  const addAccessory = () => {
    setFormData(prev => ({
      ...prev,
      accessories: [...prev.accessories, { accessory_name: '', quantity: 1, notes: '' }]
    }));
  };

  const removeAccessory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      accessories: prev.accessories.filter((_, i) => i !== index)
    }));
  };

  const updateAccessory = (index: number, field: keyof HomologationKitAccessory, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      accessories: prev.accessories.map((acc, i) => 
        i === index ? { ...acc, [field]: value } : acc
      )
    }));
  };

  const startEdit = (kit: ManualKit) => {
    setEditingKit(kit.id);
    setFormData({
      name: kit.name,
      description: kit.description || '',
      accessories: [...kit.accessories]
    });
  };

  const cancelEdit = () => {
    setEditingKit(null);
    setIsCreating(false);
    setFormData({ name: '', description: '', accessories: [] });
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

    if (formData.accessories.length === 0) {
      toast({
        title: "Acessórios obrigatórios",
        description: "Adicione pelo menos um acessório ao kit.",
        variant: "destructive"
      });
      return;
    }

    const hasEmptyAccessory = formData.accessories.some(acc => !acc.accessory_name.trim());
    if (hasEmptyAccessory) {
      toast({
        title: "Acessórios incompletos",
        description: "Todos os acessórios devem ter um nome.",
        variant: "destructive"
      });
      return;
    }

    if (editingKit) {
      updateKit();
    } else {
      createKit();
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Gerenciamento de Kits
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Kits */}
        {kits.map((kit) => (
          <div key={kit.id} className="border rounded-lg p-4 space-y-3">
            {editingKit === kit.id ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`edit-kit-name-${kit.id}`}>Nome do Kit *</Label>
                    <Input
                      id={`edit-kit-name-${kit.id}`}
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Kit Básico de Instalação"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`edit-kit-desc-${kit.id}`}>Descrição</Label>
                    <Textarea
                      id={`edit-kit-desc-${kit.id}`}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição opcional do kit"
                      className="min-h-[60px]"
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Acessórios do Kit</Label>
                  <div className="space-y-2">
                    {formData.accessories.map((accessory, index) => (
                      <div key={index} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-3 border rounded-md bg-muted/30">
                        <Input
                          placeholder="Nome do acessório *"
                          value={accessory.accessory_name}
                          onChange={(e) => updateAccessory(index, 'accessory_name', e.target.value)}
                        />
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qtd"
                          value={accessory.quantity}
                          onChange={(e) => updateAccessory(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                        <Input
                          placeholder="Observações"
                          value={accessory.notes || ''}
                          onChange={(e) => updateAccessory(index, 'notes', e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeAccessory(index)}
                          className="w-full sm:w-auto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAccessory}
                    className="mt-2 w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Acessório
                  </Button>
                </div>

                 <div className="flex flex-col sm:flex-row gap-2">
                   <Button
                     type="submit"
                     className="flex-1 sm:flex-none"
                   >
                     <Save className="h-4 w-4 mr-2" />
                     Salvar
                   </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdit}
                    className="flex-1 sm:flex-none"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h4 className="font-semibold">{kit.name}</h4>
                    {kit.description && (
                      <p className="text-sm text-muted-foreground">{kit.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(kit)}
                      className="w-full sm:w-auto"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                     <Button
                       variant="destructive"
                       size="sm"
                       onClick={() => deleteKit(kit.id)}
                       className="w-full sm:w-auto"
                     >
                       <Trash2 className="h-4 w-4 mr-2" />
                       Remover
                     </Button>
                  </div>
                </div>

                {kit.accessories.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Acessórios ({kit.accessories.length}):</p>
                      <div className="flex flex-wrap gap-2">
                        {kit.accessories.map((accessory, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {accessory.accessory_name} ({accessory.quantity}x)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        ))}

        {/* Create New Kit */}
        {!isCreating && !editingKit && (
          <Button
            onClick={() => setIsCreating(true)}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Novo Kit
          </Button>
        )}

        {isCreating && (
          <div className="border rounded-lg p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-kit-name">Nome do Kit *</Label>
                  <Input
                    id="new-kit-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Kit Básico de Instalação"
                  />
                </div>
                <div>
                  <Label htmlFor="new-kit-desc">Descrição</Label>
                  <Textarea
                    id="new-kit-desc"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição opcional do kit"
                    className="min-h-[60px]"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Acessórios do Kit</Label>
                <div className="space-y-2">
                  {formData.accessories.map((accessory, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-3 border rounded-md bg-muted/30">
                      <Input
                        placeholder="Nome do acessório *"
                        value={accessory.accessory_name}
                        onChange={(e) => updateAccessory(index, 'accessory_name', e.target.value)}
                      />
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qtd"
                        value={accessory.quantity}
                        onChange={(e) => updateAccessory(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                      <Input
                        placeholder="Observações"
                        value={accessory.notes || ''}
                        onChange={(e) => updateAccessory(index, 'notes', e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAccessory(index)}
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAccessory}
                  className="mt-2 w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Acessório
                </Button>
              </div>

               <div className="flex flex-col sm:flex-row gap-2">
                 <Button
                   type="submit"
                   className="flex-1 sm:flex-none"
                 >
                   <Save className="h-4 w-4 mr-2" />
                   Criar Kit
                 </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEdit}
                  className="flex-1 sm:flex-none"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )}

        {kits.length === 0 && !isCreating && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum kit configurado.</p>
            <p className="text-sm">Clique em "Adicionar Novo Kit" para começar.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KitManagementSection;
