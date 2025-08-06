
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Order, deleteOrder } from "@/services/orderService";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const OrderModal = ({ order, isOpen, onClose, onUpdate }: OrderModalProps) => {
  const { role } = useUserRole();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!order) return null;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "novos":
        return "Pedidos";
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

  const handleDeleteOrder = async () => {
    if (!order?.id) return;
    
    setIsDeleting(true);
    try {
      await deleteOrder(order.id);
      toast({
        title: "Pedido deletado",
        description: `O pedido ${order.number} foi deletado com sucesso.`,
      });
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar o pedido. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const totalVehicles = order.vehicles.reduce((sum, vehicle) => sum + vehicle.quantity, 0);
  const totalTrackers = order.trackers.reduce((sum, tracker) => sum + tracker.quantity, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                Pedido de instalação {order.number}
              </DialogTitle>
              <DialogDescription>
                Detalhes completos do pedido de configuração
              </DialogDescription>
            </div>
            {role === 'admin' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza de que deseja deletar o pedido {order.number}? 
                      Esta ação não pode ser desfeita e removerá permanentemente o pedido e todos os seus dados relacionados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteOrder}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deletando..." : "Deletar pedido"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
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

          {/* Configuração de Items */}
          <div className="space-y-6">
            {/* Veículos */}
            <div>
              <h3 className="font-semibold text-lg mb-4 text-primary">Veículos ({totalVehicles} unidades)</h3>
              <div className="space-y-3">
                {order.vehicles.map((vehicle, index) => (
                  <div key={index} className="p-4 bg-muted/50 rounded-lg border">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{vehicle.brand} {vehicle.model}</p>
                        {vehicle.year && (
                          <p className="text-sm text-muted-foreground">Ano: {vehicle.year}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="font-semibold">
                        {vehicle.quantity} {vehicle.quantity === 1 ? 'unidade' : 'unidades'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rastreadores */}
            <div>
              <h3 className="font-semibold text-lg mb-4 text-primary">Rastreadores ({totalTrackers} unidades)</h3>
              <div className="space-y-3">
                {order.trackers.map((tracker, index) => (
                  <div key={index} className="p-4 bg-muted/50 rounded-lg border">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-foreground">{tracker.model}</p>
                      </div>
                      <Badge variant="secondary" className="font-semibold">
                        {tracker.quantity} {tracker.quantity === 1 ? 'unidade' : 'unidades'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Acessórios */}
            {order.accessories && order.accessories.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4 text-primary">
                  Acessórios ({order.accessories.reduce((sum, acc) => sum + acc.quantity, 0)} unidades)
                </h3>
                <div className="space-y-3">
                  {order.accessories.map((accessory, index) => (
                    <div key={index} className="p-4 bg-muted/50 rounded-lg border">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-foreground">{accessory.name}</p>
                        </div>
                        <Badge variant="secondary" className="font-semibold">
                          {accessory.quantity} {accessory.quantity === 1 ? 'unidade' : 'unidades'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Configuração de Protocolo */}
            <div>
              <h3 className="font-semibold text-lg mb-4 text-primary">Configuração de Protocolo</h3>
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <p className="text-primary font-semibold text-lg">{order.configurationType}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Protocolo de comunicação específico para os dispositivos deste pedido
                </p>
              </div>
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
