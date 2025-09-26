import { CheckCircle, Clock, User, Package } from "lucide-react";

interface KitStatusTimelineProps {
  status: string;
}

export const KitStatusTimeline = ({ status }: KitStatusTimelineProps) => {
  const steps = [
    {
      id: "homologation",
      label: "Homologação",
      icon: Package,
      description: "Validação dos itens do kit"
    },
    {
      id: "scheduled",
      label: "Disponível para técnico",
      icon: Clock,
      description: "Aguardando atribuição"
    },
    {
      id: "assigned",
      label: "Agendado",
      icon: User,
      description: "Técnico atribuído"
    },
    {
      id: "completed",
      label: "Concluído",
      icon: CheckCircle,
      description: "Instalação finalizada"
    }
  ];

  const getStepStatus = (stepId: string) => {
    const statusOrder = ["homologation", "scheduled", "assigned", "completed"];
    const currentIndex = statusOrder.indexOf(status);
    const stepIndex = statusOrder.indexOf(stepId);

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
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
                  ? "bg-blue-500 border-blue-500 text-white"
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