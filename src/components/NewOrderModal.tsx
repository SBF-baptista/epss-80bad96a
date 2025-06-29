
import { useState, useEffect } from "react";
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
import { Plus, X, Sparkles } from "lucide-react";
import { createOrder, applyAutomationRules } from "@/services/orderService";
import { useToast } from "@/hooks/use-toast";

export interface Vehicle {
  brand: string;
  model: string;
  quantity: number;
  year?: string;
}

export interface Tracker {
  model: string;
  quantity: number;
}

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
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
  "LCV PEUGEOT",
  "FMS250",
  "J1939 + FMS250",
  "HCV - Truck3 + FMS250",
  "OBD - BMW / LCV - BMW18",
  "LCV group - CITROEN13 / OBD - CITROEN",
  "J1939"
];

const vehicleBrands = ["VOLKSWAGEN", "CATERPILLAR", "XCMG", "FORD", "BMW", "CITROEN", "HYUNDAI", "Mercedes-Benz", "Volvo", "Scania", "DAF", "Iveco", "Fiat", "Renault", "Peugeot"];
const trackerModels = ["SMART5", "Ruptella Smart5", "Ruptella ECO4", "Queclink GV75", "Teltonika FMB920", "Positron PX300"];

const NewOrderModal = ({ isOpen, onClose, onOrderCreated }: NewOrderModalProps) => {
  const [orderNumber, setOrderNumber] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [configurationType, setConfigurationType] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low" | undefined>(undefined);
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplyingRules, setIsApplyingRules] = useState(false);

  // Vehicle form state
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleQuantity, setVehicleQuantity] = useState(1);

  // Tracker form state
  const [trackerModel, setTrackerModel] = useState("");
  const [trackerQuantity, setTrackerQuantity] = useState(1);

  const { toast } = useToast();

  const resetForm = () => {
    setOrderNumber("");
    setVehicles([]);
    setTrackers([]);
    setConfigurationType("");
    setPriority(undefined);
    setEstimatedDelivery("");
    setVehicleBrand("");
    setVehicleModel("");
    setVehicleYear("");
    setVehicleQuantity(1);
    setTrackerModel("");
    setTrackerQuantity(1);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

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

  const applySuggestions = async () => {
    if (vehicles.length === 0) {
      toast({
        title: "Adicione veículos primeiro",
        description: "É necessário adicionar pelo menos um veículo para aplicar sugestões automáticas.",
        variant: "destructive",
      });
      return;
    }

    setIsApplyingRules(true);
    
    try {
      const suggestions = await applyAutomationRules(vehicles);
      
      if (suggestions.trackers.length > 0) {
        setTrackers(suggestions.trackers);
        toast({
          title: "Sugestões aplicadas!",
          description: `${suggestions.trackers.length} rastreador(es) sugerido(s) com base nos veículos.`,
        });
      }
      
      if (suggestions.configuration) {
        setConfigurationType(suggestions.configuration);
      }

      if (suggestions.trackers.length === 0 && !suggestions.configuration) {
        toast({
          title: "Nenhuma sugestão encontrada",
          description: "Não foram encontradas regras de automação para os veículos selecionados.",
        });
      }
      
    } catch (error) {
      console.error('Error applying suggestions:', error);
      toast({
        title: "Erro ao aplicar sugestões",
        description: "Ocorreu um erro ao buscar sugestões automáticas.",
        variant: "destructive",
      });
    } finally {
      setIsApplyingRules(false);
    }
  };

  const handleSubmit = async () => {
    if (orderNumber && vehicles.length > 0 && trackers.length > 0 && configurationType) {
      setIsSubmitting(true);
      
      try {
        await createOrder({
          numero_pedido: orderNumber,
          vehicles,
          trackers,
          configurationType
        });
        
        toast({
          title: "Pedido criado com sucesso!",
          description: `Pedido ${orderNumber} foi criado e adicionado ao Kanban.`,
        });
        
        onOrderCreated();
        resetForm();
      } catch (error) {
        console.error('Error creating order:', error);
        toast({
          title: "Erro ao criar pedido",
          description: "Ocorreu um erro ao criar o pedido. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
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
                  <Select value={priority || ""} onValueChange={(value) => setPriority(value as "high" | "medium" | "low")}>
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
                  <Input
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="Ex: FH540"
                  />
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
                        onClick={applySuggestions}
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
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar Pedido"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewOrderModal;
