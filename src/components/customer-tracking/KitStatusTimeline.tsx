import { CheckCircle, Clock, FileCheck, Truck, Calendar, Wrench } from "lucide-react";

interface KitStatusTimelineProps {
  kickoffCompleted?: boolean;
  homologationStatus?: string | null;
  planningStatus?: string; // scheduled = planejado
  logisticsStatus?: string; // scheduled, in_progress, completed, shipped
  hasInstallationSchedule?: boolean;
  installationCompleted?: boolean;
}

export const KitStatusTimeline = ({ 
  kickoffCompleted,
  homologationStatus,
  planningStatus,
  logisticsStatus,
  hasInstallationSchedule,
  installationCompleted
}: KitStatusTimelineProps) => {
  
  // Step 1: Kickoff
  const getKickoffStatus = () => {
    if (kickoffCompleted) return { status: "completed", label: "Realizado" };
    return { status: "pending", label: "Pendente" };
  };

  // Step 2: Homologação
  const getHomologationStepStatus = () => {
    // homologation_status enum: homologar, em_homologacao, em_testes_finais, homologado, agendamento_teste, execucao_teste, armazenamento_plataforma
    if (!homologationStatus || homologationStatus === 'homologar') {
      return { status: "pending", label: "Pendente" };
    }
    if (homologationStatus === 'agendamento_teste' || homologationStatus === 'execucao_teste') {
      return { status: "in_progress", label: "Agendada" };
    }
    if (homologationStatus === 'homologado' || homologationStatus === 'armazenamento_plataforma') {
      return { status: "completed", label: "Homologada" };
    }
    // em_homologacao, em_testes_finais
    return { status: "in_progress", label: "Em Andamento" };
  };

  // Step 3: Planejamento
  const getPlanningStepStatus = () => {
    // Se tem um kit_schedule criado (qualquer status), o planejamento foi realizado
    if (planningStatus) {
      return { status: "completed", label: "Realizado" };
    }
    return { status: "pending", label: "Pendente" };
  };

  // Step 4: Logística
  const getLogisticsStepStatus = () => {
    if (!logisticsStatus || logisticsStatus === 'pending') {
      return { status: "pending", label: "Pendente" };
    }
    if (logisticsStatus === 'scheduled') {
      return { status: "step1", label: "Pedidos" };
    }
    if (logisticsStatus === 'in_progress') {
      return { status: "step2", label: "Produção" };
    }
    if (logisticsStatus === 'completed') {
      return { status: "step3", label: "Aguard. Envio" };
    }
    if (logisticsStatus === 'shipped') {
      return { status: "step4", label: "Enviado" };
    }
    return { status: "pending", label: "Pendente" };
  };

  // Step 5: Agendamento (de instalação)
  const getSchedulingStepStatus = () => {
    if (hasInstallationSchedule) {
      return { status: "completed", label: "Realizado" };
    }
    return { status: "pending", label: "Pendente" };
  };

  // Step 6: Instalação
  const getInstallationStepStatus = () => {
    if (installationCompleted) {
      return { status: "completed", label: "Realizado" };
    }
    return { status: "pending", label: "Pendente" };
  };

  const kickoff = getKickoffStatus();
  const homologation = getHomologationStepStatus();
  const planning = getPlanningStepStatus();
  const logistics = getLogisticsStepStatus();
  const scheduling = getSchedulingStepStatus();
  const installation = getInstallationStepStatus();

  const steps = [
    {
      id: "kickoff",
      label: "Kickoff",
      icon: FileCheck,
      ...kickoff
    },
    {
      id: "homologation",
      label: "Homologação",
      icon: CheckCircle,
      ...homologation
    },
    {
      id: "planning",
      label: "Planejamento",
      icon: Calendar,
      ...planning
    },
    {
      id: "logistics",
      label: "Logística",
      icon: Truck,
      ...logistics
    },
    {
      id: "scheduling",
      label: "Agendamento",
      icon: Clock,
      ...scheduling
    },
    {
      id: "installation",
      label: "Instalação",
      icon: Wrench,
      ...installation
    }
  ];

  const getStepColor = (step: typeof steps[0]) => {
    if (step.status === "completed" || step.status === "step4") {
      return "bg-green-500 border-green-500 text-white";
    }
    if (step.status === "in_progress" || step.status === "step1" || step.status === "step2" || step.status === "step3") {
      return "bg-blue-500 border-blue-500 text-white";
    }
    return "bg-gray-200 border-gray-300 text-gray-500";
  };

  const getTextColor = (step: typeof steps[0]) => {
    if (step.status === "completed" || step.status === "step4" || 
        step.status === "in_progress" || step.status === "step1" || 
        step.status === "step2" || step.status === "step3") {
      return "text-gray-900";
    }
    return "text-gray-500";
  };

  return (
    <div className="py-4">
      <div className="flex justify-between items-center relative">
        {/* Timeline line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0" />
        
        {steps.map((step) => {
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="flex flex-col items-center z-10 bg-white px-1">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                ${getStepColor(step)}
              `}>
                <Icon className="h-5 w-5" />
              </div>
              
              <div className="text-center mt-2 min-w-0">
                <div className={`text-xs font-medium ${getTextColor(step)}`}>
                  {step.label}
                </div>
                <div className={`text-[10px] mt-0.5 ${
                  step.status === "completed" || step.status === "step4" 
                    ? "text-green-600 font-medium" 
                    : step.status === "in_progress" || step.status === "step1" || step.status === "step2" || step.status === "step3"
                    ? "text-blue-600 font-medium"
                    : "text-gray-400"
                }`}>
                  {step.id === "logistics" ? logistics.label : 
                   step.id === "homologation" ? homologation.label :
                   step.id === "kickoff" ? kickoff.label :
                   step.id === "planning" ? planning.label :
                   step.id === "scheduling" ? scheduling.label :
                   installation.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
