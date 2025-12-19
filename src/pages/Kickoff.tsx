import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, AlertCircle, History, Clock, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getKickoffData } from "@/services/kickoffService";
import { getKickoffHistory } from "@/services/kickoffHistoryService";
import { checkKickoffIntegrity } from "@/services/kickoffIntegrityCheck";
import { Skeleton } from "@/components/ui/skeleton";
import { KickoffDetailsModal } from "@/components/kickoff/KickoffDetailsModal";
import { KickoffHistoryTable } from "@/components/kickoff/KickoffHistoryTable";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useToast } from "@/hooks/use-toast";

const Kickoff = () => {
  const [selectedSaleSummaryId, setSelectedSaleSummaryId] = useState<number | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  
  const { toast } = useToast();

  const { data: kickoffData, isLoading, refetch } = useQuery({
    queryKey: ['kickoff-data'],
    queryFn: getKickoffData,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: kickoffHistory, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['kickoff-history'],
    queryFn: getKickoffHistory,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Check for orphan kickoffs (approved but missing cards)
  const { data: integrityCheck, isLoading: integrityLoading } = useQuery({
    queryKey: ['kickoff-integrity'],
    queryFn: checkKickoffIntegrity,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
  });

  // Real-time subscriptions for automatic updates with toast notification
  const handleRealtimeUpdate = () => {
    toast({
      title: "Dados atualizados",
      description: "Novos dados do Segsale foram recebidos automaticamente.",
    });
  };

  useRealtimeSubscription('accessories', ['kickoff-data'], undefined, handleRealtimeUpdate);
  useRealtimeSubscription('incoming_vehicles', ['kickoff-data'], undefined, handleRealtimeUpdate);
  useRealtimeSubscription('kickoff_history', ['kickoff-history'], undefined, () => {
    toast({
      title: "Histórico atualizado",
      description: "Novo kickoff foi aprovado.",
    });
  });

  const handleEditKickoff = (saleSummaryId: number, companyName: string) => {
    setSelectedSaleSummaryId(saleSummaryId);
    setSelectedCompanyName(companyName);
    setModalOpen(true);
  };

  // Buscar datas de received_at para cada cliente
  const { data: kickoffDates } = useQuery({
    queryKey: ['kickoff-dates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incoming_vehicles')
        .select('sale_summary_id, received_at')
        .order('received_at', { ascending: true });
      
      if (error) throw error;
      
      // Agrupar por sale_summary_id e pegar a primeira data (mais antiga)
      const dateMap = new Map<number, Date>();
      data?.forEach((vehicle: any) => {
        if (!dateMap.has(vehicle.sale_summary_id)) {
          dateMap.set(vehicle.sale_summary_id, new Date(vehicle.received_at));
        }
      });
      
      return dateMap;
    },
    enabled: !!kickoffData?.clients,
  });

  const getDaysInKickoff = (saleSummaryId: number): number => {
    if (!kickoffDates) return 0;
    
    const startDate = kickoffDates.get(saleSummaryId);
    if (!startDate) return 0;
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };


  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Kickoff</h1>
        <p className="text-muted-foreground">
          Unidades por tipo de uso vindas do Segsale
        </p>
      </div>


      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            <AlertCircle className="h-4 w-4 mr-2" />
            Pendentes
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Histórico de Aprovações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <h2 className="text-2xl font-semibold">Kickoff Cliente</h2>
          {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : kickoffData && kickoffData.clients.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {kickoffData.clients.map((client) => {
              const daysInKickoff = getDaysInKickoff(client.sale_summary_id);
              
              // Colorimetria dinâmica: amarelo 0-5, laranja 6-10, vermelho >10
              const getPendencyBadgeStyles = () => {
                if (daysInKickoff <= 5) {
                  return "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700";
                } else if (daysInKickoff <= 10) {
                  return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700";
                } else {
                  return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700";
                }
              };
              
              return (
              <Card key={client.sale_summary_id} className="relative flex flex-col">
                <CardHeader className="pb-2">
                  {/* Nome do cliente no topo */}
                  <CardTitle className="text-lg leading-tight">{client.company_name}</CardTitle>
                  
                  {/* Tag de pendência logo abaixo do nome */}
                  {daysInKickoff > 0 && (
                    <Badge variant="outline" className={`text-xs flex items-center gap-1 w-fit mt-2 ${getPendencyBadgeStyles()}`}>
                      <Clock className="h-3 w-3" />
                      Pendente há {daysInKickoff} {daysInKickoff === 1 ? 'dia' : 'dias'}
                    </Badge>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-3 flex-1 flex flex-col">
                  {/* Quantidade de veículos abaixo da tag */}
                  <div className="flex items-center text-sm">
                    <span className="text-muted-foreground">Veículos:</span>
                    <span className="font-semibold ml-2">{client.total_vehicles} {client.total_vehicles === 1 ? 'veículo' : 'veículos'}</span>
                  </div>
                  
                  {client.needs_blocking && (
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        Bloqueio
                      </Badge>
                    </div>
                  )}

                  <div className="flex justify-end pt-2 mt-auto">
                    <Button
                      size="sm"
                      onClick={() => handleEditKickoff(client.sale_summary_id, client.company_name)}
                      className="bg-[#1d7eb5] hover:bg-[#1a6fa0] text-white"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Realizar Kickoff
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              Nenhum dado do Segsale disponível
            </CardContent>
          </Card>
        )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <h2 className="text-2xl font-semibold">Histórico de Aprovações</h2>

          {historyLoading ? (
            <Skeleton className="h-32" />
          ) : (
            <KickoffHistoryTable history={kickoffHistory || []} />
          )}
        </TabsContent>
      </Tabs>

      {selectedSaleSummaryId && (
        <KickoffDetailsModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          saleSummaryId={selectedSaleSummaryId}
          companyName={selectedCompanyName}
          vehicles={
            kickoffData?.clients.find(c => c.sale_summary_id === selectedSaleSummaryId)?.vehicles || []
          }
          onSuccess={() => {
            refetch();
            refetchHistory();
          }}
        />
      )}
    </div>
  );
};

export default Kickoff;
