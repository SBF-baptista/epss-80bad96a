import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, History, Search, FileText, FlaskConical, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getKickoffData } from "@/services/kickoffService";
import { getKickoffHistory } from "@/services/kickoffHistoryService";
import { checkKickoffIntegrity } from "@/services/kickoffIntegrityCheck";
import { Skeleton } from "@/components/ui/skeleton";
import { KickoffDetailsModal } from "@/components/kickoff/KickoffDetailsModal";
import { KickoffHistoryTable } from "@/components/kickoff/KickoffHistoryTable";
import { KickoffStats } from "@/components/kickoff/KickoffStats";
import { KickoffClientCard } from "@/components/kickoff/KickoffClientCard";
import { KickoffTutorial, type TutorialStep } from "@/components/kickoff/KickoffTutorial";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";

import { motion } from "framer-motion";

const TUTORIAL_KEY = "kickoff-tutorial-seen";

const KICKOFF_TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: "",
    placement: "center",
    title: "Bem-vindo ao Kickoff! 👋",
    description:
      "Este é o ponto de partida do processo. Aqui você acompanha clientes recém-importados do Segsale, valida frotas e libera os veículos para as próximas etapas (Homologação, Planejamento e Logística). Vamos conhecer cada parte da tela.",
  },
  {
    target: "[data-tour='kickoff-tabs']",
    title: "Pendentes e Histórico",
    description:
      "Alterne entre Pendentes (clientes aguardando kickoff) e Histórico de Aprovações (kickoffs já concluídos, com possibilidade de revisão).",
  },
  {
    target: "[data-tour='kickoff-search']",
    title: "Busca rápida por cliente",
    description:
      "Digite o nome da empresa para filtrar a lista. A busca é instantânea e ignora maiúsculas/minúsculas.",
  },
  {
    target: "[data-tour='kickoff-stats']",
    title: "Indicadores em tempo real",
    description:
      "Veja o total de empresas pendentes, quantidade de veículos, casos que precisam de bloqueio e o tempo médio de espera. Use isso para priorizar o atendimento.",
  },
  {
    target: "[data-tour='kickoff-card']",
    title: "Card do cliente",
    description:
      "Cada card representa uma venda do Segsale. Mostra a empresa, total de veículos, tipos de uso e há quantos dias está pendente. Cores no canto indicam urgência (amarelo ≥5 dias, vermelho >7 dias).",
  },
  {
    target: "[data-tour='kickoff-card']",
    title: "Editar e validar a frota",
    description:
      "Clique no card para abrir o modal de detalhes. Lá você confirma placas, valida acessórios, sugere kits, marca bloqueio e finaliza o kickoff — liberando os veículos para Homologação e Planejamento.",
  },
  {
    target: "[data-tour='kickoff-tutorial-btn']",
    title: "Pronto! 🎉",
    description:
      "Você pode reabrir este tutorial a qualquer momento por este botão. Bom trabalho!",
  },
];

const Kickoff = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedSaleSummaryId, setSelectedSaleSummaryId] = useState<number | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!localStorage.getItem(TUTORIAL_KEY)) {
      const t = setTimeout(() => setTutorialOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [user]);




  const {
    data: kickoffData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["kickoff-data"],
    queryFn: getKickoffData,
    enabled: !!user,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 30,
  });

  const {
    data: kickoffHistory,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["kickoff-history"],
    queryFn: getKickoffHistory,
    enabled: !!user,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 30,
  });

  const { data: integrityCheck, isLoading: integrityLoading } = useQuery({
    queryKey: ["kickoff-integrity"],
    queryFn: checkKickoffIntegrity,
    enabled: !!user,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60,
  });

  // Consolidated: single subscription for all kickoff-related tables
  useRealtimeSubscription("incoming_vehicles", ["kickoff-data", "kickoff-history", "kickoff-integrity", "kickoff-dates"]);

  const handleEditKickoff = (saleSummaryId: number, companyName: string) => {
    setSelectedSaleSummaryId(saleSummaryId);
    setSelectedCompanyName(companyName);
    setModalOpen(true);
  };

  const { data: kickoffDates } = useQuery({
    queryKey: ["kickoff-dates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incoming_vehicles")
        .select("sale_summary_id, received_at")
        .order("received_at", { ascending: true });

      if (error) throw error;

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
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredClients =
    kickoffData?.clients.filter((client) => client.company_name.toLowerCase().includes(searchTerm.toLowerCase())) || [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Kickoff</h1>
          <p className="text-sm text-muted-foreground"></p>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-tour="kickoff-tutorial-btn"
          onClick={() => setTutorialOpen(true)}
          className="gap-2"
        >
          <GraduationCap className="h-4 w-4" />
          Tutorial
        </Button>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList data-tour="kickoff-tabs" className="bg-muted/50 p-1 h-auto">

          <TabsTrigger
            value="pending"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 py-2.5 text-sm font-medium transition-all"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Pendentes
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 py-2.5 text-sm font-medium transition-all"
          >
            <History className="h-4 w-4 mr-2" />
            Histórico de Aprovações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6 mt-0">
          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <h2 className="text-xl font-semibold text-foreground">Clientes Pendentes</h2>
            <div data-tour="kickoff-search" className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome do cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-background border-border/60"
              />
            </div>
          </motion.div>

          {/* Stats */}
          <div data-tour="kickoff-stats">
            <KickoffStats kickoffData={kickoffData} kickoffDates={kickoffDates} />
          </div>



          {/* Client grid */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : filteredClients.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredClients.map((client, index) => (
                <KickoffClientCard
                  key={client.sale_summary_id}
                  client={client}
                  daysInKickoff={getDaysInKickoff(client.sale_summary_id)}
                  onEditKickoff={handleEditKickoff}
                />
              ))}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1">Nenhum cliente pendente</h3>
                  <p className="text-sm text-muted-foreground">Não há dados do Segsale disponíveis no momento</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6 mt-0">
          <h2 className="text-xl font-semibold text-foreground">Histórico de Aprovações</h2>

          {historyLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : (
            <KickoffHistoryTable history={kickoffHistory || []} onRefresh={refetchHistory} />
          )}
        </TabsContent>
      </Tabs>

      {selectedSaleSummaryId && (
        <KickoffDetailsModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          saleSummaryId={selectedSaleSummaryId}
          companyName={selectedCompanyName}
          vehicles={kickoffData?.clients.find((c) => c.sale_summary_id === selectedSaleSummaryId)?.vehicles || []}
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
