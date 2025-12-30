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
import { Clock, History, User, FileText, MapPin, Package } from "lucide-react";
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
  'Kickoff': 'bg-purple-100 text-purple-800 border-purple-300',
  'Homologação': 'bg-blue-100 text-blue-800 border-blue-300',
  'Agendamento': 'bg-cyan-100 text-cyan-800 border-cyan-300',
  'Esteira de Pedidos': 'bg-orange-100 text-orange-800 border-orange-300'
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

    // Add more contextual details based on event type
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
          variant="outline" 
          size="sm" 
          className="w-full flex items-center justify-center gap-2"
        >
          <History className="h-4 w-4" />
          Histórico Completo do Processo
          {history && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {history.events.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico Completo do Processo
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !history || history.events.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum evento registrado ainda.</p>
          </div>
        ) : (
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
              {/* Current Stage Summary */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Status Atual
                </h4>
                <p className="text-sm font-medium text-primary">{history.currentStage}</p>
                {history.currentStageSince && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Desde {new Date(history.currentStageSince).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>

              {/* Events Timeline */}
              <div className="space-y-4 mt-4">
                {history.events.map((event, index) => (
                  <div
                    key={event.id}
                    className="flex gap-4 relative"
                  >
                    {/* Timeline line */}
                    {index < history.events.length - 1 && (
                      <div className="absolute left-5 top-12 w-0.5 h-[calc(100%-24px)] bg-border" />
                    )}
                    
                    {/* Icon */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-background border-2 border-primary flex items-center justify-center text-lg z-10">
                      {event.icon}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-4 bg-card border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-base">{event.title}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${moduleColors[event.module] || ''}`}
                            >
                              {event.module}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {event.description}
                          </p>
                        </div>
                      </div>

                      {/* Additional Details */}
                      {getEventDetails(event).length > 0 && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          {getEventDetails(event).map((detail, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              {detail.icon}
                              <span className="text-muted-foreground">{detail.label}:</span>
                              <span className="font-medium">{detail.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Timestamp */}
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {event.formattedDate}
                        </span>
                        <span className="text-xs text-muted-foreground">
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
