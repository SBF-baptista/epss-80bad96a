import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Users, Truck, Edit, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, History } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getKickoffData } from "@/services/kickoffService";
import { getKickoffHistory } from "@/services/kickoffHistoryService";
import { Skeleton } from "@/components/ui/skeleton";
import { KickoffDetailsModal } from "@/components/kickoff/KickoffDetailsModal";
import { KickoffHistoryTable } from "@/components/kickoff/KickoffHistoryTable";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useToast } from "@/hooks/use-toast";

const Kickoff = () => {
  const [selectedSaleSummaryId, setSelectedSaleSummaryId] = useState<number | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
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

  const toggleCard = (saleSummaryId: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(saleSummaryId)) {
      newExpanded.delete(saleSummaryId);
    } else {
      newExpanded.add(saleSummaryId);
    }
    setExpandedCards(newExpanded);
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
                <Collapsible
                  open={expandedCards.has(client.sale_summary_id)}
                  onOpenChange={() => toggleCard(client.sale_summary_id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg">{client.company_name}</CardTitle>
                        {client.usage_types.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {client.usage_types[0].usage_type}
                          </Badge>
                        )}
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          {expandedCards.has(client.sale_summary_id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Quantidade:</span>
                      <span className="font-bold">{client.total_quantity}x</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Veículos:</span>
                      <span>{client.total_vehicles} {client.total_vehicles === 1 ? 'veículo' : 'veículos'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2 flex-wrap">
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

                    <CollapsibleContent className="space-y-3 pt-3 border-t">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Veículos:</h4>
                        {client.usage_types.map((usage, idx) => {
                          // Find corresponding vehicle with modules data
                          const vehicleData = client.vehicles.find(v => 
                            v.brand === usage.vehicle_brand && 
                            v.model === usage.vehicle_model &&
                            v.usage_type === usage.usage_type
                          );

                          // Separate modules from accessories based on categories
                          const modules = vehicleData?.modules.filter(m => 
                            m.categories?.toLowerCase().includes('modulo') || 
                            m.categories?.toLowerCase().includes('módulo')
                          ) || [];
                          
                          const accessories = vehicleData?.modules.filter(m => 
                            !m.categories?.toLowerCase().includes('modulo') && 
                            !m.categories?.toLowerCase().includes('módulo')
                          ) || [];

                          // Normalize module names (remove accents for display)
                          const normalizedModuleNames = modules.map(m => 
                            m.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                          );
                          const uniqueModules = Array.from(new Set(normalizedModuleNames));
                          const moduleCount = uniqueModules.length;
                          const accessoryCount = accessories.length;

                          return (
                            <div key={idx} className="text-xs bg-muted p-2 rounded space-y-2">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium">{usage.vehicle_brand} {usage.vehicle_model}</div>
                                  <div className="text-muted-foreground mt-1">
                                    <Badge variant="outline" className="text-xs mr-1">{usage.usage_type}</Badge>
                                    {usage.vehicle_year > 0 && <span>Ano: {usage.vehicle_year}</span>}
                                  </div>
                                </div>
                                <span className="font-semibold">{usage.quantity}x</span>
                              </div>
                              
                              {/* Display module and accessory counts */}
                              {(moduleCount > 0 || accessoryCount > 0) && (
                                <div className="flex gap-2 flex-wrap pt-1">
                                  {moduleCount > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {moduleCount} {moduleCount === 1 ? 'Módulo' : 'Módulos'}
                                    </Badge>
                                  )}
                                  {accessoryCount > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {accessoryCount} {accessoryCount === 1 ? 'Acessório' : 'Acessórios'}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              
                              {/* Display module names */}
                              {moduleCount > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  <span className="font-medium">Módulos: </span>
                                  {uniqueModules.join(", ")}
                                </div>
                              )}
                              
                              {/* Display accessory names */}
                              {accessoryCount > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  <span className="font-medium">Acessórios: </span>
                                  {accessories.map(a => a.name).join(", ")}
                                </div>
                              )}

                              {/* Show kickoff completed status */}
                              {vehicleData?.kickoff_completed && (
                                <Badge variant="default" className="text-xs">
                                  Kickoff Completo
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleEditKickoff(client.sale_summary_id, client.company_name)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar Detalhes do Kickoff
                      </Button>
                    </CollapsibleContent>
                  </CardContent>
                </Collapsible>
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
