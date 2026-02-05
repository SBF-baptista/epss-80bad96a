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
  Workflow,
  Shield,
  Lock,
  Zap,
  Clock,
  Bot
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
  // Campos aprimorados para auditoria completa
  action_type?: string;
  impact_level?: string;
  origin?: string;
  status?: string;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  previous_state?: Record<string, unknown>;
  new_state?: Record<string, unknown>;
  changed_fields?: string[];
  error_code?: string;
  error_message?: string;
  device_info?: string;
  browser_info?: string;
  is_lgpd_sensitive?: boolean;
  is_critical?: boolean;
  is_reversible?: boolean;
  duration_ms?: number;
  user_role?: string;
  user_profile?: string;
}

interface HistoryTableProps {
  logs: AppLog[];
  highlightTerm: string;
  onViewDetails: (log: AppLog) => void;
}

// Mapeamento de ícones e cores por tipo de ação (do banco de dados)
const getActionTypeConfig = (actionType?: string, action?: string) => {
  // Primeiro, usar action_type do banco se disponível
  if (actionType) {
    const configs: Record<string, { icon: typeof Trash2; bgClass: string; textClass: string; borderClass: string; label: string }> = {
      'create': {
        icon: Plus,
        bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
        textClass: "text-emerald-700 dark:text-emerald-400",
        borderClass: "border-emerald-200 dark:border-emerald-800/50",
        label: "Criação"
      },
      'update': {
        icon: Edit,
        bgClass: "bg-blue-50 dark:bg-blue-950/30",
        textClass: "text-blue-700 dark:text-blue-400",
        borderClass: "border-blue-200 dark:border-blue-800/50",
        label: "Edição"
      },
      'delete': {
        icon: Trash2,
        bgClass: "bg-red-50 dark:bg-red-950/30",
        textClass: "text-red-700 dark:text-red-400",
        borderClass: "border-red-200 dark:border-red-800/50",
        label: "Exclusão"
      },
      'login': {
        icon: LogIn,
        bgClass: "bg-purple-50 dark:bg-purple-950/30",
        textClass: "text-purple-700 dark:text-purple-400",
        borderClass: "border-purple-200 dark:border-purple-800/50",
        label: "Login"
      },
      'logout': {
        icon: LogIn,
        bgClass: "bg-purple-50 dark:bg-purple-950/30",
        textClass: "text-purple-700 dark:text-purple-400",
        borderClass: "border-purple-200 dark:border-purple-800/50",
        label: "Logout"
      },
      'approval': {
        icon: CheckCircle,
        bgClass: "bg-amber-50 dark:bg-amber-950/30",
        textClass: "text-amber-700 dark:text-amber-400",
        borderClass: "border-amber-200 dark:border-amber-800/50",
        label: "Aprovação"
      },
      'rejection': {
        icon: XCircle,
        bgClass: "bg-orange-50 dark:bg-orange-950/30",
        textClass: "text-orange-700 dark:text-orange-400",
        borderClass: "border-orange-200 dark:border-orange-800/50",
        label: "Rejeição"
      },
      'cancellation': {
        icon: XCircle,
        bgClass: "bg-orange-50 dark:bg-orange-950/30",
        textClass: "text-orange-700 dark:text-orange-400",
        borderClass: "border-orange-200 dark:border-orange-800/50",
        label: "Cancelamento"
      },
      'integration': {
        icon: Workflow,
        bgClass: "bg-cyan-50 dark:bg-cyan-950/30",
        textClass: "text-cyan-700 dark:text-cyan-400",
        borderClass: "border-cyan-200 dark:border-cyan-800/50",
        label: "Integração"
      },
      'system': {
        icon: Bot,
        bgClass: "bg-slate-50 dark:bg-slate-900/30",
        textClass: "text-slate-700 dark:text-slate-400",
        borderClass: "border-slate-200 dark:border-slate-700/50",
        label: "Sistema"
      },
      'error': {
        icon: AlertTriangle,
        bgClass: "bg-rose-50 dark:bg-rose-950/30",
        textClass: "text-rose-700 dark:text-rose-400",
        borderClass: "border-rose-200 dark:border-rose-800/50",
        label: "Erro"
      },
      'access': {
        icon: Eye,
        bgClass: "bg-violet-50 dark:bg-violet-950/30",
        textClass: "text-violet-700 dark:text-violet-400",
        borderClass: "border-violet-200 dark:border-violet-800/50",
        label: "Acesso"
      },
    };
    
    if (configs[actionType]) {
      return configs[actionType];
    }
  }
  
  // Fallback: inferir do texto da ação
  const actionLower = (action || "").toLowerCase();
  
  if (actionLower.includes("exclu") || actionLower.includes("delet") || actionLower.includes("remov")) {
    return {
      icon: Trash2,
      bgClass: "bg-red-50 dark:bg-red-950/30",
      textClass: "text-red-700 dark:text-red-400",
      borderClass: "border-red-200 dark:border-red-800/50",
      label: "Exclusão"
    };
  }
  if (actionLower.includes("edit") || actionLower.includes("alter") || actionLower.includes("atualiz") || actionLower.includes("mov")) {
    return {
      icon: Edit,
      bgClass: "bg-blue-50 dark:bg-blue-950/30",
      textClass: "text-blue-700 dark:text-blue-400",
      borderClass: "border-blue-200 dark:border-blue-800/50",
      label: "Edição"
    };
  }
  if (actionLower.includes("cri") || actionLower.includes("add") || actionLower.includes("nov")) {
    return {
      icon: Plus,
      bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
      textClass: "text-emerald-700 dark:text-emerald-400",
      borderClass: "border-emerald-200 dark:border-emerald-800/50",
      label: "Criação"
    };
  }
  if (actionLower.includes("login") || actionLower.includes("logout") || actionLower.includes("acesso")) {
    return {
      icon: LogIn,
      bgClass: "bg-purple-50 dark:bg-purple-950/30",
      textClass: "text-purple-700 dark:text-purple-400",
      borderClass: "border-purple-200 dark:border-purple-800/50",
      label: "Autenticação"
    };
  }
  if (actionLower.includes("aprov") || actionLower.includes("confirm")) {
    return {
      icon: CheckCircle,
      bgClass: "bg-amber-50 dark:bg-amber-950/30",
      textClass: "text-amber-700 dark:text-amber-400",
      borderClass: "border-amber-200 dark:border-amber-800/50",
      label: "Aprovação"
    };
  }
  if (actionLower.includes("cancel") || actionLower.includes("rejeit")) {
    return {
      icon: XCircle,
      bgClass: "bg-orange-50 dark:bg-orange-950/30",
      textClass: "text-orange-700 dark:text-orange-400",
      borderClass: "border-orange-200 dark:border-orange-800/50",
      label: "Cancelamento"
    };
  }
  if (actionLower.includes("erro") || actionLower.includes("falha") || actionLower.includes("error")) {
    return {
      icon: AlertTriangle,
      bgClass: "bg-rose-50 dark:bg-rose-950/30",
      textClass: "text-rose-700 dark:text-rose-400",
      borderClass: "border-rose-200 dark:border-rose-800/50",
      label: "Erro"
    };
  }
  
  return {
    icon: RefreshCw,
    bgClass: "bg-slate-50 dark:bg-slate-900/30",
    textClass: "text-slate-700 dark:text-slate-400",
    borderClass: "border-slate-200 dark:border-slate-700/50",
    label: "Ação"
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

// Indicador de impacto (usando dados do banco quando disponíveis)
const getImpactBadge = (log: AppLog) => {
  // Usar impact_level do banco se disponível
  if (log.impact_level) {
    const configs: Record<string, { label: string; className: string }> = {
      'info': {
        label: "Info",
        className: "text-[10px] px-1.5 py-0 bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700"
      },
      'low': {
        label: "Baixo",
        className: "text-[10px] px-1.5 py-0 bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700"
      },
      'medium': {
        label: "Médio",
        className: "text-[10px] px-1.5 py-0 bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-800"
      },
      'high': {
        label: "Alto",
        className: "text-[10px] px-1.5 py-0 bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800"
      },
      'critical': {
        label: "Crítico",
        className: "text-[10px] px-1.5 py-0 bg-red-50 text-red-600 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800"
      }
    };
    
    const config = configs[log.impact_level] || configs['low'];
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  }
  
  // Fallback: inferir do texto
  const actionLower = log.action.toLowerCase();
  const detailsLower = log.details?.toLowerCase() || "";
  
  if (
    actionLower.includes("exclu") ||
    actionLower.includes("delet") ||
    detailsLower.includes("admin") ||
    detailsLower.includes("permiss") ||
    log.is_critical
  ) {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-50 text-red-600 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800">
        Crítico
      </Badge>
    );
  }
  
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

// Ícone e tooltip de origem
const getOriginInfo = (log: AppLog) => {
  const origin = log.origin || 'web';
  
  const configs: Record<string, { icon: typeof Globe; label: string; color: string }> = {
    'web': { icon: Globe, label: "Via Web", color: "text-muted-foreground" },
    'api': { icon: Server, label: "Via API", color: "text-blue-500" },
    'mobile': { icon: Smartphone, label: "Via Mobile", color: "text-green-500" },
    'integration': { icon: Workflow, label: "Via Integração", color: "text-cyan-500" },
    'system': { icon: Bot, label: "Sistema (Automático)", color: "text-slate-500" },
    'job': { icon: Clock, label: "Job Agendado", color: "text-amber-500" },
    'webhook': { icon: Zap, label: "Webhook", color: "text-purple-500" },
  };
  
  const config = configs[origin] || configs['web'];
  const Icon = config.icon;
  
  return { Icon, label: config.label, color: config.color };
};

// Status badge
const getStatusBadge = (status?: string) => {
  if (!status || status === 'success') return null;
  
  const configs: Record<string, { label: string; className: string }> = {
    'error': {
      label: "Erro",
      className: "text-[9px] px-1 py-0 bg-red-100 text-red-700 border-red-200"
    },
    'partial': {
      label: "Parcial",
      className: "text-[9px] px-1 py-0 bg-amber-100 text-amber-700 border-amber-200"
    },
    'pending': {
      label: "Pendente",
      className: "text-[9px] px-1 py-0 bg-blue-100 text-blue-700 border-blue-200"
    }
  };
  
  const config = configs[status];
  if (!config) return null;
  
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
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
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[70px] text-center">Status</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[100px]">IP</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[60px] text-center">Origem</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[50px] text-center">Flags</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide w-[60px] text-center">Ver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
                    <span>Nenhum registro encontrado</span>
                    <span className="text-xs">Tente ajustar os filtros de busca</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const actionConfig = getActionTypeConfig(log.action_type, log.action);
                const ActionIcon = actionConfig.icon;
                const originInfo = getOriginInfo(log);
                const OriginIcon = originInfo.Icon;
                const statusBadge = getStatusBadge(log.status);
                
                return (
                  <TableRow 
                    key={log.id} 
                    className={`group hover:bg-muted/40 transition-colors border-b border-border/40 ${
                      log.is_critical ? 'bg-red-50/30 dark:bg-red-950/10' : ''
                    }`}
                  >
                    {/* Usuário */}
                    <TableCell className="py-3">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                log.user_id ? 'bg-primary/10' : 'bg-slate-200 dark:bg-slate-700'
                              }`}>
                                {log.user_id ? (
                                  <span className="text-xs font-semibold text-primary">
                                    {log.user_email?.[0]?.toUpperCase() || "U"}
                                  </span>
                                ) : (
                                  <Bot className="h-3.5 w-3.5 text-slate-500" />
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium truncate max-w-[120px]">
                                  {log.user_id
                                    ? highlightText(log.user_email || `${log.user_id.slice(0, 8)}...`, highlightTerm)
                                    : "Sistema"}
                                </span>
                                {log.user_role && (
                                  <span className="text-[10px] text-muted-foreground capitalize">
                                    {log.user_role}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="text-xs space-y-1">
                              {log.user_id ? (
                                <>
                                  <p><strong>Email:</strong> {log.user_email || "N/A"}</p>
                                  <p><strong>ID:</strong> {log.user_id}</p>
                                  {log.user_role && <p><strong>Role:</strong> {log.user_role}</p>}
                                  {log.device_info && <p><strong>Dispositivo:</strong> {log.device_info}</p>}
                                  {log.browser_info && <p><strong>Navegador:</strong> {log.browser_info}</p>}
                                </>
                              ) : (
                                <p>Ação executada automaticamente pelo sistema</p>
                              )}
                            </div>
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
                          {format(new Date(log.created_at), "HH:mm:ss.SSS", { locale: ptBR })}
                        </span>
                        {log.duration_ms && (
                          <span className="text-[10px] text-muted-foreground">
                            {log.duration_ms}ms
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Ação */}
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-md ${actionConfig.bgClass} ${actionConfig.borderClass} border`}>
                            <ActionIcon className={`h-3.5 w-3.5 ${actionConfig.textClass}`} />
                          </div>
                          <span className={`text-sm font-medium ${actionConfig.textClass}`}>
                            {highlightText(log.action, highlightTerm)}
                          </span>
                        </div>
                        {log.entity_name && (
                          <span className="text-xs text-muted-foreground pl-8 truncate max-w-[200px]">
                            {log.entity_type}: {log.entity_name}
                          </span>
                        )}
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
                      {getImpactBadge(log)}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3 text-center">
                      {statusBadge || (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                          OK
                        </Badge>
                      )}
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
                            <OriginIcon className={`h-3.5 w-3.5 ${originInfo.color}`} />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{originInfo.label}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    {/* Flags (LGPD, Crítico, etc) */}
                    <TableCell className="py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {log.is_lgpd_sensitive && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Shield className="h-3 w-3 text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Dados sensíveis (LGPD)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {log.is_critical && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Ação crítica</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {log.is_reversible === false && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Lock className="h-3 w-3 text-slate-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Ação irreversível</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
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
