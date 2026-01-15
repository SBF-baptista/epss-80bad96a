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
  trackingCode?: string | null; // Added to detect shipped status as fallback
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
  trackingCode,
  hasInstallationSchedule,
  scheduleDate,
  installationCompleted,
  installationDate
}: KitStatusTimelineProps) => {
  
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        timeZone: 'America/Sao_Paulo'
      });
    } catch {
      return null;
    }
  };

  const formatTime = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
      });
    } catch {
      return null;
    }
  };

  // Step 1: Kickoff
  const getKickoffStatus = () => {
    if (kickoffCompleted) return { status: "completed", statusLabel: "Realizado", date: formatDate(kickoffDate) };
    return { status: "pending", statusLabel: "Pendente", date: null };
  };

  // Step 2: Homologação
  const getHomologationStepStatus = () => {
    if (!homologationStatus || homologationStatus === 'homologar') {
      return { status: "pending", statusLabel: "Pendente", date: null };
    }
    if (homologationStatus === 'agendamento_teste' || homologationStatus === 'execucao_teste') {
      return { status: "in_progress", statusLabel: "Agendada", date: formatDate(homologationDate) };
    }
    if (homologationStatus === 'homologado' || homologationStatus === 'armazenamento_plataforma') {
      return { status: "completed", statusLabel: "Homologada", date: formatDate(homologationDate) };
    }
    return { status: "in_progress", statusLabel: "Em Andamento", date: formatDate(homologationDate) };
  };

  // Step 3: Planejamento
  const getPlanningStepStatus = () => {
    if (planningStatus && planningStatus !== 'pending') {
      return { status: "completed", statusLabel: "Realizado", date: formatDate(planningDate) };
    }
    return { status: "pending", statusLabel: "Pendente", date: null };
  };

  // Step 4: Logística
  // If trackingCode is present, consider as 'shipped' regardless of status (fallback for data inconsistency)
  const getLogisticsStepStatus = () => {
    // Fallback: if tracking_code exists, treat as shipped
    if (trackingCode && trackingCode.trim() !== '') {
      return { status: "step4", statusLabel: "Enviado", date: formatDate(logisticsDate) };
    }
    
    if (!logisticsStatus || logisticsStatus === 'pending') {
      return { status: "pending", statusLabel: "Pendente", date: null };
    }
    if (logisticsStatus === 'scheduled') {
      return { status: "step1", statusLabel: "Pedidos", date: formatDate(logisticsDate) };
    }
    if (logisticsStatus === 'in_progress') {
      return { status: "step2", statusLabel: "Produção", date: formatDate(logisticsDate) };
    }
    if (logisticsStatus === 'completed') {
      return { status: "step3", statusLabel: "Aguard. Envio", date: formatDate(logisticsDate) };
    }
    if (logisticsStatus === 'shipped') {
      return { status: "step4", statusLabel: "Enviado", date: formatDate(logisticsDate) };
    }
    return { status: "pending", statusLabel: "Pendente", date: null };
  };

  // Step 5: Agendamento (de instalação)
  const getSchedulingStepStatus = () => {
    if (hasInstallationSchedule) {
      return { status: "completed", statusLabel: "Realizado", date: formatDate(scheduleDate) };
    }
    return { status: "pending", statusLabel: "Pendente", date: null };
  };

  // Step 6: Instalação
  const getInstallationStepStatus = () => {
    if (installationCompleted) {
      return { status: "completed", statusLabel: "Realizado", date: formatDate(installationDate) };
    }
    return { status: "pending", statusLabel: "Pendente", date: null };
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
      statusLabel: kickoff.statusLabel,
      statusType: kickoff.status,
      date: kickoff.date
    },
    {
      id: "homologation",
      name: "Homologação",
      icon: CheckCircle,
      statusLabel: homologation.statusLabel,
      statusType: homologation.status,
      date: homologation.date
    },
    {
      id: "planning",
      name: "Planejamento",
      icon: Calendar,
      statusLabel: planning.statusLabel,
      statusType: planning.status,
      date: planning.date
    },
    {
      id: "logistics",
      name: "Logística",
      icon: Truck,
      statusLabel: logistics.statusLabel,
      statusType: logistics.status,
      date: logistics.date
    },
    {
      id: "scheduling",
      name: "Agendamento",
      icon: Clock,
      statusLabel: scheduling.statusLabel,
      statusType: scheduling.status,
      date: scheduling.date
    },
    {
      id: "installation",
      name: "Instalação",
      icon: Wrench,
      statusLabel: installation.statusLabel,
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

  const getStatusTextColor = (step: typeof steps[0]) => {
    if (step.statusType === "completed" || step.statusType === "step4") {
      return "text-green-600";
    }
    if (step.statusType === "in_progress" || step.statusType === "step1" || step.statusType === "step2" || step.statusType === "step3") {
      return "text-blue-600";
    }
    return "text-gray-400";
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
                {/* Module name */}
                <div className={`text-xs font-medium ${getTextColor(step)}`}>
                  {step.name}
                </div>
                {/* Status label */}
                <div className={`text-[10px] mt-0.5 font-medium ${getStatusTextColor(step)}`}>
                  {step.statusLabel}
                </div>
                {/* Date and time (if available) */}
                {step.date && (
                  <div className="text-[10px] text-gray-500 flex flex-col items-center">
                    <span>{step.date}</span>
                    {(() => {
                      const dateStr = step.id === 'kickoff' ? kickoffDate :
                                     step.id === 'homologation' ? homologationDate :
                                     step.id === 'planning' ? planningDate :
                                     step.id === 'logistics' ? logisticsDate :
                                     step.id === 'scheduling' ? scheduleDate :
                                     step.id === 'installation' ? installationDate : null;
                      const time = formatTime(dateStr);
                      return time ? <span>{time}</span> : null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
