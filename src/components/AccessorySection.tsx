import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

interface Accessory {
  name: string;
  quantity: number;
}

interface AccessorySectionProps {
  accessories: Accessory[];
  setAccessories: (accessories: Accessory[]) => void;
}

const AccessorySection = ({ accessories, setAccessories }: AccessorySectionProps) => {
  const addAccessory = () => {
    setAccessories([...accessories, { name: "", quantity: 1 }]);
  };

  const removeAccessory = (index: number) => {
    setAccessories(accessories.filter((_, i) => i !== index));
  };

  const updateAccessory = (index: number, field: keyof Accessory, value: string | number) => {
    const updatedAccessories = accessories.map((accessory, i) => 
      i === index ? { ...accessory, [field]: value } : accessory
    );
    setAccessories(updatedAccessories);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Acessórios</CardTitle>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={addAccessory}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Acessório
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {accessories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum acessório adicionado. Clique em "Adicionar Acessório" para incluir acessórios no pedido.
          </p>
        ) : (
          accessories.map((accessory, index) => (
            <div key={index} className="flex items-end gap-4 p-4 border rounded-lg">
              <div className="flex-1 space-y-2">
                <Label htmlFor={`accessory-name-${index}`}>Nome do Acessório</Label>
                <Input
                  id={`accessory-name-${index}`}
                  placeholder="Ex: Cabo de alimentação, Antena GPS..."
                  value={accessory.name}
                  onChange={(e) => updateAccessory(index, "name", e.target.value)}
                />
              </div>
              <div className="w-24 space-y-2">
                <Label htmlFor={`accessory-quantity-${index}`}>Qtd</Label>
                <Input
                  id={`accessory-quantity-${index}`}
                  type="number"
                  min="1"
                  value={accessory.quantity}
                  onChange={(e) => updateAccessory(index, "quantity", parseInt(e.target.value) || 1)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeAccessory(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default AccessorySection;