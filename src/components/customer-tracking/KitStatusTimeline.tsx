import { CheckCircle, Clock, User, Package } from "lucide-react";

interface KitStatusTimelineProps {
  status: string;
  kitData?: any;
}

export const KitStatusTimeline = ({ status, kitData }: KitStatusTimelineProps) => {
  const steps = [
    {
      id: "scheduled",
      label: "Pedidos",
      icon: Package,
      description: "Pedido criado"
    },
    {
      id: "in_progress",
      label: "Em Produção",
      icon: Clock,
      description: "Em andamento"
    },
    {
      id: "completed",
      label: "Aguardando Envio",
      icon: User,
      description: "Pronto para envio"
    },
    {
      id: "shipped",
      label: "Enviado",
      icon: CheckCircle,
      description: "Entregue ao cliente"
    }
  ];

  const getStepStatus = (stepId: string) => {
    const statusOrder = ["scheduled", "in_progress", "completed", "shipped"];
    const currentIndex = statusOrder.indexOf(status);
    const stepIndex = statusOrder.indexOf(stepId);

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  const getStepDate = (stepId: string) => {
    if (!kitData) return null;
    
    const stepStatus = getStepStatus(stepId);
    if (stepStatus === "pending") return null;
    
    // Para o status atual e completados, mostramos a data
    if (stepId === "scheduled" && kitData.scheduled_date) {
      return new Date(kitData.scheduled_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
    
    // Para outros status, idealmente precisaríamos de um histórico de mudanças de status
    // Como não temos isso, vamos mostrar apenas para o status atual
    if (stepStatus === "active" && kitData.scheduled_date) {
      return new Date(kitData.scheduled_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
    
    return null;
  };

  return (
    <div className="py-4">
      <div className="flex justify-between items-center relative">
        {/* Timeline line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0" />
        
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(step.id);
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="flex flex-col items-center z-10 bg-white px-2">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                ${stepStatus === "completed" 
                  ? "bg-green-500 border-green-500 text-white" 
                  : stepStatus === "active"
                  ? step.id === "shipped" ? "bg-green-500 border-green-500 text-white" : "bg-blue-500 border-blue-500 text-white"
                  : "bg-gray-200 border-gray-300 text-gray-500"
                }
              `}>
                <Icon className="h-5 w-5" />
              </div>
              
              <div className="text-center mt-2 min-w-0">
                <div className={`
                  text-xs font-medium
                  ${stepStatus === "completed" || stepStatus === "active" 
                    ? "text-gray-900" 
                    : "text-gray-500"
                  }
                `}>
                  {step.label}
                </div>
                {getStepDate(step.id) && (
                  <div className="text-xs text-blue-600 font-medium mt-1">
                    Entrou em {getStepDate(step.id)}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1 max-w-20">
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};