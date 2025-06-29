
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, X, Sparkles } from "lucide-react";
import { Vehicle, vehicleBrands } from "@/types/order";

interface VehicleSectionProps {
  vehicles: Vehicle[];
  setVehicles: (vehicles: Vehicle[]) => void;
  availableModels: string[];
  vehicleBrand: string;
  setVehicleBrand: (value: string) => void;
  vehicleModel: string;
  setVehicleModel: (value: string) => void;
  vehicleYear: string;
  setVehicleYear: (value: string) => void;
  vehicleQuantity: number;
  setVehicleQuantity: (value: number) => void;
  isApplyingRules: boolean;
  onApplySuggestions: () => void;
}

const VehicleSection = ({
  vehicles,
  setVehicles,
  availableModels,
  vehicleBrand,
  setVehicleBrand,
  vehicleModel,
  setVehicleModel,
  vehicleYear,
  setVehicleYear,
  vehicleQuantity,
  setVehicleQuantity,
  isApplyingRules,
  onApplySuggestions
}: VehicleSectionProps) => {
  const addVehicle = () => {
    if (vehicleBrand && vehicleModel && vehicleQuantity > 0) {
      const newVehicle: Vehicle = { 
        brand: vehicleBrand, 
        model: vehicleModel, 
        quantity: vehicleQuantity,
        year: vehicleYear || undefined
      };
      setVehicles([...vehicles, newVehicle]);
      setVehicleBrand("");
      setVehicleModel("");
      setVehicleYear("");
      setVehicleQuantity(1);
    }
  };

  const removeVehicle = (index: number) => {
    setVehicles(vehicles.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Veículos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>Marca</Label>
            <Select value={vehicleBrand} onValueChange={setVehicleBrand}>
              <SelectTrigger>
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                {vehicleBrands.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Select value={vehicleModel} onValueChange={setVehicleModel}>
              <SelectTrigger>
                <SelectValue placeholder="Modelo" />
              </SelectTrigger>
              <SelectContent className="max-h-48 overflow-y-auto">
                {availableModels.map(model => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ano</Label>
            <Input
              value={vehicleYear}
              onChange={(e) => setVehicleYear(e.target.value)}
              placeholder="Ex: 2024"
            />
          </div>
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input
              type="number"
              min="1"
              value={vehicleQuantity}
              onChange={(e) => setVehicleQuantity(Number(e.target.value))}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={addVehicle} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        {vehicles.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Veículos Adicionados:</h4>
                <Button 
                  onClick={onApplySuggestions}
                  disabled={isApplyingRules}
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isApplyingRules ? "Aplicando..." : "Aplicar Sugestões"}
                </Button>
              </div>
              <div className="space-y-2">
                {vehicles.map((vehicle, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">
                      {vehicle.brand} {vehicle.model} {vehicle.year && `(${vehicle.year})`} - {vehicle.quantity}x
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeVehicle(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default VehicleSection;
