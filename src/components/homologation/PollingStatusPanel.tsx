import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Activity, AlertCircle, CheckCircle2 } from "lucide-react";

interface IntegrationState {
  id: string;
  integration_name: string;
  last_processed_id: number | null;
  last_poll_at: string | null;
  status: string;
  error_count: number;
  last_error: string | null;
  metadata: any;
  updated_at: string;
}

export const PollingStatusPanel = () => {
  const [state, setState] = useState<IntegrationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const { toast } = useToast();

  const fetchState = async () => {
    try {
      const { data, error } = await supabase
        .from('integration_state')
        .select('*')
        .eq('integration_name', 'segsale')
        .single();

      if (error) throw error;
      setState(data);
    } catch (error: any) {
      console.error('Error fetching integration state:', error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar estado",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('integration_state_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'integration_state',
          filter: 'integration_name=eq.segsale'
        },
        () => {
          fetchState();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const triggerPoll = async () => {
    setPolling(true);
    try {
      const response = await fetch(
        'https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/poll-segsale',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "✅ Polling executado",
          description: `${result.message} - Último ID: ${result.last_processed_id}`,
        });
        fetchState();
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('Error triggering poll:', error);
      toast({
        variant: "destructive",
        title: "❌ Erro ao executar polling",
        description: error.message,
      });
    } finally {
      setPolling(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Status do Polling Segsale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Status do Polling Segsale
            </CardTitle>
            <CardDescription>
              Monitoramento automático de vendas do Segsale
            </CardDescription>
          </div>
          <Badge variant={state?.status === 'active' ? 'default' : 'secondary'}>
            {state?.status || 'Desconhecido'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Último ID Processado</p>
            <p className="text-2xl font-bold">{state?.last_processed_id || 0}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Erros</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{state?.error_count || 0}</p>
              {(state?.error_count || 0) === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
            </div>
          </div>
        </div>

        {state?.last_poll_at && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Último Polling</p>
            <p className="text-sm">{new Date(state.last_poll_at).toLocaleString('pt-BR')}</p>
          </div>
        )}

        {state?.metadata && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Última Execução</p>
            <p className="text-xs text-muted-foreground">
              {state.metadata.total_sales_fetched || 0} vendas encontradas, {state.metadata.new_sales_processed || 0} novas processadas
            </p>
          </div>
        )}

        {state?.last_error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Último Erro
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {state.last_error}
            </p>
          </div>
        )}

        <Button 
          onClick={triggerPoll} 
          disabled={polling}
          className="w-full"
        >
          {polling ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Executando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Executar Polling Agora
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          O polling automático roda a cada 5 minutos via cron job
        </p>
      </CardContent>
    </Card>
  );
};
