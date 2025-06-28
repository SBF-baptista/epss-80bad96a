
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, X } from "lucide-react";

export interface Vehicle {
  brand: string;
  model: string;
  quantity: number;
}

export interface Tracker {
  model: string;
  quantity: number;
}

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddOrder: (order: {
    numero_pedido: string;
    vehicles: Vehicle[];
    trackers: Tracker[];
    configurationType: string;
  }) => void;
}

const configurationTypes = [
  "HCV MERCEDES",
  "HCV VOLVO",
  "HCV SCANIA",
  "HCV DAF",
  "HCV IVECO",
  "HCV FORD",
  "LCV FIAT",
  "LCV RENAULT",
  "LCV PEUGEOT"
];

const vehicleBrands = ["Mercedes-Benz", "Volvo", "Scania", "DAF", "Iveco", "Ford", "Fiat", "Renault", "Peugeot"];
const trackerModels = ["Ruptella Smart5", "Ruptella ECO4", "Queclink GV75", "Teltonika FMB920", "Positron PX300"];

const NewOrderModal = ({ isOpen, onClose, onAddOrder }: NewOrderModalProps) => {
  const [orderNumber, setOrderNumber] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [configurationType, setConfigurationType] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low" | undefined>(undefined);
  const [estimatedDelivery, setEstimatedDelivery] = useState("");

  // Vehicle form state
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleQuantity, setVehicleQuantity] = useState(1);

  // Tracker form state
  const [trackerModel, setTrackerModel] = useState("");
  const [trackerQuantity, setTrackerQuantity] = useState(1);

  const resetForm = () => {
    setOrderNumber("");
    setVehicles([]);
    setTrackers([]);
    setConfigurationType("");
    setPriority(undefined);
    setEstimatedDelivery("");
    setVehicleBrand("");
    setVehicleModel("");
    setVehicleQuantity(1);
    setTrackerModel("");
    setTrackerQuantity(1);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addVehicle = () => {
    if (vehicleBrand && vehicleModel && vehicleQuantity > 0) {
      setVehicles([...vehicles, { brand: vehicleBrand, model: vehicleModel, quantity: vehicleQuantity }]);
      setVehicleBrand("");
      setVehicleModel("");
      setVehicleQuantity(1);
    }
  };

  const removeVehicle = (index: number) => {
    setVehicles(vehicles.filter((_, i) => i !== index));
  };

  const addTracker = () => {
    if (trackerModel && trackerQuantity > 0) {
      setTrackers([...trackers, { model: trackerModel, quantity: trackerQuantity }]);
      setTrackerModel("");
      setTrackerQuantity(1);
    }
  };

  const removeTracker = (index: number) => {
    setTrackers(trackers.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (orderNumber && vehicles.length > 0 && trackers.length > 0 && configurationType) {
      onAddOrder({
        numero_pedido: orderNumber,
        vehicles,
        trackers,
        configurationType
      });
      resetForm();
    }
  };

  const isFormValid = orderNumber && vehicles.length > 0 && trackers.length > 0 && configurationType;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Novo Pedido de Instalação</DialogTitle>
          <DialogDescription>
            Cadastre um novo pedido com múltiplos veículos e rastreadores
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Número do Pedido*</Label>
                  <Input
                    id="orderNumber"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="Ex: 007"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="configurationType">Tipo de Configuração*</Label>
                  <Select value={configurationType} onValueChange={setConfigurationType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a configuração" />
                    </SelectTrigger>
                    <SelectContent>
                      {configurationTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select value={priority} onValueChange={(value: "high" | "medium" | "low") => setPriority(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedDelivery">Previsão de Entrega</Label>
                  <Input
                    id="estimatedDelivery"
                    type="date"
                    value={estimatedDelivery}
                    onChange={(e) => setEstimatedDelivery(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Veículos */}
          <Card>
            <CardHeader>
              <CardTitle>Veículos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <Input
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="Ex: FH540"
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
                    <h4 className="font-medium">Veículos Adicionados:</h4>
                    <div className="space-y-2">
                      {vehicles.map((vehicle, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">
                            {vehicle.brand} {vehicle.model} - {vehicle.quantity}x
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

          {/* Rastreadores */}
          <Card>
            <CardHeader>
              <CardTitle>Rastreadores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Select value={trackerModel} onValueChange={setTrackerModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {trackerModels.map(model => (
                        <SelectItem key={model} value={model}>{model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    value={trackerQuantity}
                    onChange={(e) => setTrackerQuantity(Number(e.target.value))}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addTracker} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>

              {trackers.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-medium">Rastreadores Adicionados:</h4>
                    <div className="space-y-2">
                      {trackers.map((tracker, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">
                            {tracker.model} - {tracker.quantity}x
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeTracker(index)}
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

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!isFormValid}>
              Criar Pedido
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewOrderModal;
