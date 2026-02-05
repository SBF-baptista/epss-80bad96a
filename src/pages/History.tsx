import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, RefreshCw, Shield } from "lucide-react";

import HistoryFilters from "@/components/history/HistoryFilters";
import HistoryStats from "@/components/history/HistoryStats";
import HistoryTable, { type AppLog } from "@/components/history/HistoryTable";
import HistoryPagination from "@/components/history/HistoryPagination";
import HistoryExport from "@/components/history/HistoryExport";
import LogDetailModal from "@/components/history/LogDetailModal";

interface FilterState {
  searchTerm: string;
  moduleFilter: string;
  actionFilter: string;
  actionTypeFilter: string;
  impactFilter: string;
  originFilter: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  ipFilter: string;
}

const initialFilters: FilterState = {
  searchTerm: "",
  moduleFilter: "all",
  actionFilter: "all",
  actionTypeFilter: "all",
  impactFilter: "all",
  originFilter: "all",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  ipFilter: "",
};

const History = () => {
  const { role, loading: roleLoading } = useUserRole();
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedLog, setSelectedLog] = useState<AppLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Verificar se o usuário é admin
  if (!roleLoading && role !== "admin") {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-8 text-center border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <Shield className="h-12 w-12 text-amber-600 dark:text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            O Histórico do Sistema é exclusivo para administradores. 
            Entre em contato com o suporte se você precisa de acesso.
          </p>
        </Card>
      </div>
    );
  }

  const { data: logs = [], isLoading: logsLoading, isError, error, refetch } = useQuery({
    queryKey: ["app-logs", filters.moduleFilter, filters.actionFilter, filters.startDate, filters.endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_app_logs_admin", {
        p_module: filters.moduleFilter === "all" ? null : filters.moduleFilter,
        p_action: filters.actionFilter === "all" ? null : filters.actionFilter,
        p_start_date: filters.startDate ? new Date(filters.startDate).toISOString() : null,
        p_end_date: filters.endDate ? new Date(filters.endDate).toISOString() : null,
      });

      if (error) throw error;

      return (data || []) as AppLog[];
    },
    enabled: role === "admin",
  });

  // Real-time subscription for new logs
  useRealtimeSubscription(
    "app_logs",
    ["app-logs", filters.moduleFilter, filters.actionFilter, filters.startDate, filters.endDate],
    { event: "*" }
  );

  // Filtrar logs com base em todos os filtros
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Busca global
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch =
          log.action.toLowerCase().includes(searchLower) ||
          log.module.toLowerCase().includes(searchLower) ||
          log.details?.toLowerCase().includes(searchLower) ||
          log.user_email?.toLowerCase().includes(searchLower) ||
          log.ip_address?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtro por IP
      if (filters.ipFilter) {
        if (!log.ip_address?.includes(filters.ipFilter)) return false;
      }

      // Filtro por tipo de ação
      if (filters.actionTypeFilter !== "all") {
        const actionLower = log.action.toLowerCase();
        const typeMap: Record<string, string[]> = {
          create: ["cri", "add", "nov"],
          update: ["edit", "alter", "atualiz", "mov"],
          delete: ["exclu", "delet", "remov"],
          login: ["login", "logout", "acesso"],
          approval: ["aprov", "confirm"],
          cancel: ["cancel", "rejeit"],
          error: ["erro", "falha", "error"],
        };
        const keywords = typeMap[filters.actionTypeFilter] || [];
        if (!keywords.some(k => actionLower.includes(k))) return false;
      }

      // Filtro por nível de impacto
      if (filters.impactFilter !== "all") {
        const actionLower = log.action.toLowerCase();
        const detailsLower = log.details?.toLowerCase() || "";
        
        let level = "low";
        if (actionLower.includes("exclu") || actionLower.includes("delet") ||
            detailsLower.includes("admin") || detailsLower.includes("permiss")) {
          level = "critical";
        } else if (actionLower.includes("alter") || actionLower.includes("edit") || actionLower.includes("atualiz")) {
          level = "high";
        } else if (actionLower.includes("cri") || actionLower.includes("nov")) {
          level = "medium";
        }
        
        if (filters.impactFilter !== level) return false;
      }

      return true;
    });
  }, [logs, filters]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    const criticalCount = filteredLogs.filter(log => {
      const actionLower = log.action.toLowerCase();
      const detailsLower = log.details?.toLowerCase() || "";
      return actionLower.includes("exclu") || actionLower.includes("delet") ||
             detailsLower.includes("admin") || detailsLower.includes("permiss");
    }).length;

    // Taxa de sucesso (assumindo que erros têm keywords específicas)
    const errorCount = filteredLogs.filter(log => {
      const actionLower = log.action.toLowerCase();
      return actionLower.includes("erro") || actionLower.includes("falha") || actionLower.includes("error");
    }).length;
    const successRate = filteredLogs.length > 0 
      ? ((filteredLogs.length - errorCount) / filteredLogs.length) * 100 
      : 100;

    // Última ação e tempo médio
    const lastAction = filteredLogs.length > 0 ? filteredLogs[0].created_at : null;
    
    let avgTimeBetween: number | null = null;
    if (filteredLogs.length > 1) {
      const timestamps = filteredLogs.map(l => new Date(l.created_at).getTime());
      const diffs: number[] = [];
      for (let i = 0; i < timestamps.length - 1; i++) {
        diffs.push((timestamps[i] - timestamps[i + 1]) / (1000 * 60)); // em minutos
      }
      avgTimeBetween = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    }

    return {
      totalRecords: logs.length,
      filteredRecords: filteredLogs.length,
      criticalActionsCount: criticalCount,
      successRate,
      lastActionTime: lastAction,
      avgTimeBetweenActions: avgTimeBetween,
    };
  }, [logs, filteredLogs]);

  // Paginação
  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset página quando filtros mudam
  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Extrair módulos e ações únicos para os filtros
  const uniqueModules = useMemo(() => Array.from(new Set(logs.map((log) => log.module))), [logs]);
  const uniqueActions = useMemo(() => Array.from(new Set(logs.map((log) => log.action))), [logs]);

  if (roleLoading || logsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-8 text-center border-destructive/50 bg-destructive/5">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Erro ao Carregar Histórico</h2>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            {error instanceof Error ? error.message : "Ocorreu um erro ao carregar os registros do sistema."}
          </p>
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Tentar Novamente
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-[1600px]">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Clock className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Histórico do Sistema</h1>
            <p className="text-muted-foreground text-sm">
              Auditoria completa de todas as ações realizadas no sistema
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          <HistoryExport 
            logs={filteredLogs} 
            filteredCount={filteredLogs.length}
            totalCount={logs.length}
          />
        </div>
      </div>

      {/* Estatísticas */}
      <HistoryStats {...stats} />

      {/* Filtros */}
      <HistoryFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        uniqueModules={uniqueModules}
        uniqueActions={uniqueActions}
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* Tabela */}
      <div>
        <HistoryTable
          logs={paginatedLogs}
          highlightTerm={filters.searchTerm}
          onViewDetails={(log) => {
            setSelectedLog(log);
            setShowDetailModal(true);
          }}
        />

        {/* Paginação */}
        <HistoryPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={filteredLogs.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modal de Detalhes */}
      <LogDetailModal
        log={selectedLog}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedLog(null);
        }}
      />
    </div>
  );
};

export default History;
