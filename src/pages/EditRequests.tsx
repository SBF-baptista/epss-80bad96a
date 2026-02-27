import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Check, 
  X, 
  Clock, 
  FileEdit, 
  Package, 
  Wrench,
  AlertCircle,
  CheckCircle2,
  XCircle,
  History,
  ArrowRight,
  Calendar,
  User,
  Box,
  ChevronDown,
  ChevronRight,
  Eye,
  Minus,
  Plus,
  AlertTriangle,
  Hash,
  Timer
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface EditRequest {
  id: string;
  item_type: string;
  item_name: string;
  original_data: Record<string, any>;
  requested_changes: Record<string, any>;
  reason: string | null;
  status: string;
  requested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  kit_id: string | null;
  created_at: string;
  updated_at: string;
  requester_email?: string;
}

// Helper to compute time elapsed
const getTimeAgo = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  if (diffHours > 0) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffMins > 0) return `Há ${diffMins} min`;
  return 'Agora';
};

// Compute item-level diff between original and new arrays
const computeItemDiff = (original: any[], updated: any[]) => {
  const origMap = new Map<string, number>();
  (original || []).forEach((i: any) => origMap.set(i.item_name, i.quantity || 1));
  const newMap = new Map<string, number>();
  (updated || []).forEach((i: any) => newMap.set(i.item_name, i.quantity || 1));

  const added: { name: string; qty: number }[] = [];
  const removed: { name: string; qty: number }[] = [];
  const modified: { name: string; oldQty: number; newQty: number }[] = [];
  const unchanged: { name: string; qty: number }[] = [];

  newMap.forEach((qty, name) => {
    if (!origMap.has(name)) {
      added.push({ name, qty });
    } else if (origMap.get(name) !== qty) {
      modified.push({ name, oldQty: origMap.get(name)!, newQty: qty });
    } else {
      unchanged.push({ name, qty });
    }
  });

  origMap.forEach((qty, name) => {
    if (!newMap.has(name)) {
      removed.push({ name, qty });
    }
  });

  return { added, removed, modified, unchanged, totalChanges: added.length + removed.length + modified.length };
};

const EditRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [filterType, setFilterType] = useState<string>("all");
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('item_edit_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const requestsWithEmail = await Promise.all(
        (data || []).map(async (request) => {
          if (request.requested_by) {
            const { data: userData } = await supabase
              .from('usuarios')
              .select('email')
              .eq('id', request.requested_by)
              .single();
            return { ...request, requester_email: userData?.email || null };
          }
          return { ...request, requester_email: null };
        })
      );

      setRequests(requestsWithEmail as EditRequest[]);
    } catch (error) {
      console.error('Error loading edit requests:', error);
      toast.error('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    const channel = supabase
      .channel('edit-requests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_edit_requests' }, () => loadRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- Business logic (unchanged) ---
  const applyChangesToItem = async (request: EditRequest) => {
    if (request.item_type === 'kit') return await applyChangesToKit(request);
    if (request.requested_changes?.action === 'delete') {
      const originalId = request.original_data?.id;
      if (!originalId) return false;
      try {
        const { error } = await supabase.from('kit_item_options').delete().eq('id', originalId);
        if (error) throw error;
        return true;
      } catch { return false; }
    }
    const originalId = request.original_data?.id;
    const newName = request.requested_changes?.item_name;
    if (!originalId || !newName) return false;
    try {
      const { error } = await supabase.from('kit_item_options').update({ item_name: newName }).eq('id', originalId);
      if (error) throw error;
      return true;
    } catch { return false; }
  };

  const applyChangesToKit = async (request: EditRequest) => {
    const kitId = request.kit_id || request.original_data?.id;
    const changes = request.requested_changes;
    if (!kitId || !changes) return false;
    try {
      if (changes.action === 'delete') {
        await supabase.from('kit_schedules').update({ kit_id: null }).eq('kit_id', kitId);
        await supabase.from('homologation_kit_accessories').delete().eq('kit_id', kitId);
        const { error } = await supabase.from('homologation_kits').delete().eq('id', kitId);
        if (error) throw error;
        return true;
      }
      const { error: kitError } = await supabase.from('homologation_kits').update({ name: changes.name, category: changes.category }).eq('id', kitId);
      if (kitError) throw kitError;
      await supabase.from('homologation_kit_accessories').delete().eq('kit_id', kitId);
      const allItems = [
        ...(changes.equipment || []).map((item: any) => ({ kit_id: kitId, item_name: item.item_name, item_type: 'equipment', quantity: item.quantity || 1 })),
        ...(changes.accessories || []).map((item: any) => ({ kit_id: kitId, item_name: item.item_name, item_type: 'accessory', quantity: item.quantity || 1 })),
        ...(changes.supplies || []).map((item: any) => ({ kit_id: kitId, item_name: item.item_name, item_type: 'supply', quantity: item.quantity || 1 })),
      ];
      if (allItems.length > 0) {
        const { error } = await supabase.from('homologation_kit_accessories').insert(allItems);
        if (error) throw error;
      }
      return true;
    } catch { return false; }
  };

  const handleApprove = async (request: EditRequest) => {
    setProcessingId(request.id);
    try {
      const applied = await applyChangesToItem(request);
      if (!applied) { toast.error('Erro ao aplicar alterações no item'); return; }
      const { error } = await supabase.from('item_edit_requests').update({
        status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString(), review_notes: reviewNotes || null
      }).eq('id', request.id);
      if (error) throw error;
      toast.success('Solicitação aprovada com sucesso');
      setSelectedRequest(null);
      setReviewNotes("");
      setConfirmAction(null);
      loadRequests();
    } catch { toast.error('Erro ao aprovar solicitação'); } 
    finally { setProcessingId(null); }
  };

  const handleReject = async (request: EditRequest) => {
    if (!reviewNotes.trim()) {
      toast.error('Informe o motivo da rejeição');
      return;
    }
    setProcessingId(request.id);
    try {
      const { error } = await supabase.from('item_edit_requests').update({
        status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString(), review_notes: reviewNotes || null
      }).eq('id', request.id);
      if (error) throw error;
      toast.success('Solicitação rejeitada');
      setSelectedRequest(null);
      setReviewNotes("");
      setConfirmAction(null);
      loadRequests();
    } catch { toast.error('Erro ao rejeitar solicitação'); }
    finally { setProcessingId(null); }
  };

  // --- Filtered lists ---
  const pendingRequests = useMemo(() => {
    let list = requests.filter(r => r.status === 'pending');
    if (filterType !== 'all') list = list.filter(r => r.item_type === filterType);
    return list;
  }, [requests, filterType]);

  const historyRequests = useMemo(() => {
    let list = requests.filter(r => r.status !== 'pending');
    if (filterType !== 'all') list = list.filter(r => r.item_type === filterType);
    return list;
  }, [requests, filterType]);

  const totalPending = requests.filter(r => r.status === 'pending').length;

  // --- Badge helpers ---
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-medium"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-medium"><CheckCircle2 className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 font-medium"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getItemTypeBadge = (type: string) => {
    if (type === 'kit') return <Badge variant="secondary" className="bg-violet-100 text-violet-800"><Box className="h-3 w-3 mr-1" />Kit</Badge>;
    if (type === 'accessory') return <Badge variant="secondary" className="bg-sky-100 text-sky-800"><Package className="h-3 w-3 mr-1" />Acessório</Badge>;
    return <Badge variant="secondary" className="bg-orange-100 text-orange-800"><Wrench className="h-3 w-3 mr-1" />Insumo</Badge>;
  };

  // --- Compute change summary for kit cards ---
  const getKitChangeSummary = (request: EditRequest) => {
    if (request.item_type !== 'kit' || request.requested_changes?.action === 'delete') return null;
    const eqDiff = computeItemDiff(request.original_data?.equipment, request.requested_changes?.equipment);
    const accDiff = computeItemDiff(request.original_data?.accessories, request.requested_changes?.accessories);
    const supDiff = computeItemDiff(request.original_data?.supplies, request.requested_changes?.supplies);
    return { eqDiff, accDiff, supDiff };
  };

  const getDisplayName = (request: EditRequest) => {
    if (request.item_type === 'kit') {
      return request.requested_changes?.action === 'delete' ? request.original_data?.name || request.item_name : request.original_data?.name || request.item_name;
    }
    return request.original_data?.item_name || request.item_name;
  };

  const getNewName = (request: EditRequest) => {
    if (request.item_type === 'kit') return request.requested_changes?.name;
    return request.requested_changes?.item_name;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // --- REQUEST CARD ---
  const renderRequestCard = (request: EditRequest, showActions: boolean) => {
    const isDelete = request.requested_changes?.action === 'delete';
    const originalName = getDisplayName(request);
    const newName = getNewName(request);
    const nameChanged = !isDelete && newName && newName !== originalName;
    const changeSummary = getKitChangeSummary(request);

    return (
      <Card key={request.id} className="border border-border/60 hover:shadow-md transition-shadow rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Top accent bar */}
          <div className={`h-1 ${request.status === 'pending' ? 'bg-amber-400' : request.status === 'approved' ? 'bg-emerald-400' : 'bg-red-400'}`} />
          
          <div className="p-5 space-y-3">
            {/* Line 1: Name change + badges */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {getItemTypeBadge(request.item_type)}
                  {getStatusBadge(request.status)}
                  {isDelete && (
                    <Badge variant="destructive" className="text-xs">
                      <Minus className="h-3 w-3 mr-0.5" />
                      Exclusão
                    </Badge>
                  )}
                </div>

                {isDelete ? (
                  <p className="font-semibold text-base text-destructive line-through">{originalName}</p>
                ) : nameChanged ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm line-through text-muted-foreground">{originalName}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="font-semibold text-base text-foreground">{newName}</span>
                  </div>
                ) : (
                  <p className="font-semibold text-base text-foreground">{originalName}</p>
                )}
              </div>

              {showActions && (
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => { setSelectedRequest(request); setReviewNotes(""); }}>
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Revisar
                  </Button>
                </div>
              )}
            </div>

            {/* Line 2: Change summary for kits */}
            {changeSummary && (
              <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                {changeSummary.eqDiff.totalChanges > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted">
                    <Wrench className="h-3 w-3" />
                    Equip: {changeSummary.eqDiff.totalChanges} alteração(ões)
                  </span>
                )}
                {changeSummary.accDiff.totalChanges > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted">
                    <Package className="h-3 w-3" />
                    Acess: {changeSummary.accDiff.totalChanges} alteração(ões)
                  </span>
                )}
                {changeSummary.supDiff.totalChanges > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted">
                    <Box className="h-3 w-3" />
                    Insumos: {changeSummary.supDiff.totalChanges} alteração(ões)
                  </span>
                )}
              </div>
            )}

            {/* Reason preview */}
            {request.reason && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 line-clamp-2">
                <strong>Justificativa:</strong> {request.reason}
              </p>
            )}

            {/* Footer: requester, date, time waiting */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/40 flex-wrap">
              {request.requester_email && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{request.requester_email}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(request.created_at).toLocaleDateString('pt-BR')} {new Date(request.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              {request.status === 'pending' && (
                <div className="flex items-center gap-1 text-amber-600 font-medium">
                  <Timer className="h-3 w-3" />
                  {getTimeAgo(request.created_at)}
                </div>
              )}
              {request.reviewed_at && (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Revisado em {new Date(request.reviewed_at).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>

            {/* Action buttons at bottom for pending */}
            {showActions && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                  onClick={() => { setSelectedRequest(request); setReviewNotes(""); setConfirmAction('approve'); }}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 flex-1"
                  onClick={() => { setSelectedRequest(request); setReviewNotes(""); setConfirmAction('reject'); }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Rejeitar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // --- REVIEW DIALOG item diff section ---
  const renderDiffSection = (label: string, icon: React.ReactNode, original: any[], updated: any[], defaultOpen = true) => {
    const diff = computeItemDiff(original, updated);
    if (diff.totalChanges === 0 && diff.unchanged.length === 0) return null;

    return (
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group">
          <div className="flex items-center gap-2 text-sm font-medium">
            {icon}
            {label}
            {diff.totalChanges > 0 && (
              <Badge variant="secondary" className="text-xs h-5">{diff.totalChanges} alteração(ões)</Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-1">
          {diff.removed.map((item, i) => (
            <div key={`r-${i}`} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-md text-sm">
              <Minus className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <span className="text-red-800 line-through flex-1">{item.name}</span>
              <span className="text-red-600 text-xs">{item.qty}x</span>
            </div>
          ))}
          {diff.added.map((item, i) => (
            <div key={`a-${i}`} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-md text-sm">
              <Plus className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="text-emerald-800 font-medium flex-1">{item.name}</span>
              <span className="text-emerald-600 text-xs">{item.qty}x</span>
            </div>
          ))}
          {diff.modified.map((item, i) => (
            <div key={`m-${i}`} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md text-sm">
              <ArrowRight className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="text-amber-800 flex-1">{item.name}</span>
              <span className="text-amber-600 text-xs">{item.oldQty}x → {item.newQty}x</span>
            </div>
          ))}
          {diff.unchanged.length > 0 && diff.totalChanges > 0 && (
            <div className="text-xs text-muted-foreground px-3 py-1">
              + {diff.unchanged.length} item(ns) sem alteração
            </div>
          )}
          {diff.totalChanges === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-1 italic">Sem alterações</p>
          )}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileEdit className="h-6 w-6 text-primary" />
            Solicitações de Edição
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aprovar ou rejeitar solicitações de alteração em kits, acessórios e insumos
          </p>
        </div>
        {totalPending > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <span className="text-lg font-bold text-amber-700">{totalPending}</span>
            <span className="text-sm text-amber-600">pendente{totalPending > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="kit">Kit</SelectItem>
            <SelectItem value="accessory">Acessório</SelectItem>
            <SelectItem value="supply">Insumo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted p-1 rounded-xl">
          <TabsTrigger value="pending" className="h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Pendentes
            {totalPending > 0 && <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5">{totalPending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history" className="h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
            {historyRequests.length > 0 && <span className="text-xs text-muted-foreground ml-1">({historyRequests.length})</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {pendingRequests.length > 0 ? (
            <div className="grid gap-4">
              {pendingRequests.map((r) => renderRequestCard(r, true))}
            </div>
          ) : (
            <Card className="rounded-xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação pendente</h3>
                <p className="text-muted-foreground text-center text-sm">Todas as solicitações foram processadas.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-6">
          {historyRequests.length > 0 ? (
            <div className="grid gap-4">
              {historyRequests.map((r) => renderRequestCard(r, false))}
            </div>
          ) : (
            <Card className="rounded-xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum histórico</h3>
                <p className="text-muted-foreground text-center text-sm">O histórico aparecerá aqui.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ====== REVIEW DIALOG ====== */}
      <Dialog open={!!selectedRequest && !confirmAction} onOpenChange={(open) => { if (!open) { setSelectedRequest(null); setReviewNotes(""); } }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileEdit className="h-5 w-5 text-primary" />
              Revisar Solicitação
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <>
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-5 py-2">
                  {/* Audit info */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                      <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Nº Solicitação</span>
                        <p className="font-mono font-medium text-foreground">{selectedRequest.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Solicitante</span>
                        <p className="font-medium text-foreground">{selectedRequest.requester_email || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Data</span>
                        <p className="font-medium text-foreground">
                          {new Date(selectedRequest.created_at).toLocaleDateString('pt-BR')} {new Date(selectedRequest.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                      {getItemTypeBadge(selectedRequest.item_type)}
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                  </div>

                  <Separator />

                  {/* Kit changes */}
                  {selectedRequest.item_type === 'kit' ? (
                    <div className="space-y-4">
                      {selectedRequest.requested_changes?.action === 'delete' ? (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 text-red-700 font-semibold">
                            <AlertTriangle className="h-5 w-5" />
                            Solicitação de Exclusão
                          </div>
                          <p className="text-sm text-red-600">
                            O kit <strong>"{selectedRequest.original_data?.name}"</strong> será permanentemente removido.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Name change */}
                          {selectedRequest.original_data?.name !== selectedRequest.requested_changes?.name && (
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nome do Kit</Label>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 line-through">
                                  {selectedRequest.original_data?.name}
                                </span>
                                <ArrowRight className="h-4 w-4 text-primary" />
                                <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 font-semibold">
                                  {selectedRequest.requested_changes?.name}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Category change */}
                          {selectedRequest.original_data?.category !== selectedRequest.requested_changes?.category && (
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Tipo</Label>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                                  {selectedRequest.original_data?.category || 'Nenhum'}
                                </span>
                                <ArrowRight className="h-4 w-4 text-primary" />
                                <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 font-medium">
                                  {selectedRequest.requested_changes?.category || 'Nenhum'}
                                </span>
                              </div>
                            </div>
                          )}

                          <Separator />

                          {/* Item diffs */}
                          {renderDiffSection(
                            'Equipamentos',
                            <Wrench className="h-4 w-4" />,
                            selectedRequest.original_data?.equipment || [],
                            selectedRequest.requested_changes?.equipment || []
                          )}
                          {renderDiffSection(
                            'Acessórios',
                            <Package className="h-4 w-4" />,
                            selectedRequest.original_data?.accessories || [],
                            selectedRequest.requested_changes?.accessories || []
                          )}
                          {renderDiffSection(
                            'Insumos',
                            <Box className="h-4 w-4" />,
                            selectedRequest.original_data?.supplies || [],
                            selectedRequest.requested_changes?.supplies || []
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    /* Accessory/Supply change */
                    selectedRequest.requested_changes?.action === 'delete' ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
                          <AlertTriangle className="h-5 w-5" />
                          Solicitação de Exclusão
                        </div>
                        <p className="text-sm text-red-600">
                          O item <strong>"{selectedRequest.original_data?.item_name}"</strong> será removido do catálogo.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nome</Label>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 line-through">
                            {selectedRequest.original_data?.item_name}
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                          <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 font-semibold">
                            {selectedRequest.requested_changes?.item_name}
                          </span>
                        </div>
                      </div>
                    )
                  )}

                  {/* Reason */}
                  {selectedRequest.reason && (
                    <>
                      <Separator />
                      <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
                        <p className="text-sm">
                          <strong className="text-sky-800">Justificativa do solicitante:</strong>{' '}
                          <span className="text-sky-700">{selectedRequest.reason}</span>
                        </p>
                      </div>
                    </>
                  )}

                  {/* Review notes */}
                  {selectedRequest.status === 'pending' && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Observações da revisão
                          <span className="text-xs text-muted-foreground ml-1">(obrigatório para rejeição)</span>
                        </Label>
                        <Textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Adicione observações sobre a decisão..."
                          rows={3}
                        />
                      </div>
                    </>
                  )}

                  {/* Previous review notes for history */}
                  {selectedRequest.review_notes && selectedRequest.status !== 'pending' && (
                    <>
                      <Separator />
                      <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
                        <p className="text-sm">
                          <strong className="text-violet-800">Observação do revisor:</strong>{' '}
                          <span className="text-violet-700">{selectedRequest.review_notes}</span>
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>

              {/* Fixed footer buttons */}
              {selectedRequest.status === 'pending' && (
                <DialogFooter className="shrink-0 gap-2 border-t pt-4">
                  <Button variant="outline" onClick={() => { setSelectedRequest(null); setReviewNotes(""); }}>
                    Fechar
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => setConfirmAction('reject')}
                    disabled={processingId === selectedRequest.id}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Rejeitar
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setConfirmAction('approve')}
                    disabled={processingId === selectedRequest.id}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Aprovar
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ====== CONFIRM APPROVE DIALOG ====== */}
      <AlertDialog open={confirmAction === 'approve' && !!selectedRequest} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Aprovação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja aprovar esta solicitação? As alterações serão aplicadas imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => selectedRequest && handleApprove(selectedRequest)}
              disabled={processingId === selectedRequest?.id}
            >
              Confirmar Aprovação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ====== CONFIRM REJECT DIALOG ====== */}
      <AlertDialog open={confirmAction === 'reject' && !!selectedRequest} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição. Isso é obrigatório.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Motivo da rejeição..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => selectedRequest && handleReject(selectedRequest)}
              disabled={!reviewNotes.trim() || processingId === selectedRequest?.id}
            >
              Confirmar Rejeição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EditRequests;
