import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  User, 
  Clock, 
  MapPin, 
  FileText, 
  Activity, 
  Layers,
  Copy,
  Check,
  Download,
  Globe,
  Shield,
  AlertTriangle,
  Trash2,
  Edit,
  Plus,
  LogIn,
  CheckCircle,
  XCircle,
  RefreshCw,
  Code,
  ArrowRight,
  Bot,
  Smartphone,
  Monitor,
  Lock
} from "lucide-react";
import { toast } from "sonner";
import type { AppLog } from "./HistoryTable";

interface LogDetailModalProps {
  log: AppLog | null;
  isOpen: boolean;
  onClose: () => void;
}

// Mapeamento de ícones por tipo de ação
const getActionIcon = (action: string, actionType?: string) => {
  if (actionType) {
    const icons: Record<string, typeof Trash2> = {
      'create': Plus,
      'update': Edit,
      'delete': Trash2,
      'login': LogIn,
      'logout': LogIn,
      'approval': CheckCircle,
      'rejection': XCircle,
      'cancellation': XCircle,
      'integration': RefreshCw,
      'system': Bot,
      'error': AlertTriangle,
      'access': Globe,
    };
    if (icons[actionType]) return icons[actionType];
  }
  
  const actionLower = action.toLowerCase();
  if (actionLower.includes("exclu") || actionLower.includes("delet")) return Trash2;
  if (actionLower.includes("edit") || actionLower.includes("alter") || actionLower.includes("atualiz")) return Edit;
  if (actionLower.includes("cri") || actionLower.includes("add") || actionLower.includes("nov")) return Plus;
  if (actionLower.includes("login") || actionLower.includes("logout")) return LogIn;
  if (actionLower.includes("aprov") || actionLower.includes("confirm")) return CheckCircle;
  if (actionLower.includes("cancel") || actionLower.includes("rejeit")) return XCircle;
  if (actionLower.includes("erro") || actionLower.includes("falha")) return AlertTriangle;
  return RefreshCw;
};

// Cor do badge por tipo de ação
const getActionStyle = (action: string, actionType?: string) => {
  if (actionType) {
    const styles: Record<string, string> = {
      'create': "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400",
      'update': "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400",
      'delete': "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400",
      'login': "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400",
      'logout': "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400",
      'approval': "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400",
      'rejection': "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400",
      'error': "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400",
    };
    if (styles[actionType]) return styles[actionType];
  }
  
  const actionLower = action.toLowerCase();
  if (actionLower.includes("exclu") || actionLower.includes("delet")) {
    return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400";
  }
  if (actionLower.includes("edit") || actionLower.includes("alter") || actionLower.includes("atualiz")) {
    return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400";
  }
  if (actionLower.includes("cri") || actionLower.includes("add") || actionLower.includes("nov")) {
    return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400";
  }
  if (actionLower.includes("login") || actionLower.includes("logout")) {
    return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400";
  }
  if (actionLower.includes("aprov")) {
    return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400";
  }
  if (actionLower.includes("cancel")) {
    return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400";
  }
  if (actionLower.includes("erro") || actionLower.includes("falha")) {
    return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400";
  }
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400";
};

// Determinar nível de impacto
const getImpactLevel = (log: AppLog) => {
  if (log.impact_level) {
    const configs: Record<string, { level: string; color: string; bg: string }> = {
      'info': { level: "Informativo", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" },
      'low': { level: "Baixo", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" },
      'medium': { level: "Médio", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-950/50" },
      'high': { level: "Alto", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-950/50" },
      'critical': { level: "Crítico", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950/50" },
    };
    return configs[log.impact_level] || configs['low'];
  }
  
  const actionLower = log.action.toLowerCase();
  const detailsLower = log.details?.toLowerCase() || "";
  
  if (actionLower.includes("exclu") || actionLower.includes("delet") || 
      detailsLower.includes("admin") || detailsLower.includes("permiss") || log.is_critical) {
    return { level: "Crítico", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950/50" };
  }
  if (actionLower.includes("alter") || actionLower.includes("edit") || actionLower.includes("atualiz")) {
    return { level: "Alto", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-950/50" };
  }
  if (actionLower.includes("cri") || actionLower.includes("nov")) {
    return { level: "Médio", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-950/50" };
  }
  return { level: "Baixo", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" };
};

// Status config
const getStatusConfig = (status?: string) => {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    'success': { label: "Sucesso", color: "text-emerald-600", bg: "bg-emerald-50" },
    'error': { label: "Erro", color: "text-red-600", bg: "bg-red-50" },
    'partial': { label: "Parcial", color: "text-amber-600", bg: "bg-amber-50" },
    'pending': { label: "Pendente", color: "text-blue-600", bg: "bg-blue-50" },
  };
  return configs[status || 'success'] || configs['success'];
};

const LogDetailModal = ({ log, isOpen, onClose }: LogDetailModalProps) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");

  if (!log) return null;

  const ActionIcon = getActionIcon(log.action, log.action_type);
  const impact = getImpactLevel(log);
  const statusConfig = getStatusConfig(log.status);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const exportToJSON = () => {
    const exportData = {
      event: {
        id: log.id,
        timestamp: log.created_at,
        action: log.action,
        action_type: log.action_type,
        module: log.module,
        details: log.details,
        impact_level: log.impact_level,
        status: log.status,
      },
      entity: {
        type: log.entity_type,
        id: log.entity_id,
        name: log.entity_name,
      },
      state_changes: {
        previous: log.previous_state,
        new: log.new_state,
        changed_fields: log.changed_fields,
      },
      user: {
        id: log.user_id,
        email: log.user_email,
        role: log.user_role,
      },
      metadata: {
        ip_address: log.ip_address,
        origin: log.origin,
        device_info: log.device_info,
        browser_info: log.browser_info,
        duration_ms: log.duration_ms,
        is_reversible: log.is_reversible,
        is_critical: log.is_critical,
        is_lgpd_sensitive: log.is_lgpd_sensitive,
      },
      error: log.error_code ? {
        code: log.error_code,
        message: log.error_message,
      } : null,
      exported_at: new Date().toISOString(),
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `log-${log.id.slice(0, 8)}.json`;
    link.click();
    toast.success("Evento exportado!");
  };

  const exportToPDF = () => {
    // Criar conteúdo HTML para PDF
    const htmlContent = `
      <html>
        <head>
          <title>Log ${log.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            .section { margin: 20px 0; }
            .label { font-weight: bold; color: #666; }
            .value { margin-left: 10px; }
            pre { background: #f5f5f5; padding: 10px; overflow: auto; }
          </style>
        </head>
        <body>
          <h1>Registro de Auditoria</h1>
          <div class="section">
            <p><span class="label">ID:</span><span class="value">${log.id}</span></p>
            <p><span class="label">Ação:</span><span class="value">${log.action}</span></p>
            <p><span class="label">Módulo:</span><span class="value">${log.module}</span></p>
            <p><span class="label">Data/Hora:</span><span class="value">${format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</span></p>
            <p><span class="label">Usuário:</span><span class="value">${log.user_email || 'Sistema'}</span></p>
            <p><span class="label">IP:</span><span class="value">${log.ip_address || 'N/A'}</span></p>
            <p><span class="label">Impacto:</span><span class="value">${impact.level}</span></p>
            <p><span class="label">Status:</span><span class="value">${statusConfig.label}</span></p>
          </div>
          <div class="section">
            <p class="label">Detalhes:</p>
            <p>${log.details || 'Nenhum detalhe registrado'}</p>
          </div>
          ${log.previous_state || log.new_state ? `
          <div class="section">
            <p class="label">Estado Anterior:</p>
            <pre>${JSON.stringify(log.previous_state, null, 2) || 'N/A'}</pre>
            <p class="label">Estado Novo:</p>
            <pre>${JSON.stringify(log.new_state, null, 2) || 'N/A'}</pre>
          </div>
          ` : ''}
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
    toast.success("Preparando PDF...");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${getActionStyle(log.action, log.action_type)}`}>
              <ActionIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold leading-tight">
                {log.action}
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {log.module}
                </Badge>
                <Badge variant="outline" className={`text-xs ${impact.color}`}>
                  {impact.level}
                </Badge>
                <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
                  {statusConfig.label}
                </Badge>
                {log.is_reversible === false && (
                  <Badge variant="outline" className="text-xs text-rose-600 border-rose-200">
                    <Lock className="h-3 w-3 mr-1" />
                    Irreversível
                  </Badge>
                )}
                {log.is_lgpd_sensitive && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                    <Shield className="h-3 w-3 mr-1" />
                    LGPD
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-4 border-b">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="details" className="text-xs">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Detalhes
                </TabsTrigger>
                <TabsTrigger value="changes" className="text-xs">
                  <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                  Alterações
                </TabsTrigger>
                <TabsTrigger value="technical" className="text-xs">
                  <Code className="h-3.5 w-3.5 mr-1.5" />
                  Técnico
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Detalhes */}
            <TabsContent value="details" className="p-6 space-y-5 mt-0">
              {/* Usuário */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted/50">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Usuário Responsável
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {log.user_email || (log.user_id ? `ID: ${log.user_id}` : "Sistema (Automático)")}
                  </p>
                  {log.user_role && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Role: <span className="capitalize">{log.user_role}</span>
                    </p>
                  )}
                  {log.user_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs mt-1"
                      onClick={() => copyToClipboard(log.user_id!, "ID do usuário")}
                    >
                      {copied === "ID do usuário" ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      Copiar ID
                    </Button>
                  )}
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* Data e Hora */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted/50">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Data e Hora
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {format(new Date(log.created_at), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    às {format(new Date(log.created_at), "HH:mm:ss.SSS", { locale: ptBR })}
                    <span className="ml-2 text-xs">
                      ({formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })})
                    </span>
                  </p>
                  {log.duration_ms && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Duração: {log.duration_ms}ms
                    </p>
                  )}
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* Entidade Afetada */}
              {(log.entity_type || log.entity_id || log.entity_name) && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Entidade Afetada
                      </p>
                      {log.entity_type && (
                        <p className="text-sm font-medium mt-1">Tipo: {log.entity_type}</p>
                      )}
                      {log.entity_name && (
                        <p className="text-sm text-muted-foreground">Nome: {log.entity_name}</p>
                      )}
                      {log.entity_id && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                            {log.entity_id}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-xs"
                            onClick={() => copyToClipboard(log.entity_id!, "ID da entidade")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator className="bg-border/50" />
                </>
              )}

              {/* Detalhes Completos */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted/50">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Detalhes da Ação
                  </p>
                  <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {log.details || "Nenhum detalhe adicional registrado para esta ação."}
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* IP, Origem e Dispositivo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Endereço IP
                    </p>
                    <p className="text-sm font-mono font-medium mt-1">
                      {log.ip_address || "Não registrado"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Origem
                    </p>
                    <p className="text-sm font-medium mt-1 capitalize">
                      {log.origin || "Web"}
                    </p>
                  </div>
                </div>
              </div>

              {(log.device_info || log.browser_info) && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted/50">
                      {log.device_info === 'Mobile' ? (
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Dispositivo
                      </p>
                      <p className="text-sm font-medium mt-1">
                        {log.device_info || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Navegador
                      </p>
                      <p className="text-sm font-medium mt-1">
                        {log.browser_info || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Erro (se houver) */}
              {log.error_code && (
                <>
                  <Separator className="bg-border/50" />
                  <div className="p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-red-700 dark:text-red-400 uppercase tracking-wide">
                          Erro: {log.error_code}
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                          {log.error_message || "Erro não especificado"}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Status da Ação */}
              <div className={`flex items-start gap-3 p-3 rounded-lg border ${
                log.status === 'error' ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200/50' :
                log.status === 'partial' ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50' :
                'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50'
              }`}>
                <Shield className={`h-4 w-4 mt-0.5 ${
                  log.status === 'error' ? 'text-red-600' :
                  log.status === 'partial' ? 'text-amber-600' :
                  'text-emerald-600'
                }`} />
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wide ${
                    log.status === 'error' ? 'text-red-700' :
                    log.status === 'partial' ? 'text-amber-700' :
                    'text-emerald-700'
                  }`}>
                    Status: {statusConfig.label}
                  </p>
                  <p className={`text-sm mt-0.5 ${
                    log.status === 'error' ? 'text-red-600' :
                    log.status === 'partial' ? 'text-amber-600' :
                    'text-emerald-600'
                  }`}>
                    {log.is_reversible === false ? 'Ação irreversível' : 'Ação reversível'} • Registro imutável
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Tab Alterações (Antes/Depois) */}
            <TabsContent value="changes" className="p-6 mt-0 space-y-4">
              {log.changed_fields && log.changed_fields.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Campos Alterados
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {log.changed_fields.map((field, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Estado Anterior */}
                <Card className="p-4 border-red-200/50 bg-red-50/30 dark:bg-red-950/10">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <XCircle className="h-3.5 w-3.5" />
                    Estado Anterior
                  </p>
                  {log.previous_state ? (
                    <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap overflow-auto max-h-64 bg-white/50 dark:bg-slate-900/50 p-3 rounded">
                      {JSON.stringify(log.previous_state, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Estado anterior não registrado
                    </p>
                  )}
                </Card>

                {/* Estado Novo */}
                <Card className="p-4 border-emerald-200/50 bg-emerald-50/30 dark:bg-emerald-950/10">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Estado Novo
                  </p>
                  {log.new_state ? (
                    <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap overflow-auto max-h-64 bg-white/50 dark:bg-slate-900/50 p-3 rounded">
                      {JSON.stringify(log.new_state, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Estado novo não registrado
                    </p>
                  )}
                </Card>
              </div>

              {!log.previous_state && !log.new_state && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma alteração de estado registrada para este evento</p>
                  <p className="text-xs mt-1">Eventos futuros incluirão comparação antes/depois</p>
                </div>
              )}
            </TabsContent>

            {/* Tab Técnico */}
            <TabsContent value="technical" className="p-6 mt-0 space-y-4">
              <div className="rounded-lg bg-slate-900 dark:bg-slate-950 p-4 overflow-x-auto">
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
{JSON.stringify({
  event_id: log.id,
  timestamp: log.created_at,
  action: log.action,
  action_type: log.action_type || 'inferred',
  module: log.module,
  user_id: log.user_id,
  user_email: log.user_email,
  user_role: log.user_role,
  details: log.details,
  entity: {
    type: log.entity_type,
    id: log.entity_id,
    name: log.entity_name,
  },
  origin: log.origin || 'web',
  ip_address: log.ip_address,
  device_info: log.device_info,
  browser_info: log.browser_info,
  metadata: {
    impact_level: log.impact_level || 'inferred',
    status: log.status || 'success',
    duration_ms: log.duration_ms,
    is_reversible: log.is_reversible,
    is_critical: log.is_critical,
    is_lgpd_sensitive: log.is_lgpd_sensitive,
  },
  error: log.error_code ? {
    code: log.error_code,
    message: log.error_message,
  } : null,
  state_changes: {
    previous: log.previous_state || null,
    new: log.new_state || null,
    changed_fields: log.changed_fields || [],
  },
}, null, 2)}
                </pre>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>ID do Registro:</strong> <span className="font-mono">{log.id}</span></p>
                <p><strong>Timestamp:</strong> <span className="font-mono">{log.created_at}</span></p>
                <p><strong>Log Imutável:</strong> Este registro não pode ser alterado ou excluído</p>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Footer com ações */}
        <div className="p-4 border-t flex justify-between items-center gap-2 bg-muted/20">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => copyToClipboard(log.id, "ID do evento")}
            >
              {copied === "ID do evento" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copiar ID
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={exportToPDF}
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={exportToJSON}
            >
              <Download className="h-4 w-4" />
              JSON
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LogDetailModal;
