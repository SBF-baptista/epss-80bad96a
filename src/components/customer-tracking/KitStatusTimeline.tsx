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
  trackingCode?: string | null;
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
  const getLogisticsStepStatus = () => {
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

  const isCompleted = (step: typeof steps[0]) => {
    return step.statusType === "completed" || step.statusType === "step4";
  };

  const isInProgress = (step: typeof steps[0]) => {
    return step.statusType === "in_progress" || 
           step.statusType === "step1" || 
           step.statusType === "step2" || 
           step.statusType === "step3";
  };

  const getStepStyles = (step: typeof steps[0]) => {
    if (isCompleted(step)) {
      return {
        circle: "bg-green-500/15 border-green-500/40 text-green-600",
        icon: "text-green-600",
        name: "text-foreground font-medium",
        status: "text-green-600",
      };
    }
    if (isInProgress(step)) {
      return {
        circle: "bg-primary/10 border-primary/40 text-primary",
        icon: "text-primary",
        name: "text-foreground font-medium",
        status: "text-primary",
      };
    }
    return {
      circle: "bg-muted/50 border-border text-muted-foreground/50",
      icon: "text-muted-foreground/50",
      name: "text-muted-foreground/70",
      status: "text-muted-foreground/50",
    };
  };

  // Determines if the line between two steps should be green (completed) or gray (pending)
  const getLineColor = (currentIndex: number) => {
    const currentStep = steps[currentIndex];
    
    // Line is green if the current step is completed (meaning the process passed through this point)
    if (isCompleted(currentStep)) {
      return "bg-green-500";
    }
    
    // Line is gray if the process hasn't reached/completed this step yet
    return "bg-muted-foreground/30";
  };

  return (
    <div className="py-3 px-1">
      <div className="flex justify-between items-start">
        {steps.map((step, index) => {
          const styles = getStepStyles(step);
          const Icon = step.icon;
          const isLastStep = index === steps.length - 1;
          
          return (
            <div key={step.id} className="flex flex-col items-center flex-1 relative">
              {/* Connection line to next step */}
              {!isLastStep && (
                <div 
                  className={`absolute top-4 h-[2px] ${getLineColor(index)} transition-colors duration-300`}
                  style={{
                    left: '50%',
                    right: '-50%',
                    transform: 'translateX(16px)',
                    zIndex: 0
                  }}
                />
              )}
              
              {/* Icon circle */}
              <div 
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200 bg-card relative
                  ${styles.circle}
                `}
                style={{ zIndex: 1 }}
              >
                <Icon className={`h-3.5 w-3.5 ${styles.icon}`} />
              </div>
              
              <div className="text-center mt-1.5 min-w-0">
                {/* Module name */}
                <div className={`text-[10px] leading-tight ${styles.name}`}>
                  {step.name}
                </div>
                {/* Status label */}
                <div className={`text-[9px] mt-0.5 font-medium ${styles.status}`}>
                  {step.statusLabel}
                </div>
                {/* Date and time (if available) */}
                {step.date && (
                  <div className="text-[9px] text-muted-foreground/50 flex flex-col items-center mt-0.5">
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
