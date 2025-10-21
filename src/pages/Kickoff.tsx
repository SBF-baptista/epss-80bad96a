import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Users, Truck, Edit, CheckCircle2, AlertCircle, History } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getKickoffData } from "@/services/kickoffService";
import { getKickoffHistory } from "@/services/kickoffHistoryService";
import { Skeleton } from "@/components/ui/skeleton";
import { KickoffDetailsModal } from "@/components/kickoff/KickoffDetailsModal";
import { KickoffHistoryTable } from "@/components/kickoff/KickoffHistoryTable";

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


  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Kickoff</h1>
        <p className="text-muted-foreground">
          Unidades por tipo de uso vindas do Segsale
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Veículos
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{kickoffData?.total_vehicles || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Veículos do Segsale
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{kickoffData?.total_companies || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Empresas únicas
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tipos de Uso
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {kickoffData?.clients?.reduce((sum, client) => {
                    const uniqueTypes = new Set(client.usage_types.map(ut => ut.usage_type));
                    return sum + uniqueTypes.size;
                  }, 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Configurações diferentes
                </p>
              </>
            )}
          </CardContent>
        </Card>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : kickoffData && kickoffData.clients.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {kickoffData.clients.map((client) => (
              <Card key={client.sale_summary_id} className="relative">
                <CardHeader>
                  <CardTitle className="text-lg">{client.company_name}</CardTitle>
                  {client.usage_types.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {client.usage_types[0].usage_type}
                    </Badge>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Veículos:</span>
                    <span className="font-semibold">{client.total_vehicles} {client.total_vehicles === 1 ? 'veículo' : 'veículos'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {client.needs_blocking && (
                      <Badge variant="destructive" className="text-xs">
                        Bloqueio
                      </Badge>
                    )}
                    {client.has_kickoff_details ? (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Completo</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertCircle className="h-3 w-3" />
                        <span>Pendente</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditKickoff(client.sale_summary_id, client.company_name)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Kickoff
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
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
