import { CheckCircle, Clock, FileCheck, Truck, Calendar, Wrench } from "lucide-react";

interface KitStatusTimelineProps {
  kickoffCompleted?: boolean;
  kickoffDate?: string | null;
  homologationStatus?: string | null;
  homologationDate?: string | null;
  planningStatus?: string;
  planningDate?: string | null;
  logisticsStatus?: string;
  logisticsDate?: string | null;
  hasInstallationSchedule?: boolean;
  scheduleDate?: string | null;
  installationCompleted?: boolean;
  installationDate?: string | null;
}

export const KitStatusTimeline = ({ 
  kickoffCompleted,
  kickoffDate,
  homologationStatus,
  homologationDate,
  planningStatus,
  planningDate,
  logisticsStatus,
  logisticsDate,
  hasInstallationSchedule,
  scheduleDate,
  installationCompleted,
  installationDate
}: KitStatusTimelineProps) => {
  
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return null;
    }
  };

  // Step 1: Kickoff
  const getKickoffStatus = () => {
    if (kickoffCompleted) return { status: "completed", label: "Realizado", date: formatDate(kickoffDate) };
    return { status: "pending", label: "Pendente", date: null };
  };

  // Step 2: Homologação
  const getHomologationStepStatus = () => {
    if (!homologationStatus || homologationStatus === 'homologar') {
      return { status: "pending", label: "Pendente", date: null };
    }
    if (homologationStatus === 'agendamento_teste' || homologationStatus === 'execucao_teste') {
      return { status: "in_progress", label: "Agendada", date: formatDate(homologationDate) };
    }
    if (homologationStatus === 'homologado' || homologationStatus === 'armazenamento_plataforma') {
      return { status: "completed", label: "Homologada", date: formatDate(homologationDate) };
    }
    return { status: "in_progress", label: "Em Andamento", date: formatDate(homologationDate) };
  };

  // Step 3: Planejamento
  const getPlanningStepStatus = () => {
    if (planningStatus) {
      return { status: "completed", label: "Realizado", date: formatDate(planningDate) };
    }
    return { status: "pending", label: "Pendente", date: null };
  };

  // Step 4: Logística
  const getLogisticsStepStatus = () => {
    if (!logisticsStatus || logisticsStatus === 'pending') {
      return { status: "pending", label: "Pendente", date: null };
    }
    if (logisticsStatus === 'scheduled') {
      return { status: "step1", label: "Pedidos", date: formatDate(logisticsDate) };
    }
    if (logisticsStatus === 'in_progress') {
      return { status: "step2", label: "Produção", date: formatDate(logisticsDate) };
    }
    if (logisticsStatus === 'completed') {
      return { status: "step3", label: "Aguard. Envio", date: formatDate(logisticsDate) };
    }
    if (logisticsStatus === 'shipped') {
      return { status: "step4", label: "Enviado", date: formatDate(logisticsDate) };
    }
    return { status: "pending", label: "Pendente", date: null };
  };

  // Step 5: Agendamento (de instalação)
  const getSchedulingStepStatus = () => {
    if (hasInstallationSchedule) {
      return { status: "completed", label: "Realizado", date: formatDate(scheduleDate) };
    }
    return { status: "pending", label: "Pendente", date: null };
  };

  // Step 6: Instalação
  const getInstallationStepStatus = () => {
    if (installationCompleted) {
      return { status: "completed", label: "Realizado", date: formatDate(installationDate) };
    }
    return { status: "pending", label: "Pendente", date: null };
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
      name: "Kickoff",
      icon: FileCheck,
      statusLabel: kickoff.label,
      statusType: kickoff.status,
      date: kickoff.date
    },
    {
      id: "homologation",
      name: "Homologação",
      icon: CheckCircle,
      statusLabel: homologation.label,
      statusType: homologation.status,
      date: homologation.date
    },
    {
      id: "planning",
      name: "Planejamento",
      icon: Calendar,
      statusLabel: planning.label,
      statusType: planning.status,
      date: planning.date
    },
    {
      id: "logistics",
      name: "Logística",
      icon: Truck,
      statusLabel: logistics.label,
      statusType: logistics.status,
      date: logistics.date
    },
    {
      id: "scheduling",
      name: "Agendamento",
      icon: Clock,
      statusLabel: scheduling.label,
      statusType: scheduling.status,
      date: scheduling.date
    },
    {
      id: "installation",
      name: "Instalação",
      icon: Wrench,
      statusLabel: installation.label,
      statusType: installation.status,
      date: installation.date
    }
  ];

  const getStepColor = (step: typeof steps[0]) => {
    if (step.statusType === "completed" || step.statusType === "step4") {
      return "bg-green-500 border-green-500 text-white";
    }
    if (step.statusType === "in_progress" || step.statusType === "step1" || step.statusType === "step2" || step.statusType === "step3") {
      return "bg-blue-500 border-blue-500 text-white";
    }
    return "bg-gray-200 border-gray-300 text-gray-500";
  };

  const getTextColor = (step: typeof steps[0]) => {
    if (step.statusType === "completed" || step.statusType === "step4" || 
        step.statusType === "in_progress" || step.statusType === "step1" || 
        step.statusType === "step2" || step.statusType === "step3") {
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
                  {step.name}
                </div>
                <div className={`text-[10px] mt-0.5 ${
                  step.statusType === "completed" || step.statusType === "step4" 
                    ? "text-green-600 font-medium" 
                    : step.statusType === "in_progress" || step.statusType === "step1" || step.statusType === "step2" || step.statusType === "step3"
                    ? "text-blue-600 font-medium"
                    : "text-gray-400"
                }`}>
                  {step.date || step.statusLabel}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
