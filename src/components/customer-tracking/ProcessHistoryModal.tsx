import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Clock, History, FileText, MapPin, Package, 
  ChevronDown, ChevronRight, Truck, CalendarCheck,
  CheckCircle2, RefreshCw, Car, Wrench, AlertCircle
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { 
  fetchProcessHistory, 
  subscribeToProcessHistory,
  ProcessHistory,
  ProcessEvent 
} from "@/services/processHistoryService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProcessHistoryModalProps {
  scheduleId: string;
  incomingVehicleId?: string | null;
}

// Module color configs - soft, enterprise palette
const moduleConfig: Record<string, { bg: string; text: string; border: string; iconBg: string; iconBorder: string; iconText: string; dot: string }> = {
  'Kickoff': {
    bg: 'bg-violet-50/80', text: 'text-violet-700', border: 'border-violet-200/60',
    iconBg: 'bg-violet-50', iconBorder: 'border-violet-300', iconText: 'text-violet-600',
    dot: 'bg-violet-400'
  },
  'Homologação': {
    bg: 'bg-blue-50/80', text: 'text-blue-700', border: 'border-blue-200/60',
    iconBg: 'bg-blue-50', iconBorder: 'border-blue-300', iconText: 'text-blue-600',
    dot: 'bg-blue-400'
  },
  'Agendamento': {
    bg: 'bg-teal-50/80', text: 'text-teal-700', border: 'border-teal-200/60',
    iconBg: 'bg-teal-50', iconBorder: 'border-teal-300', iconText: 'text-teal-600',
    dot: 'bg-teal-400'
  },
  'Logística': {
    bg: 'bg-amber-50/80', text: 'text-amber-700', border: 'border-amber-200/60',
    iconBg: 'bg-amber-50', iconBorder: 'border-amber-300', iconText: 'text-amber-600',
    dot: 'bg-amber-400'
  }
};

const defaultModuleConfig = {
  bg: 'bg-muted/50', text: 'text-muted-foreground', border: 'border-border',
  iconBg: 'bg-muted', iconBorder: 'border-border', iconText: 'text-muted-foreground',
  dot: 'bg-muted-foreground'
};

// Typed icons per event type
const eventTypeIcons: Record<string, React.ReactNode> = {
  'vehicle_received': <Car className="h-4 w-4" />,
  'homologation_created': <Wrench className="h-4 w-4" />,
  'homologation_status_change': <CheckCircle2 className="h-4 w-4" />,
  'schedule_created': <CalendarCheck className="h-4 w-4" />,
  'schedule_status_change': <Truck className="h-4 w-4" />,
  'order_created': <Truck className="h-4 w-4" />,
  'order_status_change': <Truck className="h-4 w-4" />,
};

// Group events by month/year for temporal separators
const groupEventsByMonth = (events: ProcessEvent[]) => {
  const groups: { label: string; events: ProcessEvent[] }[] = [];
  let currentLabel = '';

  events.forEach((event) => {
    const date = new Date(event.timestamp);
    const label = format(date, "MMMM 'de' yyyy", { locale: ptBR });
    const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);

    if (capitalizedLabel !== currentLabel) {
      currentLabel = capitalizedLabel;
      groups.push({ label: capitalizedLabel, events: [event] });
    } else {
      groups[groups.length - 1].events.push(event);
    }
  });

  return groups;
};

const EventCard = ({ event, isLast, isLatest }: { event: ProcessEvent; isLast: boolean; isLatest: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const config = moduleConfig[event.module] || defaultModuleConfig;
  const icon = eventTypeIcons[event.type] || <FileText className="h-4 w-4" />;

  const details = getEventDetails(event);
  const hasDetails = details.length > 0;
  const isSystemEvent = event.type === 'schedule_status_change' || event.type === 'order_status_change';

  return (
    <div className="flex gap-3 relative group">
      {/* Continuous timeline line */}
      {!isLast && (
        <div className="absolute left-[18px] top-10 w-[2px] h-[calc(100%+4px)] bg-border/50" />
      )}
      
      {/* Icon node */}
      <div className={`
        flex-shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center z-10
        ${config.iconBg} ${config.iconBorder} ${config.iconText}
        ${isLatest ? 'ring-2 ring-primary/20 ring-offset-1 ring-offset-background' : ''}
      `}>
        {icon}
      </div>
      
      {/* Card */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="flex-1 min-w-0 pb-4">
        <div className={`
          rounded-xl border transition-all duration-200
          ${isLatest 
            ? 'border-primary/25 bg-primary/[0.03] shadow-sm' 
            : isSystemEvent 
              ? 'border-border/40 bg-card/80' 
              : 'border-border/50 bg-card shadow-sm'
          }
          hover:shadow-md hover:border-border/70
        `}>
          <div className="p-3.5">
            {/* Header row: module badge first, then title */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] font-medium px-2 py-0.5 ${config.bg} ${config.text} ${config.border}`}
                  >
                    {event.module}
                  </Badge>
                  <span className={`font-semibold text-sm ${isLatest ? 'text-primary' : 'text-foreground'}`}>
                    {event.title}
                  </span>
                  {isLatest && (
                    <Badge className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 font-medium" variant="outline">
                      Mais recente
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </div>
              
              {hasDetails && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground/60 hover:text-foreground flex-shrink-0">
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-1.5 mt-2">
              <Clock className="h-3 w-3 text-muted-foreground/40" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[11px] text-muted-foreground/60 cursor-default">
                      {event.timeAgo}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {event.formattedDate}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-[11px] text-muted-foreground/40">•</span>
              <span className="text-[11px] text-muted-foreground/50">
                {event.formattedDate}
              </span>
            </div>
          </div>

          {/* Collapsible Details */}
          <CollapsibleContent>
            {hasDetails && (
              <div className="px-3.5 pb-3.5 pt-0">
                <div className="pt-2.5 border-t border-border/30 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Detalhes</span>
                  {details.map((detail, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground/50">{detail.icon}</span>
                      <span className="text-muted-foreground/70">{detail.label}:</span>
                      <span className="font-medium text-foreground/80">{detail.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};

function getEventDetails(event: ProcessEvent) {
  const details: { label: string; value: string; icon: React.ReactNode }[] = [];

  if (event.status) {
    details.push({
      label: 'Status',
      value: event.status,
      icon: <FileText className="h-3 w-3" />
    });
  }

  if (event.type === 'vehicle_received') {
    details.push({ label: 'Tipo', value: 'Entrada de veículo no sistema', icon: <Package className="h-3 w-3" /> });
  }
  if (event.type === 'homologation_created') {
    details.push({ label: 'Processo', value: 'Criação de card de homologação', icon: <FileText className="h-3 w-3" /> });
  }
  if (event.type === 'homologation_status_change') {
    details.push({ label: 'Ação', value: 'Aprovação da homologação do veículo', icon: <FileText className="h-3 w-3" /> });
  }
  if (event.type === 'schedule_created') {
    details.push({ label: 'Ação', value: 'Kit vinculado ao agendamento', icon: <MapPin className="h-3 w-3" /> });
  }
  if (event.type === 'order_created') {
    details.push({ label: 'Ação', value: 'Pedido gerado automaticamente', icon: <Package className="h-3 w-3" /> });
  }

  return details;
}

export const ProcessHistoryModal = ({ 
  scheduleId, 
  incomingVehicleId 
}: ProcessHistoryModalProps) => {
  const [history, setHistory] = useState<ProcessHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const loadHistory = async () => {
    try {
      const data = await fetchProcessHistory(scheduleId, incomingVehicleId);
      setHistory(data);
    } catch (error) {
      console.error('Error loading process history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      const channel = subscribeToProcessHistory(scheduleId, loadHistory);
      return () => { supabase.removeChannel(channel); };
    }
  }, [scheduleId, incomingVehicleId, isOpen]);

  const eventGroups = history ? groupEventsByMonth(history.events) : [];
  const latestEventId = history && history.events.length > 0 
    ? history.events[history.events.length - 1].id 
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors h-9"
        >
          <History className="h-4 w-4" />
          <span className="text-sm">Histórico Completo do Processo</span>
          {history && history.events.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs bg-muted text-muted-foreground h-5 px-1.5">
              {history.events.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] rounded-xl p-0 gap-0 overflow-hidden">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-background border-b border-border/50 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <History className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <span className="text-foreground">Histórico do Processo</span>
              </div>
            </DialogTitle>
            {history && (
              <Badge variant="outline" className="text-xs font-medium px-2.5 py-1 text-muted-foreground">
                {history.events.length} evento{history.events.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                <span className="text-sm text-muted-foreground">Carregando histórico...</span>
              </div>
            </div>
          ) : !history || history.events.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <History className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground text-sm">Nenhum evento registrado ainda.</p>
            </div>
          ) : (
            <ScrollArea className="h-[62vh] -mr-3 pr-3">
              <div className="py-4 space-y-2">
                {/* Current Stage Summary */}
                <div className="p-4 bg-primary/[0.04] border border-primary/15 rounded-xl mb-5">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <AlertCircle className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <h4 className="font-semibold text-sm text-foreground">Status Atual</h4>
                  </div>
                  <p className="text-sm font-medium text-primary pl-[38px]">{history.currentStage}</p>
                  {history.currentStageSince && (
                    <p className="text-xs text-muted-foreground/70 mt-1 pl-[38px]">
                      Desde {new Date(history.currentStageSince).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>

                {/* Events grouped by month */}
                {eventGroups.map((group, groupIndex) => (
                  <div key={group.label}>
                    {/* Temporal separator */}
                    <div className="flex items-center gap-3 py-3">
                      <div className="h-px flex-1 bg-border/40" />
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold px-1">
                        {group.label}
                      </span>
                      <div className="h-px flex-1 bg-border/40" />
                    </div>

                    {/* Events in this group */}
                    <div className="space-y-0">
                      {group.events.map((event, eventIndex) => {
                        const isLastInGroup = eventIndex === group.events.length - 1;
                        const isLastOverall = groupIndex === eventGroups.length - 1 && isLastInGroup;
                        return (
                          <EventCard 
                            key={event.id} 
                            event={event} 
                            isLast={isLastOverall}
                            isLatest={event.id === latestEventId}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
