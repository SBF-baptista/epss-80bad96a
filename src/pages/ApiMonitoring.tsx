import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Activity, Search, RefreshCw, Plus, Play, FileText, Edit2, Trash2,
  CheckCircle2, AlertTriangle, XCircle, HelpCircle, Clock, Zap, Server,
  ArrowUpRight, ArrowDownRight, X, Save
} from 'lucide-react';
import {
  fetchEndpointWithStats, createEndpoint, updateEndpoint, deleteEndpoint,
  executeEndpointTest, fetchExecutionLogs, maskSensitiveValue,
  type EndpointWithStats, type ApiEndpoint, type ApiExecutionLog
} from '@/services/apiMonitoringService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'ok', label: '🟢 OK' },
  { value: 'warning', label: '🟡 Alerta' },
  { value: 'error', label: '🔴 Erro' },
  { value: 'unknown', label: '⚪ Sem dados' },
];

const ApiMonitoring = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [systemFilter, setSystemFilter] = useState('all');

  // Modals
  const [isEndpointModalOpen, setIsEndpointModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointWithStats | null>(null);
  const [editingEndpoint, setEditingEndpoint] = useState<Partial<ApiEndpoint> | null>(null);

  // Test state
  const [testMethod, setTestMethod] = useState('GET');
  const [testUrl, setTestUrl] = useState('');
  const [testHeaders, setTestHeaders] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);
  const [testBody, setTestBody] = useState('');
  const [testResult, setTestResult] = useState<ApiExecutionLog | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Queries
  const { data: endpoints = [], isLoading, refetch } = useQuery({
    queryKey: ['api-endpoints-stats'],
    queryFn: fetchEndpointWithStats,
    enabled: true, // Admin-only page, already behind RoleProtectedRoute
    staleTime: 1000 * 60 * 2,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['api-logs', selectedEndpoint?.id],
    queryFn: () => selectedEndpoint ? fetchExecutionLogs(selectedEndpoint.id) : Promise.resolve([]),
    enabled: !!selectedEndpoint && isLogsModalOpen,
  });

  // Filters
  const systems = [...new Set(endpoints.map(e => e.system_origin))];

  const filteredEndpoints = endpoints.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || e.status_indicator === statusFilter;
    const matchMethod = methodFilter === 'all' || e.method === methodFilter;
    const matchSystem = systemFilter === 'all' || e.system_origin === systemFilter;
    return matchSearch && matchStatus && matchMethod && matchSystem;
  });

  // Stats
  const totalEndpoints = endpoints.length;
  const activeEndpoints = endpoints.filter(e => e.is_active).length;
  const avgSuccessRate = endpoints.length > 0
    ? Math.round(endpoints.reduce((acc, e) => acc + e.success_rate, 0) / endpoints.length)
    : 0;
  const totalErrors = endpoints.reduce((acc, e) => acc + e.error_count_4xx + e.error_count_5xx, 0);
  const avgResponseTime = endpoints.length > 0
    ? Math.round(endpoints.reduce((acc, e) => acc + e.avg_response_time, 0) / endpoints.length)
    : 0;

  const alertEndpoints = endpoints.filter(e =>
    e.consecutive_errors >= 3 ||
    (e.avg_response_time > e.expected_response_time_ms && e.total_executions > 0)
  );

  // Handlers
  const handleSaveEndpoint = async () => {
    if (!editingEndpoint?.name || !editingEndpoint?.url) {
      toast({ title: 'Erro', description: 'Nome e URL são obrigatórios', variant: 'destructive' });
      return;
    }
    try {
      if (editingEndpoint.id) {
        await updateEndpoint(editingEndpoint.id, editingEndpoint);
      } else {
        await createEndpoint(editingEndpoint as any);
      }
      toast({ title: 'Sucesso', description: 'Endpoint salvo com sucesso' });
      setIsEndpointModalOpen(false);
      setEditingEndpoint(null);
      refetch();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteEndpoint = async (id: string) => {
    try {
      await deleteEndpoint(id);
      toast({ title: 'Sucesso', description: 'Endpoint removido' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleOpenTest = (endpoint: EndpointWithStats) => {
    setSelectedEndpoint(endpoint);
    setTestMethod(endpoint.method);
    setTestUrl(endpoint.url);
    const headerEntries = Object.entries(endpoint.headers || {}).map(([key, value]) => ({ key, value: value as string }));
    setTestHeaders(headerEntries.length > 0 ? headerEntries : [{ key: '', value: '' }]);
    setTestBody(endpoint.default_body ? JSON.stringify(endpoint.default_body, null, 2) : '');
    setTestResult(null);
    setIsTestModalOpen(true);
  };

  const handleExecuteTest = async () => {
    if (!selectedEndpoint) return;
    setIsTesting(true);
    try {
      const headersObj: Record<string, string> = {};
      testHeaders.forEach(h => { if (h.key) headersObj[h.key] = h.value; });

      let bodyToSend = undefined;
      if (testBody) {
        try { bodyToSend = JSON.parse(testBody); } catch { bodyToSend = testBody; }
      }

      const result = await executeEndpointTest(selectedEndpoint.id, testMethod, testUrl, headersObj, bodyToSend);
      setTestResult(result);
      queryClient.invalidateQueries({ queryKey: ['api-endpoints-stats'] });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleOpenLogs = (endpoint: EndpointWithStats) => {
    setSelectedEndpoint(endpoint);
    setIsLogsModalOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (code: number | null) => {
    if (!code || code === 0) return <Badge variant="outline" className="text-muted-foreground">Falha</Badge>;
    if (code >= 200 && code < 300) return <Badge className="bg-green-100 text-green-800 border-green-200">{code}</Badge>;
    if (code >= 300 && code < 400) return <Badge className="bg-blue-100 text-blue-800 border-blue-200">{code}</Badge>;
    if (code >= 400 && code < 500) return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">{code}</Badge>;
    return <Badge className="bg-red-100 text-red-800 border-red-200">{code}</Badge>;
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      POST: 'bg-blue-100 text-blue-800 border-blue-200',
      PUT: 'bg-amber-100 text-amber-800 border-amber-200',
      DELETE: 'bg-red-100 text-red-800 border-red-200',
      PATCH: 'bg-purple-100 text-purple-800 border-purple-200',
    };
    return <Badge className={colors[method] || 'bg-muted text-muted-foreground'}>{method}</Badge>;
  };

  const formatResponseBody = (body: string | null) => {
    if (!body) return 'Sem resposta';
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <div className="bg-background border-b border-border/50 px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 max-w-[1920px] mx-auto">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Activity className="h-7 w-7 text-primary" />
              Monitoramento de APIs & Endpoints
            </h1>
            <p className="text-muted-foreground/80 mt-1 text-sm">
              Monitore, teste e diagnostique todos os endpoints integrados
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="h-10 px-4">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => { setEditingEndpoint({ method: 'GET', system_origin: 'Interno', is_active: true, expected_response_time_ms: 5000, headers: {} }); setIsEndpointModalOpen(true); }} className="h-10 px-4">
              <Plus className="w-4 h-4 mr-2" />
              Novo Endpoint
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-5 max-w-[1920px] mx-auto space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Endpoints', value: totalEndpoints, icon: Server, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Ativos', value: `${activeEndpoints}/${totalEndpoints}`, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
            { label: 'Taxa de Sucesso', value: `${avgSuccessRate}%`, icon: Zap, color: avgSuccessRate >= 90 ? 'text-green-600' : avgSuccessRate >= 70 ? 'text-yellow-600' : 'text-red-600', bg: avgSuccessRate >= 90 ? 'bg-green-100' : avgSuccessRate >= 70 ? 'bg-yellow-100' : 'bg-red-100' },
            { label: 'Erros Totais', value: totalErrors, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
            { label: 'Tempo Médio', value: `${avgResponseTime}ms`, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
            { label: 'Alertas', value: alertEndpoints.length, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
          ].map(kpi => (
            <Card key={kpi.label} className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground/70 font-medium">{kpi.label}</p>
                    <p className={`text-2xl font-bold ${kpi.color} mt-1`}>{kpi.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${kpi.bg}`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alerts */}
        {alertEndpoints.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-amber-900">Alertas Ativos</h3>
              </div>
              <div className="space-y-2">
                {alertEndpoints.map(ep => (
                  <div key={ep.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(ep.status_indicator)}
                      <div>
                        <p className="font-medium text-sm">{ep.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ep.consecutive_errors >= 3 && `${ep.consecutive_errors} erros consecutivos`}
                          {ep.avg_response_time > ep.expected_response_time_ms && ep.total_executions > 0 && ` • Tempo médio: ${ep.avg_response_time}ms (SLA: ${ep.expected_response_time_ms}ms)`}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleOpenTest(ep)}>Testar</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input placeholder="Buscar por nome ou URL..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-10"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-[120px] h-10"><SelectValue placeholder="Método" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          {systems.length > 1 && (
            <Select value={systemFilter} onValueChange={setSystemFilter}>
              <SelectTrigger className="w-[160px] h-10"><SelectValue placeholder="Sistema" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {systems.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Endpoints Table */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Status</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-20">Método</TableHead>
                  <TableHead>Sistema</TableHead>
                  <TableHead className="text-right">Tempo Médio</TableHead>
                  <TableHead>Última Execução</TableHead>
                  <TableHead className="text-right">Sucesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto" /></TableCell></TableRow>
                ) : filteredEndpoints.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    {endpoints.length === 0 ? 'Nenhum endpoint cadastrado. Clique em "Novo Endpoint" para começar.' : 'Nenhum endpoint encontrado com os filtros selecionados.'}
                  </TableCell></TableRow>
                ) : filteredEndpoints.map(ep => (
                  <TableRow key={ep.id} className="hover:bg-muted/30">
                    <TableCell>{getStatusIcon(ep.status_indicator)}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{ep.name}</div>
                      {!ep.is_active && <Badge variant="outline" className="text-xs mt-1">Inativo</Badge>}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground font-mono max-w-[300px] truncate block">{ep.url}</span>
                    </TableCell>
                    <TableCell>{getMethodBadge(ep.method)}</TableCell>
                    <TableCell><span className="text-sm">{ep.system_origin}</span></TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-medium ${ep.avg_response_time > ep.expected_response_time_ms ? 'text-red-600' : 'text-foreground'}`}>
                        {ep.avg_response_time > 0 ? `${ep.avg_response_time}ms` : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {ep.last_execution ? (
                        <div className="flex items-center gap-2">
                          {getStatusBadge(ep.last_execution.status_code)}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(ep.last_execution.executed_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">Nunca</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {ep.total_executions > 0 ? (
                        <span className={`text-sm font-medium ${ep.success_rate >= 90 ? 'text-green-600' : ep.success_rate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {Math.round(ep.success_rate)}%
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Testar" onClick={() => handleOpenTest(ep)}>
                          <Play className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Logs" onClick={() => handleOpenLogs(ep)}>
                          <FileText className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => { setEditingEndpoint(ep); setIsEndpointModalOpen(true); }}>
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Excluir" onClick={() => handleDeleteEndpoint(ep.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Endpoint Create/Edit Modal */}
      <Dialog open={isEndpointModalOpen} onOpenChange={setIsEndpointModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEndpoint?.id ? 'Editar Endpoint' : 'Novo Endpoint'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={editingEndpoint?.name || ''} onChange={e => setEditingEndpoint(prev => ({ ...prev, name: e.target.value }))} placeholder="Ex: Verificar veículo" />
            </div>
            <div>
              <Label>URL *</Label>
              <Input value={editingEndpoint?.url || ''} onChange={e => setEditingEndpoint(prev => ({ ...prev, url: e.target.value }))} placeholder="https://api.example.com/endpoint" className="font-mono text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Método</Label>
                <Select value={editingEndpoint?.method || 'GET'} onValueChange={v => setEditingEndpoint(prev => ({ ...prev, method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sistema/Origem</Label>
                <Input value={editingEndpoint?.system_origin || ''} onChange={e => setEditingEndpoint(prev => ({ ...prev, system_origin: e.target.value }))} placeholder="Ex: Segware" />
              </div>
            </div>
            <div>
              <Label>Tempo esperado de resposta (ms)</Label>
              <Input type="number" value={editingEndpoint?.expected_response_time_ms || 5000} onChange={e => setEditingEndpoint(prev => ({ ...prev, expected_response_time_ms: parseInt(e.target.value) || 5000 }))} />
            </div>
            <div>
              <Label>Body padrão (JSON)</Label>
              <Textarea value={editingEndpoint?.default_body ? JSON.stringify(editingEndpoint.default_body, null, 2) : ''} onChange={e => { try { setEditingEndpoint(prev => ({ ...prev, default_body: e.target.value ? JSON.parse(e.target.value) : null })); } catch { /* ignore parse errors while typing */ } }} placeholder='{"key": "value"}' className="font-mono text-sm min-h-[80px]" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editingEndpoint?.is_active ?? true} onCheckedChange={v => setEditingEndpoint(prev => ({ ...prev, is_active: v }))} />
              <Label>Monitoramento ativo</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setIsEndpointModalOpen(false); setEditingEndpoint(null); }}>Cancelar</Button>
              <Button onClick={handleSaveEndpoint}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Modal */}
      <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-600" />
              Testar Endpoint: {selectedEndpoint?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto space-y-4">
            {/* Request Config */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <Select value={testMethod} onValueChange={setTestMethod}>
                  <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Input value={testUrl} onChange={e => setTestUrl(e.target.value)} className="font-mono text-sm flex-1" />
              </div>

              {/* Headers */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Headers</Label>
                <div className="space-y-2 mt-1">
                  {testHeaders.map((h, i) => (
                    <div key={i} className="flex gap-2">
                      <Input placeholder="Chave" value={h.key} onChange={e => { const n = [...testHeaders]; n[i].key = e.target.value; setTestHeaders(n); }} className="text-sm" />
                      <Input placeholder="Valor" value={h.value} onChange={e => { const n = [...testHeaders]; n[i].value = e.target.value; setTestHeaders(n); }} className="text-sm" />
                      <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0" onClick={() => setTestHeaders(testHeaders.filter((_, j) => j !== i))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setTestHeaders([...testHeaders, { key: '', value: '' }])}>
                    <Plus className="h-3 w-3 mr-1" /> Header
                  </Button>
                </div>
              </div>

              {/* Body */}
              {!['GET', 'HEAD'].includes(testMethod) && (
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Body (JSON)</Label>
                  <Textarea value={testBody} onChange={e => setTestBody(e.target.value)} placeholder='{"key": "value"}' className="font-mono text-sm min-h-[100px] mt-1" />
                </div>
              )}

              <Button onClick={handleExecuteTest} disabled={isTesting} className="w-full">
                {isTesting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                {isTesting ? 'Executando...' : 'Executar Requisição'}
              </Button>
            </div>

            {/* Result */}
            {testResult && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-4">
                  {getStatusBadge(testResult.status_code)}
                  <span className="text-sm text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {testResult.response_time_ms}ms
                  </span>
                </div>

                {testResult.error_message && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800 font-medium">Erro:</p>
                    <p className="text-sm text-red-700 mt-1">{testResult.error_message}</p>
                  </div>
                )}

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resposta</Label>
                  <ScrollArea className="h-[250px] mt-1">
                    <pre className="bg-muted/50 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap break-all border">
                      {formatResponseBody(testResult.response_body)}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Logs Modal */}
      <Dialog open={isLogsModalOpen} onOpenChange={setIsLogsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Logs: {selectedEndpoint?.name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum log encontrado</TableCell></TableRow>
                ) : logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.executed_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status_code)}</TableCell>
                    <TableCell className="text-right text-sm">{log.response_time_ms}ms</TableCell>
                    <TableCell className="text-sm text-red-600 max-w-[300px] truncate">
                      {log.error_message || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApiMonitoring;
