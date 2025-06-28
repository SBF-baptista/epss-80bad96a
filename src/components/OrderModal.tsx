
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Order } from "@/services/orderService";

interface OrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

const OrderModal = ({ order, isOpen, onClose }: OrderModalProps) => {
  if (!order) return null;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "novos":
        return "Novos Pedidos";
      case "producao":
        return "Em Produção";
      case "aguardando":
        return "Aguardando Envio";
      case "enviado":
        return "Enviado";
      case "standby":
        return "Em Stand-by";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "novos":
        return "bg-blue-100 text-blue-800";
      case "producao":
        return "bg-yellow-100 text-yellow-800";
      case "aguardando":
        return "bg-orange-100 text-orange-800";
      case "enviado":
        return "bg-green-100 text-green-800";
      case "standby":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case "high":
        return "Alta";
      case "medium":
        return "Média";
      case "low":
        return "Baixa";
      default:
        return "Normal";
    }
  };

  const totalVehicles = order.vehicles.reduce((sum, vehicle) => sum + vehicle.quantity, 0);
  const totalTrackers = order.trackers.reduce((sum, tracker) => sum + tracker.quantity, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Pedido de instalação {order.number}
          </DialogTitle>
          <DialogDescription>
            Detalhes completos do pedido de configuração
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status e Prioridade */}
          <div className="flex items-center space-x-3">
            <Badge className={getStatusColor(order.status)}>
              {getStatusLabel(order.status)}
            </Badge>
            {order.priority && (
              <Badge className={getPriorityColor(order.priority)}>
                Prioridade {getPriorityLabel(order.priority)}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Veículos */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Veículos ({totalVehicles} unidades)</h3>
            <div className="space-y-3">
              {order.vehicles.map((vehicle, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{vehicle.brand} {vehicle.model}</p>
                  </div>
                  <Badge variant="outline" className="font-semibold">
                    {vehicle.quantity} {vehicle.quantity === 1 ? 'unidade' : 'unidades'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Rastreadores */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Rastreadores ({totalTrackers} unidades)</h3>
            <div className="space-y-3">
              {order.trackers.map((tracker, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{tracker.model}</p>
                  </div>
                  <Badge variant="outline" className="font-semibold">
                    {tracker.quantity} {tracker.quantity === 1 ? 'unidade' : 'unidades'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Configuração */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Configuração</h3>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-blue-900 font-medium">{order.configurationType}</p>
            </div>
          </div>

          <Separator />

          {/* Datas */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Cronograma</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Data de Criação</label>
                <p className="text-gray-900 font-medium">
                  {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              {order.estimatedDelivery && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Previsão de Entrega</label>
                  <p className="text-gray-900 font-medium">
                    {new Date(order.estimatedDelivery).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {order.status === "standby" && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-red-600 font-medium">⚠️ Status de Exceção</span>
              </div>
              <p className="text-red-700 text-sm mt-1">
                Este pedido está em stand-by e requer atenção especial.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderModal;
