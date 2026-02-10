import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search,
  RefreshCw,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Bot,
  User,
  Phone,
  Filter,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchWhatsAppLogs, type WhatsAppMessageLog } from '@/services/whatsappLogService';

const PAGE_SIZE = 30;

function getStatusInfo(log: WhatsAppMessageLog) {
  const status = log.final_status || log.initial_status || 'unknown';
  switch (status) {
    case 'delivered':
      return { label: 'Entregue', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200' };
    case 'read':
      return { label: 'Lida', icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
    case 'sent':
    case 'queued':
      return { label: 'Enviada', icon: Send, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' };
    case 'failed':
    case 'undelivered':
      return { label: 'Falhou', icon: XCircle, color: 'text-destructive', bg: 'bg-red-50 border-red-200' };
    default:
      return { label: status, icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/50 border-border' };
  }
}

function getDispatchLabel(type: string) {
  return type === 'automatic' ? 'Automático' : 'Manual';
}

function getTemplateLabel(type: string | null) {
  if (!type) return 'Personalizada';
  const labels: Record<string, string> = {
    daily_agenda: 'Agenda Diária',
    technician_schedule: 'Agendamento',
    technician_schedule_notification: 'Notificação de Agendamento',
    technician_next_day_agenda: 'Agenda Próx. Dia',
    order_shipped: 'Pedido Enviado',
    custom: 'Personalizada',
  };
  return labels[type] || type;
}

const WhatsAppMessageControl = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dispatchFilter, setDispatchFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<WhatsAppMessageLog | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['whatsapp-logs', debouncedSearch, dispatchFilter, page],
    queryFn: () =>
      fetchWhatsAppLogs({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        search: debouncedSearch || undefined,
        dispatchType: dispatchFilter,
      }),
  });

  const logs = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Stats
  const delivered = logs.filter(l => ['delivered', 'read'].includes(l.final_status || '')).length;
  const failed = logs.filter(l => ['failed', 'undelivered'].includes(l.final_status || '')).length;
  const pending = logs.filter(l => !['delivered', 'read', 'failed', 'undelivered'].includes(l.final_status || '')).length;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none px-4 sm:px-6 pt-5 pb-3 bg-background border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-primary" />
              Controle de Mensagens
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Acompanhe o envio e recebimento de mensagens WhatsApp para técnicos
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 h-10 px-4"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-xl font-bold text-foreground">{totalCount}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Entregues</div>
            <div className="text-xl font-bold text-green-600">{delivered}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3 text-yellow-600" /> Pendentes</div>
            <div className="text-xl font-bold text-yellow-600">{pending}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><XCircle className="w-3 h-3 text-destructive" /> Falhas</div>
            <div className="text-xl font-bold text-destructive">{failed}</div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nome, telefone ou conteúdo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <Select value={dispatchFilter} onValueChange={(v) => { setDispatchFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px] h-10">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="automatic">Automático</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden px-4 sm:px-6 py-4">
        <Card className="h-full flex flex-col">
          <CardContent className="p-0 flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <MessageSquare className="w-12 h-12 opacity-30" />
                <p>Nenhuma mensagem encontrada</p>
              </div>
            ) : (
              <div className="h-full overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="text-xs min-w-[140px]">Data/Hora</TableHead>
                      <TableHead className="text-xs min-w-[160px]">Destinatário</TableHead>
                      <TableHead className="text-xs min-w-[130px]">Telefone</TableHead>
                      <TableHead className="text-xs min-w-[120px]">Tipo</TableHead>
                      <TableHead className="text-xs min-w-[100px]">Disparo</TableHead>
                      <TableHead className="text-xs min-w-[100px]">Status</TableHead>
                      <TableHead className="text-xs min-w-[200px]">Conteúdo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const statusInfo = getStatusInfo(log);
                      const StatusIcon = statusInfo.icon;
                      return (
                        <TableRow
                          key={log.id}
                          className="cursor-pointer hover:bg-muted/60"
                          onClick={() => setSelectedLog(log)}
                        >
                          <TableCell className="text-xs">
                            {format(new Date(log.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm font-medium truncate max-w-[140px]">{log.recipient_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {log.recipient_phone}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getTemplateLabel(log.template_type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={log.dispatch_type === 'automatic' ? 'secondary' : 'outline'}
                              className="text-xs gap-1"
                            >
                              {log.dispatch_type === 'automatic' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                              {getDispatchLabel(log.dispatch_type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${statusInfo.bg}`}>
                              <StatusIcon className={`w-3 h-3 ${statusInfo.color}`} />
                              <span className={statusInfo.color}>{statusInfo.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground truncate block max-w-[250px]">
                              {log.message_content || '-'}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">
                Página {page + 1} de {totalPages} ({totalCount} mensagens)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Detalhes da Mensagem
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Destinatário</label>
                  <p className="font-medium text-sm">{selectedLog.recipient_name}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Telefone</label>
                  <p className="font-medium text-sm">{selectedLog.recipient_phone}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Data/Hora</label>
                  <p className="text-sm">{format(new Date(selectedLog.sent_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Tipo de Disparo</label>
                  <Badge variant={selectedLog.dispatch_type === 'automatic' ? 'secondary' : 'outline'} className="text-xs gap-1 mt-0.5">
                    {selectedLog.dispatch_type === 'automatic' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {getDispatchLabel(selectedLog.dispatch_type)}
                  </Badge>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Template</label>
                  <p className="text-sm">{getTemplateLabel(selectedLog.template_type)}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  {(() => {
                    const si = getStatusInfo(selectedLog);
                    const SI = si.icon;
                    return (
                      <div className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${si.bg} mt-0.5`}>
                        <SI className={`w-3 h-3 ${si.color}`} />
                        <span className={si.color}>{si.label}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {selectedLog.message_sid && (
                <div>
                  <label className="text-xs text-muted-foreground">Message SID</label>
                  <p className="text-xs font-mono text-muted-foreground break-all">{selectedLog.message_sid}</p>
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground">Conteúdo da Mensagem</label>
                <ScrollArea className="mt-1 max-h-[200px] rounded-md border p-3 bg-muted/30">
                  <p className="text-sm whitespace-pre-wrap">{selectedLog.message_content || 'Sem conteúdo disponível'}</p>
                </ScrollArea>
              </div>

              {(selectedLog.error_message || selectedLog.friendly_message) && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <label className="text-xs text-destructive font-medium">Erro</label>
                  <p className="text-sm text-destructive mt-1">
                    {selectedLog.friendly_message || selectedLog.error_message}
                  </p>
                  {selectedLog.error_code && (
                    <p className="text-xs text-muted-foreground mt-1">Código: {selectedLog.error_code}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppMessageControl;
