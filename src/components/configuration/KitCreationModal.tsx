import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, Package, Wrench, Box, AlertTriangle, Cpu, Loader2, Link2 } from "lucide-react";
import {
  createHomologationKit,
  type CreateKitRequest,
  type HomologationKitItem,
} from "@/services/homologationKitService";
import { SelectOrCreateInput } from "@/components/kit-items";
import { checkItemHomologation } from "@/services/kitHomologationService";
import { useSegsaleExtras } from "@/hooks/useSegsaleExtras";

interface KitCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SegsaleMirror {
  product: string;
  module: string;
  accessory: string;
}

interface KitFormData {
  name: string;
  description: string;
  category: string;
  equipment: Omit<HomologationKitItem, "id">[];
  accessories: Omit<HomologationKitItem, "id">[];
  modules: Omit<HomologationKitItem, "id">[];
  supplies: Omit<HomologationKitItem, "id">[];
  segsaleMirror: SegsaleMirror;
}

const KIT_CATEGORIES = [
  { value: "telemetria", label: "Telemetria" },
  { value: "videomonitoramento", label: "Videomonitoramento" },
  { value: "rastreamento", label: "Rastreamento" },
];

const initialFormData: KitFormData = {
  name: "",
  description: "",
  category: "",
  equipment: [{ item_name: "", item_type: "equipment", quantity: 1, description: "", notes: "" }],
  accessories: [{ item_name: "", item_type: "accessory", quantity: 1, description: "", notes: "" }],
  modules: [{ item_name: "", item_type: "accessory", quantity: 1, description: "", notes: "" }],
  supplies: [{ item_name: "", item_type: "supply", quantity: 1, description: "", notes: "" }],
  segsaleMirror: { product: "", module: "", accessory: "" },
};

export const KitCreationModal = ({ isOpen, onClose, onSuccess }: KitCreationModalProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<KitFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [nonHomologatedItems, setNonHomologatedItems] = useState<Set<string>>(new Set());
  const {
    accessories: segsaleAccessories,
    modules: segsaleModules,
    products: segsaleProducts,
    loading: segsaleLoading,
  } = useSegsaleExtras();

  const addItem = (type: "equipment" | "accessories" | "modules" | "supplies") => {
    const itemType = type === "equipment" ? "equipment" : type === "supplies" ? "supply" : "accessory";
    const newItem = {
      item_name: "",
      item_type: itemType,
      quantity: 1,
      description: "",
      notes: "",
    };
    setFormData((prev) => ({
      ...prev,
      [type]: [...prev[type], newItem],
    }));
  };

  const removeItem = (type: "equipment" | "accessories" | "modules" | "supplies", index: number) => {
    setFormData((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  const updateItem = (
    type: "equipment" | "accessories" | "modules" | "supplies",
    index: number,
    field: string,
    value: string | number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [type]: prev[type].map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const updateSegsaleMirror = (field: keyof SegsaleMirror, value: string) => {
    setFormData((prev) => ({
      ...prev,
      segsaleMirror: { ...prev.segsaleMirror, [field]: value },
    }));
  };

  const handleItemNameChange = async (
    type: "equipment" | "accessories" | "modules" | "supplies",
    index: number,
    itemName: string,
  ) => {
    updateItem(type, index, "item_name", itemName);

    if (itemName.trim() && type === "equipment") {
      const isHomologated = await checkItemHomologation(itemName.trim(), "equipment");
      const itemKey = `${type}-${index}`;

      setNonHomologatedItems((prev) => {
        const newSet = new Set(prev);
        if (!isHomologated) {
          newSet.add(itemKey);
        } else {
          newSet.delete(itemKey);
        }
        return newSet;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Erro de validação",
        description: "Nome do kit é obrigatório",
        variant: "destructive",
      });
      return;
    }

    // Filter out empty items
    const equipment = formData.equipment.filter((item) => item.item_name.trim() !== "");
    // Combine accessories and modules as they are both 'accessory' type
    const accessories = [
      ...formData.accessories.filter((item) => item.item_name.trim() !== ""),
      ...formData.modules.filter((item) => item.item_name.trim() !== ""),
    ];
    const supplies = formData.supplies.filter((item) => item.item_name.trim() !== "");

    if (equipment.length === 0 && accessories.length === 0 && supplies.length === 0) {
      toast({
        title: "Erro de validação",
        description: "Adicione pelo menos um item ao kit",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      // Build description with Segsale mirror info
      let description = formData.description.trim();
      const { product, module, accessory } = formData.segsaleMirror;
      if (product || module || accessory) {
        const mirrorParts = [];
        if (product) mirrorParts.push(`Produto: ${product}`);
        if (module) mirrorParts.push(`Módulo: ${module}`);
        if (accessory) mirrorParts.push(`Acessório: ${accessory}`);
        const mirrorInfo = `[Espelho Segsale: ${mirrorParts.join(" | ")}]`;
        description = description ? `${description}\n${mirrorInfo}` : mirrorInfo;
      }

      const kitData: CreateKitRequest = {
        name: formData.name.trim(),
        description: description || undefined,
        category: formData.category || undefined,
        equipment,
        accessories,
        supplies,
      };

      await createHomologationKit(kitData);

      toast({
        title: "Kit criado",
        description: `Kit "${formData.name}" foi criado com sucesso!`,
      });

      // Reset form and close
      setFormData(initialFormData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating kit:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar o kit. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderSegsaleMirrorSection = () => (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-primary" />
        <Label className="text-base font-medium">Espelho Segsale</Label>
        {segsaleLoading && <Loader2 className="w-3 h-3 animate-spin" />}
      </div>
      <p className="text-xs text-muted-foreground"></p>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Produto</Label>
          <Select
            value={formData.segsaleMirror.product}
            onValueChange={(value) => updateSegsaleMirror("product", value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione produto" />
            </SelectTrigger>
            <SelectContent>
              {segsaleProducts.map((product) => (
                <SelectItem key={product.id} value={product.nome}>
                  {product.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Módulo</Label>
          <Select value={formData.segsaleMirror.module} onValueChange={(value) => updateSegsaleMirror("module", value)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione módulo" />
            </SelectTrigger>
            <SelectContent>
              {segsaleModules.map((module) => (
                <SelectItem key={module.id} value={module.nome}>
                  {module.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Acessório</Label>
          <Select
            value={formData.segsaleMirror.accessory}
            onValueChange={(value) => updateSegsaleMirror("accessory", value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione acessório" />
            </SelectTrigger>
            <SelectContent>
              {segsaleAccessories.map((accessory) => (
                <SelectItem key={accessory.id} value={accessory.nome}>
                  {accessory.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderEquipmentSection = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base font-medium">
          <Wrench className="w-4 h-4" />
          Equipamentos
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={() => addItem("equipment")}>
          <Plus className="w-3 h-3 mr-1" />
          Adicionar
        </Button>
      </div>

      <div className="space-y-2 max-h-52 overflow-y-auto">
        {formData.equipment.map((item, index) => {
          const itemKey = `equipment-${index}`;
          const isNonHomologated = nonHomologatedItems.has(itemKey);

          return (
            <div
              key={index}
              className={`grid grid-cols-12 gap-2 items-end p-2 border rounded-md ${isNonHomologated ? "border-orange-300 bg-orange-50" : ""}`}
            >
              <div className="col-span-4 relative">
                <SelectOrCreateInput
                  value={item.item_name}
                  onChange={(value) => handleItemNameChange("equipment", index, value)}
                  itemType="equipment"
                  placeholder="Nome do equipamento"
                  className="h-8"
                  allowCreate={false}
                />
                {isNonHomologated && (
                  <div className="absolute -top-1 -right-1">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                  </div>
                )}
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder="Qtd"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem("equipment", index, "quantity", parseInt(e.target.value) || 1)}
                  className="h-8"
                />
              </div>
              <div className="col-span-5">
                <Input
                  placeholder="Descrição (opcional)"
                  value={item.description || ""}
                  onChange={(e) => updateItem("equipment", index, "description", e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem("equipment", index)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Minus className="w-3 h-3" />
                </Button>
              </div>
              {isNonHomologated && (
                <div className="col-span-12 text-xs text-orange-600 mt-1">
                  ⚠️ Este item não está homologado e será sinalizado como pendência
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderSegsaleDropdownSection = (
    title: string,
    type: "accessories" | "modules",
    icon: React.ReactNode,
    items: Omit<HomologationKitItem, "id">[],
    segsaleOptions: { id: number; nome: string }[],
  ) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base font-medium">
          {icon}
          {title}
          {segsaleLoading && <Loader2 className="w-3 h-3 animate-spin" />}
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={() => addItem(type)}>
          <Plus className="w-3 h-3 mr-1" />
          Adicionar
        </Button>
      </div>

      <div className="space-y-2 max-h-52 overflow-y-auto">
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-md">
            <div className="col-span-4">
              <Select value={item.item_name} onValueChange={(value) => handleItemNameChange(type, index, value)}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder={`Selecione ${type === "accessories" ? "acessório" : "módulo"}`} />
                </SelectTrigger>
                <SelectContent>
                  {segsaleOptions.map((option) => (
                    <SelectItem key={option.id} value={option.nome}>
                      {option.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                placeholder="Qtd"
                min="1"
                value={item.quantity}
                onChange={(e) => updateItem(type, index, "quantity", parseInt(e.target.value) || 1)}
                className="h-8"
              />
            </div>
            <div className="col-span-5">
              <Input
                placeholder="Descrição (opcional)"
                value={item.description || ""}
                onChange={(e) => updateItem(type, index, "description", e.target.value)}
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

  const renderSuppliesSection = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base font-medium">
          <Box className="w-4 h-4" />
          Insumos
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={() => addItem("supplies")}>
          <Plus className="w-3 h-3 mr-1" />
          Adicionar
        </Button>
      </div>

      <div className="space-y-2 max-h-52 overflow-y-auto">
        {formData.supplies.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-md">
            <div className="col-span-4">
              <SelectOrCreateInput
                value={item.item_name}
                onChange={(value) => handleItemNameChange("supplies", index, value)}
                itemType="supply"
                placeholder="Nome do insumo"
                className="h-8"
                allowCreate={false}
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                placeholder="Qtd"
                min="1"
                value={item.quantity}
                onChange={(e) => updateItem("supplies", index, "quantity", parseInt(e.target.value) || 1)}
                className="h-8"
              />
            </div>
            <div className="col-span-5">
              <Input
                placeholder="Descrição (opcional)"
                value={item.description || ""}
                onChange={(e) => updateItem("supplies", index, "description", e.target.value)}
                className="h-8"
              />
            </div>
            <div className="col-span-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem("supplies", index)}
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
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Criar Novo Kit de Homologação
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto pr-2 pb-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Kit *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Kit Básico Ruptela Smart5"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o kit e seu uso..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Tipo do Kit</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
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

            {/* Segsale Mirror Section */}
            {renderSegsaleMirrorSection()}

            {/* Items Sections */}
            {renderEquipmentSection()}
            {renderSegsaleDropdownSection(
              "Acessórios",
              "accessories",
              <Package className="w-4 h-4" />,
              formData.accessories,
              segsaleAccessories,
            )}
            {renderSegsaleDropdownSection(
              "Módulos",
              "modules",
              <Cpu className="w-4 h-4" />,
              formData.modules,
              segsaleModules,
            )}
            {renderSuppliesSection()}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Criando..." : "Criar Kit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
