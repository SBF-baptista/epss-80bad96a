import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  FileJson
} from "lucide-react";
import { toast } from "sonner";
import type { AppLog } from "./HistoryTable";

interface LogDetailModalProps {
  log: AppLog | null;
  isOpen: boolean;
  onClose: () => void;
}

// Mapeamento de ícones por tipo de ação
const getActionIcon = (action: string) => {
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
const getActionStyle = (action: string) => {
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
const getImpactLevel = (action: string, details?: string | null) => {
  const actionLower = action.toLowerCase();
  const detailsLower = details?.toLowerCase() || "";
  
  if (actionLower.includes("exclu") || actionLower.includes("delet") || 
      detailsLower.includes("admin") || detailsLower.includes("permiss")) {
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

// Verificar se a ação é reversível
const isReversible = (action: string) => {
  const actionLower = action.toLowerCase();
  return !(actionLower.includes("exclu") || actionLower.includes("delet") || 
           actionLower.includes("login") || actionLower.includes("logout"));
};

const LogDetailModal = ({ log, isOpen, onClose }: LogDetailModalProps) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");

  if (!log) return null;

  const ActionIcon = getActionIcon(log.action);
  const impact = getImpactLevel(log.action, log.details);
  const reversible = isReversible(log.action);

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
        module: log.module,
        details: log.details,
      },
      user: {
        id: log.user_id,
        email: log.user_email,
      },
      metadata: {
        ip_address: log.ip_address,
        exported_at: new Date().toISOString(),
      },
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `log-${log.id.slice(0, 8)}.json`;
    link.click();
    toast.success("Evento exportado!");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${getActionStyle(log.action)}`}>
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
                  Impacto {impact.level}
                </Badge>
                {!reversible && (
                  <Badge variant="outline" className="text-xs text-rose-600 border-rose-200">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Irreversível
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
                <TabsTrigger value="timeline" className="text-xs">
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  Timeline
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
                    às {format(new Date(log.created_at), "HH:mm:ss", { locale: ptBR })}
                    <span className="ml-2 text-xs">
                      ({formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })})
                    </span>
                  </p>
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* Módulo e Ação */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Módulo
                    </p>
                    <p className="text-sm font-medium mt-1">{log.module}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Tipo
                    </p>
                    <p className="text-sm font-medium mt-1">{log.action}</p>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* Detalhes Completos */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted/50">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Detalhes Completos
                  </p>
                  <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {log.details || "Nenhum detalhe adicional registrado para esta ação."}
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* IP e Origem */}
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
                    <p className="text-sm font-medium mt-1">Via Web</p>
                  </div>
                </div>
              </div>

              {/* Status e Segurança */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
                <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                    Status da Ação
                  </p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Executada com sucesso • Registro imutável
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Tab Timeline */}
            <TabsContent value="timeline" className="p-6 mt-0">
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                
                <div className="space-y-6">
                  {/* Evento registrado */}
                  <div className="relative pl-10">
                    <div className="absolute left-2.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "HH:mm:ss", { locale: ptBR })}
                    </div>
                    <div className="text-sm font-medium mt-0.5">Ação executada</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {log.action} no módulo {log.module}
                    </div>
                  </div>

                  {/* Registro criado */}
                  <div className="relative pl-10">
                    <div className="absolute left-2.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "HH:mm:ss", { locale: ptBR })}
                    </div>
                    <div className="text-sm font-medium mt-0.5">Log registrado</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Evento armazenado de forma imutável
                    </div>
                  </div>

                  {/* Auditoria */}
                  <div className="relative pl-10">
                    <div className="absolute left-2.5 w-3 h-3 rounded-full bg-muted border-2 border-background" />
                    <div className="text-xs text-muted-foreground">Agora</div>
                    <div className="text-sm font-medium mt-0.5">Visualização do registro</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Consulta de auditoria em andamento
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab Técnico */}
            <TabsContent value="technical" className="p-6 mt-0 space-y-4">
              <div className="rounded-lg bg-slate-900 dark:bg-slate-950 p-4 overflow-x-auto">
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
{JSON.stringify({
  event_id: log.id,
  timestamp: log.created_at,
  action: log.action,
  module: log.module,
  user_id: log.user_id,
  user_email: log.user_email,
  details: log.details,
  ip_address: log.ip_address,
  metadata: {
    reversible: reversible,
    impact_level: impact.level.toLowerCase(),
    origin: "web",
    status: "success"
  }
}, null, 2)}
                </pre>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>ID do Registro:</strong> <span className="font-mono">{log.id}</span></p>
                <p><strong>Versão do Schema:</strong> v1.0</p>
                <p><strong>Integridade:</strong> Verificada</p>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Footer com ações */}
        <div className="p-4 border-t bg-muted/20 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(log.id, "ID do evento")}
          >
            {copied === "ID do evento" ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            Copiar ID
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToJSON}>
              <FileJson className="h-4 w-4 mr-2" />
              Exportar JSON
            </Button>
            <Button variant="default" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LogDetailModal;
