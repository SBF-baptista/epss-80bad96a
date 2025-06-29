
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createOrder, applyAutomationRules } from "@/services/orderService";
import { fetchAutomationRules } from "@/services/automationRulesService";
import { useToast } from "@/hooks/use-toast";
import { Vehicle, Tracker } from "@/types/order";
import OrderBasicInfo from "./OrderBasicInfo";
import VehicleSection from "./VehicleSection";
import TrackerSection from "./TrackerSection";

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}

const NewOrderModal = ({ isOpen, onClose, onOrderCreated }: NewOrderModalProps) => {
  const [orderNumber, setOrderNumber] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [configurationType, setConfigurationType] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low" | undefined>(undefined);
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplyingRules, setIsApplyingRules] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Vehicle form state
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleQuantity, setVehicleQuantity] = useState(1);

  // Tracker form state
  const [trackerModel, setTrackerModel] = useState("");
  const [trackerQuantity, setTrackerQuantity] = useState(1);

  const { toast } = useToast();

  // Load available models from automation rules
  useEffect(() => {
    const loadAvailableModels = async () => {
      try {
        const rules = await fetchAutomationRules();
        const models = [...new Set(rules.map(rule => rule.model))].sort();
        setAvailableModels(models);
      } catch (error) {
        console.error('Error loading available models:', error);
      }
    };

    if (isOpen) {
      loadAvailableModels();
    }
  }, [isOpen]);

  // Auto-fill tracker and configuration when brand/model changes
  useEffect(() => {
    const autoFillFields = async () => {
      if (vehicleBrand && vehicleModel) {
        try {
          const suggestions = await applyAutomationRules([{
            brand: vehicleBrand,
            model: vehicleModel,
            quantity: 1,
            year: vehicleYear || undefined
          }]);

          if (suggestions.trackers.length > 0) {
            setTrackerModel(suggestions.trackers[0].model);
          }

          if (suggestions.configuration) {
            setConfigurationType(suggestions.configuration);
          }
        } catch (error) {
          console.error('Error auto-filling fields:', error);
        }
      }
    };

    autoFillFields();
  }, [vehicleBrand, vehicleModel, vehicleYear]);

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
          <OrderBasicInfo
            orderNumber={orderNumber}
            setOrderNumber={setOrderNumber}
            priority={priority}
            setPriority={setPriority}
            estimatedDelivery={estimatedDelivery}
            setEstimatedDelivery={setEstimatedDelivery}
          />

          <VehicleSection
            vehicles={vehicles}
            setVehicles={setVehicles}
            availableModels={availableModels}
            vehicleBrand={vehicleBrand}
            setVehicleBrand={setVehicleBrand}
            vehicleModel={vehicleModel}
            setVehicleModel={setVehicleModel}
            vehicleYear={vehicleYear}
            setVehicleYear={setVehicleYear}
            vehicleQuantity={vehicleQuantity}
            setVehicleQuantity={setVehicleQuantity}
            isApplyingRules={isApplyingRules}
            onApplySuggestions={applySuggestions}
          />

          <TrackerSection
            trackers={trackers}
            setTrackers={setTrackers}
            configurationType={configurationType}
            setConfigurationType={setConfigurationType}
            trackerModel={trackerModel}
            setTrackerModel={setTrackerModel}
            trackerQuantity={trackerQuantity}
            setTrackerQuantity={setTrackerQuantity}
          />

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
