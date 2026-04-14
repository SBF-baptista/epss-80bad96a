import { Fragment, useState } from "react";
import { CheckCircle, Clock, FileCheck, Truck, Calendar, Wrench, Car } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface InstallationConfirmationInfo {
  plate: string;
  imei: string;
  confirmedAt: string;
}

interface KickoffVehicleDetails {
  brand: string;
  model: string;
  year: number | null;
  plate: string | null;
  receivedAt: string;
}

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
  installationConfirmation?: InstallationConfirmationInfo;
  kickoffVehicleDetails?: KickoffVehicleDetails;
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
  installationDate,
  installationConfirmation,
  kickoffVehicleDetails
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

  const formatFullDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
      }) + ' às ' + new Date(dateString).toLocaleTimeString('pt-BR', {
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

  // Find the index of the next pending step after the last completed/in-progress one
  const getNextPendingIndex = () => {
    let lastActiveIndex = -1;
    for (let i = 0; i < steps.length; i++) {
      if (isCompleted(steps[i]) || isInProgress(steps[i])) {
        lastActiveIndex = i;
      }
    }
    if (lastActiveIndex >= 0 && lastActiveIndex < steps.length - 1) {
      const nextStep = steps[lastActiveIndex + 1];
      if (nextStep.statusType === "pending") {
        return lastActiveIndex + 1;
      }
    }
    return -1;
  };

  const nextPendingIndex = getNextPendingIndex();

  const getStepStyles = (step: typeof steps[0], index: number) => {
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
    if (index === nextPendingIndex) {
      return {
        circle: "bg-yellow-500/15 border-yellow-500/50 text-yellow-600",
        icon: "text-yellow-600",
        name: "text-yellow-700 font-medium",
        status: "text-yellow-600",
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
    
    if (isCompleted(currentStep)) {
      return "bg-green-500";
    }
    
    return "bg-muted-foreground/30";
  };

  const renderStepIcon = (step: typeof steps[0], index: number) => {
    const styles = getStepStyles(step, index);
    const Icon = step.icon;

    const hasKickoffPopover = step.id === "kickoff" && kickoffVehicleDetails && !kickoffCompleted;
    const hasInstallationPopover = step.id === "installation" && installationCompleted;

    const iconElement = (
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200 bg-card ${styles.circle} ${
          (hasInstallationPopover || hasKickoffPopover) ? "cursor-pointer hover:scale-110" : ""
        }`}
      >
        <Icon className={`h-3.5 w-3.5 ${styles.icon}`} />
      </div>
    );

    // If kickoff is pending and has vehicle details, show popover
    if (hasKickoffPopover && kickoffVehicleDetails) {
      return (
        <Popover>
          <PopoverTrigger asChild>
            {iconElement}
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="center" side="top">
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center">
                  <Car className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Aguardando Kickoff</h4>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Veículo</span>
                  <span className="text-xs font-medium text-foreground">
                    {kickoffVehicleDetails.brand} {kickoffVehicleDetails.model}
                  </span>
                </div>
                {kickoffVehicleDetails.year && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Ano</span>
                    <span className="text-xs text-foreground">{kickoffVehicleDetails.year}</span>
                  </div>
                )}
                {kickoffVehicleDetails.plate && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Placa</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {kickoffVehicleDetails.plate}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Recebido em</span>
                  <span className="text-xs text-foreground">
                    {formatFullDate(kickoffVehicleDetails.receivedAt)}
                  </span>
                </div>
              </div>

              <div className="pt-1 border-t border-border">
                <p className="text-[10px] text-muted-foreground/60">
                  Veículo aguardando aprovação de kickoff
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    // If installation is completed, wrap in popover
    if (step.id === "installation" && installationCompleted && installationConfirmation) {
      return (
        <Popover>
          <PopoverTrigger asChild>
            {iconElement}
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="center" side="top">
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-green-500/15 flex items-center justify-center">
                  <Wrench className="h-3.5 w-3.5 text-green-600" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Instalação Confirmada</h4>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Placa</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {installationConfirmation.plate}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">IMEI</span>
                  <span className="font-mono text-xs text-foreground">{installationConfirmation.imei}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Confirmação</span>
                  <span className="text-xs text-foreground">
                    {formatFullDate(installationConfirmation.confirmedAt)}
                  </span>
                </div>
              </div>

              <div className="pt-1 border-t border-border">
                <p className="text-[10px] text-muted-foreground/60">
                  Dados enviados pela aplicação INSTALA
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    return iconElement;
  };

  return (
    <div className="py-3 px-1">
      <div className="flex items-start w-full">
        {steps.map((step, index) => {
          const styles = getStepStyles(step, index);
          const isLastStep = index === steps.length - 1;

          return (
            <Fragment key={step.id}>
              {/* Step */}
              <div className="flex flex-col items-center min-w-[72px]">
                {renderStepIcon(step, index)}

                <div className="text-center mt-1.5 min-w-0">
                  <div className={`text-[10px] leading-tight ${styles.name}`}>{step.name}</div>
                  <div className={`text-[9px] mt-0.5 font-medium ${styles.status}`}>{step.statusLabel}</div>

                  {step.date && (
                    <div className="text-[9px] text-muted-foreground/50 flex flex-col items-center mt-0.5">
                      <span>{step.date}</span>
                      {(() => {
                        const dateStr =
                          step.id === "kickoff"
                            ? kickoffDate
                            : step.id === "homologation"
                              ? homologationDate
                              : step.id === "planning"
                                ? planningDate
                                : step.id === "logistics"
                                  ? logisticsDate
                                  : step.id === "scheduling"
                                    ? scheduleDate
                                    : step.id === "installation"
                                      ? installationDate
                                      : null;
                        const time = formatTime(dateStr);
                        return time ? <span>{time}</span> : null;
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector */}
              {!isLastStep && (
                <div
                  className={`mt-4 h-[2px] flex-1 ${getLineColor(index)} rounded-full transition-colors duration-300`}
                />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
};
