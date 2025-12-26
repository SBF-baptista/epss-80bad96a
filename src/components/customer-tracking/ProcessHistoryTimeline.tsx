import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, History, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  fetchProcessHistory, 
  subscribeToProcessHistory,
  ProcessEvent, 
  ProcessHistory 
} from "@/services/processHistoryService";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProcessHistoryTimelineProps {
  scheduleId: string;
  incomingVehicleId?: string | null;
}

const moduleColors: Record<string, string> = {
  'Kickoff': 'bg-purple-100 text-purple-800 border-purple-300',
  'Homologação': 'bg-blue-100 text-blue-800 border-blue-300',
  'Agendamento': 'bg-cyan-100 text-cyan-800 border-cyan-300',
  'Esteira de Pedidos': 'bg-orange-100 text-orange-800 border-orange-300'
};

export const ProcessHistoryTimeline = ({ 
  scheduleId, 
  incomingVehicleId 
}: ProcessHistoryTimelineProps) => {
  const [history, setHistory] = useState<ProcessHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

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
    loadHistory();

    // Subscribe to real-time updates
    const channel = subscribeToProcessHistory(scheduleId, loadHistory);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scheduleId, incomingVehicleId]);

  if (isLoading) {
    return (
      <div>
        <h5 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <History className="h-4 w-4" />
          Histórico Completo do Processo
        </h5>
        <p className="text-sm text-muted-foreground">Carregando histórico...</p>
      </div>
    );
  }

  if (!history || history.events.length === 0) {
    return (
      <div>
        <h5 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <History className="h-4 w-4" />
          Histórico Completo do Processo
        </h5>
        <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
      </div>
    );
  }


  const displayEvents = isExpanded ? history.events : history.events.slice(-3);
  const hasMoreEvents = history.events.length > 3;


  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-medium text-foreground flex items-center gap-2">
          <History className="h-4 w-4" />
          Histórico Completo do Processo
        </h5>
        <Badge variant="outline" className="text-xs">
          {history.events.length} eventos
        </Badge>
      </div>

      {hasMoreEvents && !isExpanded && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mb-2 text-xs"
          onClick={() => setIsExpanded(true)}
        >
          <ChevronUp className="h-3 w-3 mr-1" />
          Ver todos os {history.events.length} eventos
        </Button>
      )}

      <ScrollArea className={isExpanded ? "h-80" : "h-auto"}>
        <div className="space-y-3">
          {displayEvents.map((event, index) => (
            <div
              key={event.id}
              className="flex gap-3 relative"
            >
              {/* Timeline line */}
              {index < displayEvents.length - 1 && (
                <div className="absolute left-4 top-8 w-0.5 h-full bg-border" />
              )}
              
              {/* Icon */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center text-sm z-10">
                {event.icon}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0 pb-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{event.title}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${moduleColors[event.module] || ''}`}
                      >
                        {event.module}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {event.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-1">
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
      </ScrollArea>

      {isExpanded && hasMoreEvents && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-xs"
          onClick={() => setIsExpanded(false)}
        >
          <ChevronDown className="h-3 w-3 mr-1" />
          Mostrar menos
        </Button>
      )}
    </div>
  );
};
