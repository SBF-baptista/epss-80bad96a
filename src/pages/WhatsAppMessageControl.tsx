import { useState, useEffect } from 'react';
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
  CalendarClock,
  Hash,
  FileText,
  AlertTriangle,
  Info,
  ArrowRight,
  Inbox,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { fetchWhatsAppLogs, type WhatsAppMessageLog } from '@/services/whatsappLogService';

const PAGE_SIZE = 30;

function getStatusInfo(log: WhatsAppMessageLog) {
  const status = log.final_status || log.initial_status || 'unknown';
  switch (status) {
    case 'delivered':
      return { label: 'Entregue', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50/80 border-emerald-200/60' };
    case 'read':
      return { label: 'Lida', icon: CheckCircle2, color: 'text-sky-600', bg: 'bg-sky-50/80 border-sky-200/60' };
    case 'sent':
    case 'queued':
      return { label: 'Enviada', icon: Send, color: 'text-amber-600', bg: 'bg-amber-50/80 border-amber-200/60' };
    case 'failed':
    case 'undelivered':
      return { label: 'Falhou', icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/5 border-destructive/20' };
    default:
      return { label: status, icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/40 border-border/60' };
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

  const delivered = logs.filter(l => ['delivered', 'read'].includes(l.final_status || '')).length;
  const failed = logs.filter(l => ['failed', 'undelivered'].includes(l.final_status || '')).length;
  const pending = logs.filter(l => !['delivered', 'read', 'failed', 'undelivered'].includes(l.final_status || '')).length;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-muted/20">
      {/* Header */}
      <div className="flex-none px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-4 bg-background border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Controle de Mensagens
            </h1>
            <p className="text-muted-foreground/70 mt-1.5 text-sm">
              Acompanhe o envio e recebimento de mensagens WhatsApp para técnicos
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="text-xs font-medium">Atualizar</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <Card className="p-4 rounded-xl border-border/40 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <Inbox className="w-3.5 h-3.5 text-muted-foreground/60" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Total</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{totalCount}</div>
          </Card>
          <Card className="p-4 rounded-xl border-border/40 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Entregues</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{delivered}</div>
          </Card>
          <Card className="p-4 rounded-xl border-border/40 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500/70" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Pendentes</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">{pending}</div>
          </Card>
          <Card className="p-4 rounded-xl border-border/40 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <XCircle className="w-3.5 h-3.5 text-destructive/60" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Falhas</span>
            </div>
            <div className="text-2xl font-bold text-destructive">{failed}</div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mt-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 w-4 h-4" />
            <Input
              placeholder="Buscar por nome, telefone ou conteúdo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 border-border/50 bg-background focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all text-sm"
            />
          </div>
          <Select value={dispatchFilter} onValueChange={(v) => { setDispatchFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[175px] h-10 border-border/50 bg-background text-sm">
              <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground/60" />
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
      <div className="flex-1 overflow-hidden px-4 sm:px-6 lg:px-8 py-4">
        <Card className="h-full flex flex-col rounded-xl border-border/40 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-16">
              <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-sm">Nenhuma mensagem encontrada</p>
              <p className="text-xs text-muted-foreground/60">As mensagens aparecerão aqui após o primeiro envio</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/30 z-10 border-b border-border/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 min-w-[150px]">Destinatário</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 min-w-[130px]">Telefone</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 min-w-[130px]">Data/Hora</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 min-w-[140px]">Template</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 min-w-[100px]">Disparo</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 min-w-[100px]">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 min-w-[180px]">Conteúdo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const statusInfo = getStatusInfo(log);
                    const StatusIcon = statusInfo.icon;
                    return (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-primary/[0.03] transition-colors duration-150 border-b border-border/30"
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-primary/8 flex items-center justify-center flex-shrink-0">
                              <User className="w-3.5 h-3.5 text-primary/70" />
                            </div>
                            <span className="text-sm font-semibold text-foreground truncate max-w-[130px]">{log.recipient_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="text-xs text-muted-foreground font-mono">{log.recipient_phone}</span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="text-xs text-muted-foreground/80">
                            <div>{format(new Date(log.sent_at), "dd/MM/yyyy", { locale: ptBR })}</div>
                            <div className="text-muted-foreground/50 text-[11px]">{format(new Date(log.sent_at), "HH:mm:ss", { locale: ptBR })}</div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Badge variant="outline" className="text-[11px] font-normal border-border/50 text-muted-foreground">
                            {getTemplateLabel(log.template_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Badge
                            variant="secondary"
                            className={`text-[11px] gap-1 font-normal ${
                              log.dispatch_type === 'automatic'
                                ? 'bg-violet-50/80 text-violet-600 border border-violet-200/50'
                                : 'bg-muted/60 text-muted-foreground border border-border/40'
                            }`}
                          >
                            {log.dispatch_type === 'automatic' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            {getDispatchLabel(log.dispatch_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${statusInfo.bg}`}>
                            <StatusIcon className={`w-3 h-3 ${statusInfo.color}`} />
                            <span className={statusInfo.color}>{statusInfo.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="text-xs text-muted-foreground/70 truncate block max-w-[220px] leading-relaxed">
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/30 bg-muted/20 flex-none">
              <span className="text-xs text-muted-foreground/60">
                Página {page + 1} de {totalPages} · {totalCount} mensagens
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="h-8 text-xs border-border/50"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="h-8 text-xs border-border/50"
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
        <DialogContent className="max-w-lg rounded-2xl p-0 gap-0 overflow-hidden shadow-xl border-border/40">
          <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-b from-muted/40 to-transparent">
            <DialogTitle className="flex items-center gap-3 text-lg">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              Detalhes da Mensagem
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="px-6 pb-6 space-y-5">
              {/* Recipient Block */}
              <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-muted-foreground/60" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Destinatário</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-base text-foreground">{selectedLog.recipient_name}</p>
                    <p className="text-sm text-muted-foreground font-mono mt-0.5">{selectedLog.recipient_phone}</p>
                  </div>
                  {(() => {
                    const si = getStatusInfo(selectedLog);
                    const SI = si.icon;
                    return (
                      <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${si.bg}`}>
                        <SI className={`w-3.5 h-3.5 ${si.color}`} />
                        <span className={si.color}>{si.label}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Send Info Block */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-muted-foreground/60" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Informações de Envio</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground/60 font-medium">Data/Hora</label>
                    <p className="text-sm text-foreground mt-0.5">
                      {format(new Date(selectedLog.sent_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground/60 font-medium">Tipo de Disparo</label>
                    <div className="mt-1">
                      <Badge
                        variant="secondary"
                        className={`text-[11px] gap-1 font-normal ${
                          selectedLog.dispatch_type === 'automatic'
                            ? 'bg-violet-50/80 text-violet-600 border border-violet-200/50'
                            : 'bg-muted/60 text-muted-foreground border border-border/40'
                        }`}
                      >
                        {selectedLog.dispatch_type === 'automatic' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {getDispatchLabel(selectedLog.dispatch_type)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground/60 font-medium">Template</label>
                    <p className="text-sm text-foreground mt-0.5">{getTemplateLabel(selectedLog.template_type)}</p>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground/60 font-medium">Status Inicial</label>
                    <p className="text-sm text-muted-foreground mt-0.5">{selectedLog.initial_status || '-'}</p>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/30" />

              {/* Status Trail */}
              {(selectedLog.initial_status || selectedLog.final_status) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-muted-foreground/60" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Rastreabilidade</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="px-2.5 py-1 rounded-md bg-muted/50 border border-border/40 text-muted-foreground font-medium">
                      {selectedLog.initial_status || '—'}
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                    {(() => {
                      const si = getStatusInfo(selectedLog);
                      const SI = si.icon;
                      return (
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium ${si.bg}`}>
                          <SI className={`w-3 h-3 ${si.color}`} />
                          <span className={si.color}>{selectedLog.final_status || '—'}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Message SID */}
              {selectedLog.message_sid && selectedLog.message_sid !== 'unknown' && (
                <div>
                  <label className="text-[11px] text-muted-foreground/50 font-medium flex items-center gap-1.5">
                    <Hash className="w-3 h-3" /> Message SID
                  </label>
                  <p className="text-[11px] font-mono text-muted-foreground/50 break-all mt-0.5 leading-relaxed">{selectedLog.message_sid}</p>
                </div>
              )}

              <Separator className="bg-border/30" />

              {/* Message Content */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground/60" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Conteúdo da Mensagem</span>
                </div>
                <ScrollArea className="max-h-[220px] rounded-xl border border-border/40 bg-muted/20 p-4">
                  <pre className="text-sm whitespace-pre-wrap font-mono text-foreground/80 leading-relaxed break-words">
                    {selectedLog.message_content || 'Sem conteúdo disponível'}
                  </pre>
                </ScrollArea>
              </div>

              {/* Error Block */}
              {(selectedLog.error_message || selectedLog.friendly_message) && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/[0.03] p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive/70" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-destructive/70">Erro no Envio</span>
                  </div>
                  <p className="text-sm text-destructive/90">
                    {selectedLog.friendly_message || selectedLog.error_message}
                  </p>
                  {selectedLog.error_code && (
                    <p className="text-[11px] text-muted-foreground/60 font-mono">Código: {selectedLog.error_code}</p>
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
