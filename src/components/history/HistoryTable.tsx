import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Eye, 
  AlertTriangle, 
  Trash2, 
  Edit, 
  Plus, 
  LogIn, 
  CheckCircle,
  XCircle,
  RefreshCw,
  Globe,
  Server,
  Smartphone,
  Workflow
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface AppLog {
  id: string;
  user_id: string | null;
  action: string;
  module: string;
  details: string | null;
  ip_address: string | null;
  created_at: string;
  user_email?: string;
  // Campos adicionais para auditoria completa
  action_type?: string;
  impact_level?: string;
  origin?: string;
  status?: string;
  entity_id?: string;
  entity_name?: string;
}

interface HistoryTableProps {
  logs: AppLog[];
  highlightTerm: string;
  onViewDetails: (log: AppLog) => void;
}

// Mapeamento de cores por tipo de ação
const getActionTypeStyle = (action: string, actionType?: string) => {
  const actionLower = action.toLowerCase();
  
  if (actionLower.includes("exclu") || actionLower.includes("delet") || actionLower.includes("remov")) {
    return {
      icon: Trash2,
      bgClass: "bg-red-50 dark:bg-red-950/30",
      textClass: "text-red-700 dark:text-red-400",
      borderClass: "border-red-200 dark:border-red-800/50",
    };
  }
  if (actionLower.includes("edit") || actionLower.includes("alter") || actionLower.includes("atualiz") || actionLower.includes("mov")) {
    return {
      icon: Edit,
      bgClass: "bg-blue-50 dark:bg-blue-950/30",
      textClass: "text-blue-700 dark:text-blue-400",
      borderClass: "border-blue-200 dark:border-blue-800/50",
    };
  }
  if (actionLower.includes("cri") || actionLower.includes("add") || actionLower.includes("nov")) {
    return {
      icon: Plus,
      bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
      textClass: "text-emerald-700 dark:text-emerald-400",
      borderClass: "border-emerald-200 dark:border-emerald-800/50",
    };
  }
  if (actionLower.includes("login") || actionLower.includes("logout") || actionLower.includes("acesso")) {
    return {
      icon: LogIn,
      bgClass: "bg-purple-50 dark:bg-purple-950/30",
      textClass: "text-purple-700 dark:text-purple-400",
      borderClass: "border-purple-200 dark:border-purple-800/50",
    };
  }
  if (actionLower.includes("aprov") || actionLower.includes("confirm")) {
    return {
      icon: CheckCircle,
      bgClass: "bg-amber-50 dark:bg-amber-950/30",
      textClass: "text-amber-700 dark:text-amber-400",
      borderClass: "border-amber-200 dark:border-amber-800/50",
    };
  }
  if (actionLower.includes("cancel") || actionLower.includes("rejeit")) {
    return {
      icon: XCircle,
      bgClass: "bg-orange-50 dark:bg-orange-950/30",
      textClass: "text-orange-700 dark:text-orange-400",
      borderClass: "border-orange-200 dark:border-orange-800/50",
    };
  }
  if (actionLower.includes("erro") || actionLower.includes("falha") || actionLower.includes("error")) {
    return {
      icon: AlertTriangle,
      bgClass: "bg-rose-50 dark:bg-rose-950/30",
      textClass: "text-rose-700 dark:text-rose-400",
      borderClass: "border-rose-200 dark:border-rose-800/50",
    };
  }
  
  return {
    icon: RefreshCw,
    bgClass: "bg-slate-50 dark:bg-slate-900/30",
    textClass: "text-slate-700 dark:text-slate-400",
    borderClass: "border-slate-200 dark:border-slate-700/50",
  };
};

// Mapeamento de cores por módulo
const getModuleStyle = (module: string) => {
  const moduleLower = module.toLowerCase();
  
  if (moduleLower.includes("homolog")) {
    return "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800/50";
  }
  if (moduleLower.includes("kickoff") || moduleLower.includes("veículo") || moduleLower.includes("veiculo")) {
    return "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50";
  }
  if (moduleLower.includes("pedido") || moduleLower.includes("esteira")) {
    return "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800/50";
  }
  if (moduleLower.includes("agenda") || moduleLower.includes("schedule")) {
    return "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800/50";
  }
  if (moduleLower.includes("autenticação") || moduleLower.includes("auth") || moduleLower.includes("login")) {
    return "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800/50";
  }
  if (moduleLower.includes("usuário") || moduleLower.includes("user")) {
    return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50";
  }
  if (moduleLower.includes("kit")) {
    return "bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-900/30 dark:text-lime-400 dark:border-lime-800/50";
  }
  
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
};

// Indicador de impacto
const getImpactBadge = (action: string, details?: string | null) => {
  const actionLower = action.toLowerCase();
  const detailsLower = details?.toLowerCase() || "";
  
  // Ações críticas
  if (
    actionLower.includes("exclu") ||
    actionLower.includes("delet") ||
    detailsLower.includes("admin") ||
    detailsLower.includes("permiss")
  ) {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-50 text-red-600 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800">
        Crítico
      </Badge>
    );
  }
  
  // Ações de alto impacto
  if (
    actionLower.includes("alter") ||
    actionLower.includes("edit") ||
    actionLower.includes("atualiz")
  ) {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800">
        Alto
      </Badge>
    );
  }
  
  // Ações de médio impacto
  if (
    actionLower.includes("cri") ||
    actionLower.includes("nov")
  ) {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-800">
        Médio
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700">
      Baixo
    </Badge>
  );
};

// Ícone de origem
const getOriginIcon = (origin?: string, details?: string | null) => {
  const detailsLower = details?.toLowerCase() || "";
  
  if (detailsLower.includes("api") || origin === "api") {
    return <Server className="h-3.5 w-3.5 text-muted-foreground" />;
  }
  if (detailsLower.includes("mobile") || origin === "mobile") {
    return <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />;
  }
  if (detailsLower.includes("integração") || detailsLower.includes("webhook") || origin === "integration") {
    return <Workflow className="h-3.5 w-3.5 text-muted-foreground" />;
  }
  
  return <Globe className="h-3.5 w-3.5 text-muted-foreground" />;
};

// Highlight texto de busca
const highlightText = (text: string, term: string) => {
  if (!term.trim()) return text;
  
  const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/50 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

const HistoryTable = ({ logs, highlightTerm, onViewDetails }: HistoryTableProps) => {
  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[180px]">Usuário</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[150px]">Data/Hora</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Ação</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[130px]">Módulo</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[70px] text-center">Impacto</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[100px]">IP</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[60px] text-center">Origem</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[60px] text-center">Ver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
                    <span>Nenhum registro encontrado</span>
                    <span className="text-xs">Tente ajustar os filtros de busca</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const actionStyle = getActionTypeStyle(log.action, log.action_type);
                const ActionIcon = actionStyle.icon;
                
                return (
                  <TableRow 
                    key={log.id} 
                    className="group hover:bg-muted/40 transition-colors border-b border-border/40"
                  >
                    {/* Usuário */}
                    <TableCell className="py-3">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-semibold text-primary">
                                  {log.user_email?.[0]?.toUpperCase() || "S"}
                                </span>
                              </div>
                              <span className="text-sm font-medium truncate max-w-[120px]">
                                {log.user_id
                                  ? highlightText(log.user_email || `${log.user_id.slice(0, 8)}...`, highlightTerm)
                                  : "Sistema"}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-xs break-all">
                              {log.user_id ? (
                                <>
                                  <strong>Email:</strong> {log.user_email || "N/A"}
                                  <br />
                                  <strong>ID:</strong> {log.user_id}
                                </>
                              ) : (
                                "Ação executada automaticamente pelo sistema"
                              )}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    {/* Data/Hora */}
                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {format(new Date(log.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "HH:mm:ss", { locale: ptBR })}
                        </span>
                      </div>
                    </TableCell>

                    {/* Ação */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-md ${actionStyle.bgClass} ${actionStyle.borderClass} border`}>
                          <ActionIcon className={`h-3.5 w-3.5 ${actionStyle.textClass}`} />
                        </div>
                        <span className={`text-sm font-medium ${actionStyle.textClass}`}>
                          {highlightText(log.action, highlightTerm)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Módulo */}
                    <TableCell className="py-3">
                      <Badge 
                        variant="outline" 
                        className={`text-xs font-medium ${getModuleStyle(log.module)}`}
                      >
                        {highlightText(log.module, highlightTerm)}
                      </Badge>
                    </TableCell>

                    {/* Impacto */}
                    <TableCell className="py-3 text-center">
                      {getImpactBadge(log.action, log.details)}
                    </TableCell>

                    {/* IP */}
                    <TableCell className="py-3">
                      <span className="text-xs font-mono text-muted-foreground">
                        {log.ip_address || "-"}
                      </span>
                    </TableCell>

                    {/* Origem */}
                    <TableCell className="py-3 text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            {getOriginIcon(log.origin, log.details)}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              {log.origin === "api" ? "Via API" :
                               log.origin === "mobile" ? "Via Mobile" :
                               log.origin === "integration" ? "Via Integração" :
                               "Via Web"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    {/* Ação Ver */}
                    <TableCell className="py-3 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-60 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
                        onClick={() => onViewDetails(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default HistoryTable;
