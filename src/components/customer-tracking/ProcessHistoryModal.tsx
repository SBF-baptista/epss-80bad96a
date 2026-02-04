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
import { Clock, History, FileText, MapPin, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  fetchProcessHistory, 
  subscribeToProcessHistory,
  ProcessHistory 
} from "@/services/processHistoryService";

interface ProcessHistoryModalProps {
  scheduleId: string;
  incomingVehicleId?: string | null;
}

const moduleColors: Record<string, string> = {
  'Kickoff': 'bg-purple-50 text-purple-700 border-purple-200',
  'Homologação': 'bg-blue-50 text-blue-700 border-blue-200',
  'Agendamento': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Esteira de Pedidos': 'bg-orange-50 text-orange-700 border-orange-200'
};

const moduleIconColors: Record<string, string> = {
  'Kickoff': 'border-purple-300 bg-purple-50 text-purple-600',
  'Homologação': 'border-blue-300 bg-blue-50 text-blue-600',
  'Agendamento': 'border-cyan-300 bg-cyan-50 text-cyan-600',
  'Esteira de Pedidos': 'border-orange-300 bg-orange-50 text-orange-600'
};

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

      // Subscribe to real-time updates
      const channel = subscribeToProcessHistory(scheduleId, loadHistory);

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [scheduleId, incomingVehicleId, isOpen]);

  const getEventDetails = (event: any) => {
    const details: { label: string; value: string; icon: React.ReactNode }[] = [];

    if (event.status) {
      details.push({
        label: 'Status',
        value: event.status,
        icon: <FileText className="h-3 w-3" />
      });
    }

    if (event.type === 'vehicle_received') {
      details.push({
        label: 'Tipo',
        value: 'Entrada de veículo no sistema',
        icon: <Package className="h-3 w-3" />
      });
    }

    if (event.type === 'homologation_created') {
      details.push({
        label: 'Processo',
        value: 'Criação de card de homologação',
        icon: <FileText className="h-3 w-3" />
      });
    }

    if (event.type === 'homologation_status_change') {
      details.push({
        label: 'Ação',
        value: 'Aprovação da homologação do veículo',
        icon: <FileText className="h-3 w-3" />
      });
    }

    if (event.type === 'schedule_created') {
      details.push({
        label: 'Ação',
        value: 'Kit vinculado ao agendamento',
        icon: <MapPin className="h-3 w-3" />
      });
    }

    if (event.type === 'order_created') {
      details.push({
        label: 'Ação',
        value: 'Pedido gerado automaticamente',
        icon: <Package className="h-3 w-3" />
      });
    }

    return details;
  };

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
      <DialogContent className="max-w-2xl max-h-[85vh] rounded-xl">
        <DialogHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <History className="h-4 w-4 text-primary" />
              </div>
              Histórico Completo do Processo
            </DialogTitle>
            {history && (
              <Badge variant="outline" className="text-xs font-medium px-2.5 py-1">
                {history.events.length} eventos
              </Badge>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          </div>
        ) : !history || history.events.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <History className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm">Nenhum evento registrado ainda.</p>
          </div>
        ) : (
          <ScrollArea className="h-[55vh] pr-4 -mr-4 scrollbar-thin">
            <div className="space-y-4 py-2">
              {/* Current Stage Summary */}
              <div className="p-4 bg-primary/5 border border-primary/15 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">Status Atual</h4>
                </div>
                <p className="text-sm font-medium text-primary pl-8">{history.currentStage}</p>
                {history.currentStageSince && (
                  <p className="text-xs text-muted-foreground mt-1 pl-8">
                    Desde {new Date(history.currentStageSince).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>

              {/* Events Timeline */}
              <div className="space-y-3 mt-4">
                {history.events.map((event, index) => (
                  <div
                    key={event.id}
                    className="flex gap-3 relative"
                  >
                    {/* Timeline line */}
                    {index < history.events.length - 1 && (
                      <div className="absolute left-[18px] top-10 w-[2px] h-[calc(100%-16px)] bg-border/40" />
                    )}
                    
                    {/* Icon */}
                    <div className={`
                      flex-shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center text-base z-10
                      ${moduleIconColors[event.module] || 'border-border bg-muted text-muted-foreground'}
                    `}>
                      {event.icon}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-3 bg-card border border-border/50 rounded-lg p-3.5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-2 flex-wrap mb-1.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">{event.title}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] px-1.5 py-0 ${moduleColors[event.module] || ''}`}
                            >
                              {event.module}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {event.description}
                          </p>
                        </div>
                      </div>

                      {/* Additional Details */}
                      {getEventDetails(event).length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-border/30 space-y-1.5">
                          {getEventDetails(event).map((detail, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground/70">{detail.icon}</span>
                              <span className="text-muted-foreground">{detail.label}:</span>
                              <span className="font-medium text-foreground/80">{detail.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Timestamp */}
                      <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-border/30">
                        <Clock className="h-3 w-3 text-muted-foreground/50" />
                        <span className="text-[11px] text-muted-foreground/70">
                          {event.formattedDate}
                        </span>
                        <span className="text-[11px] text-muted-foreground/50">
                          ({event.timeAgo})
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
