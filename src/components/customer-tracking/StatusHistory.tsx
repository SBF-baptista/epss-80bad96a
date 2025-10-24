import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StatusHistoryEntry {
  id: string;
  previous_status: string | null;
  new_status: string;
  changed_at: string;
  notes: string | null;
}

interface StatusHistoryProps {
  kitScheduleId: string;
}

const statusLabels: Record<string, string> = {
  scheduled: "Pedidos",
  confirmed: "Confirmado",
  in_progress: "Em Produção",
  completed: "Aguardando Envio",
  shipped: "Enviado",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-300",
  confirmed: "bg-purple-100 text-purple-800 border-purple-300",
  in_progress: "bg-yellow-100 text-yellow-800 border-yellow-300",
  completed: "bg-orange-100 text-orange-800 border-orange-300",
  shipped: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-gray-100 text-gray-800 border-gray-300",
};

export const StatusHistory = ({ kitScheduleId }: StatusHistoryProps) => {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`status-history-${kitScheduleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kit_schedule_status_history',
          filter: `kit_schedule_id=eq.${kitScheduleId}`
        },
        () => {
          loadHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [kitScheduleId]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('kit_schedule_status_history')
        .select('*')
        .eq('kit_schedule_id', kitScheduleId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading status history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Histórico de Movimentações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Histórico de Movimentações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada ainda.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Histórico de Movimentações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {history.map((entry, index) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
            >
              <div className="flex-shrink-0 mt-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {entry.previous_status && (
                    <>
                      <Badge 
                        variant="outline" 
                        className={statusColors[entry.previous_status] || ""}
                      >
                        {statusLabels[entry.previous_status] || entry.previous_status}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                    </>
                  )}
                  <Badge 
                    variant="outline" 
                    className={statusColors[entry.new_status] || ""}
                  >
                    {statusLabels[entry.new_status] || entry.new_status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(entry.changed_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { 
                    locale: ptBR 
                  })}
                </p>
                {entry.notes && (
                  <p className="text-xs text-muted-foreground italic">{entry.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};