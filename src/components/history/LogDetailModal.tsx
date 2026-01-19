import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Clock, MapPin, FileText, Activity, Layers } from "lucide-react";

interface AppLog {
  id: string;
  user_id: string | null;
  action: string;
  module: string;
  details: string | null;
  ip_address: string | null;
  created_at: string;
  user_email?: string;
}

interface LogDetailModalProps {
  log: AppLog | null;
  isOpen: boolean;
  onClose: () => void;
}

const LogDetailModal = ({ log, isOpen, onClose }: LogDetailModalProps) => {
  if (!log) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Detalhes do Registro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ação e Módulo */}
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {log.action}
            </Badge>
            <Badge variant="secondary">
              {log.module}
            </Badge>
          </div>

          <Separator />

          {/* Usuário */}
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Usuário</p>
              <p className="text-sm">
                {log.user_email || (log.user_id ? `ID: ${log.user_id}` : "Sistema")}
              </p>
            </div>
          </div>

          {/* Data e Hora */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Data e Hora</p>
              <p className="text-sm">
                {format(new Date(log.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", {
                  locale: ptBR,
                })}
              </p>
            </div>
          </div>

          {/* Módulo */}
          <div className="flex items-start gap-3">
            <Layers className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Módulo</p>
              <p className="text-sm">{log.module}</p>
            </div>
          </div>

          {/* Ação */}
          <div className="flex items-start gap-3">
            <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ação Realizada</p>
              <p className="text-sm">{log.action}</p>
            </div>
          </div>

          {/* Detalhes */}
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Detalhes Completos</p>
              <div className="mt-1 p-3 bg-muted/50 rounded-md">
                <p className="text-sm whitespace-pre-wrap break-words">
                  {log.details || "Nenhum detalhe adicional registrado"}
                </p>
              </div>
            </div>
          </div>

          {/* IP */}
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Endereço IP</p>
              <p className="text-sm font-mono">{log.ip_address || "Não registrado"}</p>
            </div>
          </div>

          {/* ID do Registro */}
          <Separator />
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">ID do Registro:</span>{" "}
            <span className="font-mono">{log.id}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LogDetailModal;
