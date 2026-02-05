import { Card } from "@/components/ui/card";
import { 
  Database, 
  Filter, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoryStatsProps {
  totalRecords: number;
  filteredRecords: number;
  criticalActionsCount: number;
  successRate: number;
  lastActionTime: string | null;
  avgTimeBetweenActions: number | null; // em minutos
}

const HistoryStats = ({
  totalRecords,
  filteredRecords,
  criticalActionsCount,
  successRate,
  lastActionTime,
  avgTimeBetweenActions,
}: HistoryStatsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Total de registros */}
      <Card className="p-4 border-border/60 bg-gradient-to-br from-background to-muted/20">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Registros
            </p>
            <p className="text-2xl font-bold mt-1">{totalRecords.toLocaleString("pt-BR")}</p>
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <Database className="h-4 w-4 text-primary" />
          </div>
        </div>
      </Card>

      {/* Registros filtrados */}
      <Card className="p-4 border-border/60 bg-gradient-to-br from-background to-muted/20">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Filtrados
            </p>
            <p className="text-2xl font-bold mt-1">{filteredRecords.toLocaleString("pt-BR")}</p>
            {filteredRecords !== totalRecords && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {((filteredRecords / totalRecords) * 100).toFixed(1)}% do total
              </p>
            )}
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Filter className="h-4 w-4 text-blue-500" />
          </div>
        </div>
      </Card>

      {/* Ações críticas */}
      <Card className="p-4 border-border/60 bg-gradient-to-br from-background to-muted/20">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Ações Críticas
            </p>
            <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
              {criticalActionsCount}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
        </div>
      </Card>

      {/* Taxa de sucesso */}
      <Card className="p-4 border-border/60 bg-gradient-to-br from-background to-muted/20">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Taxa de Sucesso
            </p>
            <p className={`text-2xl font-bold mt-1 ${
              successRate >= 95 ? "text-emerald-600 dark:text-emerald-400" : 
              successRate >= 80 ? "text-amber-600 dark:text-amber-400" : 
              "text-red-600 dark:text-red-400"
            }`}>
              {successRate.toFixed(1)}%
            </p>
          </div>
          <div className={`p-2 rounded-lg ${
            successRate >= 95 ? "bg-emerald-500/10" : 
            successRate >= 80 ? "bg-amber-500/10" : 
            "bg-red-500/10"
          }`}>
            {successRate >= 95 ? (
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            ) : successRate >= 80 ? (
              <TrendingUp className="h-4 w-4 text-amber-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>
      </Card>

      {/* Última ação */}
      <Card className="p-4 border-border/60 bg-gradient-to-br from-background to-muted/20">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Última Ação
            </p>
            <p className="text-sm font-semibold mt-1">
              {lastActionTime
                ? formatDistanceToNow(new Date(lastActionTime), {
                    addSuffix: true,
                    locale: ptBR,
                  })
                : "N/A"}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-violet-500/10">
            <Clock className="h-4 w-4 text-violet-500" />
          </div>
        </div>
      </Card>

      {/* Tempo médio entre ações */}
      <Card className="p-4 border-border/60 bg-gradient-to-br from-background to-muted/20">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Intervalo Médio
            </p>
            <p className="text-sm font-semibold mt-1">
              {avgTimeBetweenActions !== null
                ? avgTimeBetweenActions < 60
                  ? `${avgTimeBetweenActions.toFixed(0)} min`
                  : `${(avgTimeBetweenActions / 60).toFixed(1)} h`
                : "N/A"}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-cyan-500/10">
            <TrendingUp className="h-4 w-4 text-cyan-500" />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default HistoryStats;
