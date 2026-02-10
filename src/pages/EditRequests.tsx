import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Box
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

const EditRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pending");

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('item_edit_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch requester emails for each request
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

    // Subscribe to real-time updates
    const channel = supabase
      .channel('edit-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'item_edit_requests'
        },
        () => loadRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const applyChangesToItem = async (request: EditRequest) => {
    // Handle kit type
    if (request.item_type === 'kit') {
      return await applyChangesToKit(request);
    }
    
    // Handle delete action
    if (request.requested_changes?.action === 'delete') {
      const originalId = request.original_data?.id;
      if (!originalId) {
        console.error('Missing ID for deletion');
        return false;
      }
      
      try {
        const { error } = await supabase
          .from('kit_item_options')
          .delete()
          .eq('id', originalId);

        if (error) throw error;
        return true;
      } catch (error) {
        console.error('Error deleting item:', error);
        return false;
      }
    }
    
    // Handle accessory/supply rename type
    const originalId = request.original_data?.id;
    const newName = request.requested_changes?.item_name;

    if (!originalId || !newName) {
      console.error('Missing data for applying changes:', { originalId, newName });
      return false;
    }

    try {
      const { error } = await supabase
        .from('kit_item_options')
        .update({ item_name: newName })
        .eq('id', originalId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error applying changes to item:', error);
      return false;
    }
  };

  const applyChangesToKit = async (request: EditRequest) => {
    const kitId = request.kit_id || request.original_data?.id;
    const changes = request.requested_changes;

    if (!kitId || !changes) {
      console.error('Missing data for applying kit changes:', { kitId, changes });
      return false;
    }

    try {
      // Handle kit deletion
      if (changes.action === 'delete') {
        // 1. Unlink kit_schedules referencing this kit
        const { error: unlinkError } = await supabase
          .from('kit_schedules')
          .update({ kit_id: null })
          .eq('kit_id', kitId);
        if (unlinkError) console.error('Error unlinking kit_schedules:', unlinkError);

        // 2. Delete kit accessories/items
        const { error: deleteItemsError } = await supabase
          .from('homologation_kit_accessories')
          .delete()
          .eq('kit_id', kitId);
        if (deleteItemsError) console.error('Error deleting kit items:', deleteItemsError);

        // 3. Delete the kit itself
        const { error: deleteKitError } = await supabase
          .from('homologation_kits')
          .delete()
          .eq('id', kitId);
        if (deleteKitError) throw deleteKitError;

        return true;
      }

      // Update the kit basic info
      const { error: kitError } = await supabase
        .from('homologation_kits')
        .update({ 
          name: changes.name,
          category: changes.category
        })
        .eq('id', kitId);

      if (kitError) throw kitError;

      // Delete existing kit items
      const { error: deleteError } = await supabase
        .from('homologation_kit_accessories')
        .delete()
        .eq('kit_id', kitId);

      if (deleteError) throw deleteError;

      // Insert new items
      const allItems = [
        ...(changes.equipment || []).map((item: any) => ({
          kit_id: kitId,
          item_name: item.item_name,
          item_type: 'equipment',
          quantity: item.quantity || 1
        })),
        ...(changes.accessories || []).map((item: any) => ({
          kit_id: kitId,
          item_name: item.item_name,
          item_type: 'accessory',
          quantity: item.quantity || 1
        })),
        ...(changes.supplies || []).map((item: any) => ({
          kit_id: kitId,
          item_name: item.item_name,
          item_type: 'supply',
          quantity: item.quantity || 1
        }))
      ];

      if (allItems.length > 0) {
        const { error: insertError } = await supabase
          .from('homologation_kit_accessories')
          .insert(allItems);

        if (insertError) throw insertError;
      }

      return true;
    } catch (error) {
      console.error('Error applying changes to kit:', error);
      return false;
    }
  };

  const handleApprove = async (request: EditRequest) => {
    setProcessingId(request.id);
    try {
      // First, apply the changes to the item
      const applied = await applyChangesToItem(request);
      
      if (!applied) {
        toast.error('Erro ao aplicar alterações no item');
        return;
      }

      // Then update the request status
      const { error } = await supabase
        .from('item_edit_requests')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null
        })
        .eq('id', request.id);

      if (error) throw error;
      
      const isDeleteRequest = request.requested_changes?.action === 'delete';
      const successMessage = request.item_type === 'kit'
        ? `O kit "${request.requested_changes?.name}" foi atualizado com sucesso`
        : isDeleteRequest
        ? `O item "${request.original_data?.item_name}" foi excluído com sucesso`
        : `O item foi renomeado para "${request.requested_changes?.item_name}"`;
      
      toast.success('Solicitação aprovada com sucesso', {
        description: successMessage
      });
      setSelectedRequest(null);
      setReviewNotes("");
      loadRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Erro ao aprovar solicitação');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: EditRequest) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from('item_edit_requests')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Solicitação rejeitada');
      setSelectedRequest(null);
      setReviewNotes("");
      loadRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Erro ao rejeitar solicitação');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aprovado
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getItemTypeBadge = (type: string) => {
    if (type === 'kit') {
      return (
        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
          <Box className="h-3 w-3 mr-1" />
          Kit
        </Badge>
      );
    }
    return type === 'accessory' ? (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
        <Package className="h-3 w-3 mr-1" />
        Acessório
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
        <Wrench className="h-3 w-3 mr-1" />
        Insumo
      </Badge>
    );
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const historyRequests = requests.filter(r => r.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderRequestCard = (request: EditRequest, showActions: boolean = false) => (
    <Card 
      key={request.id} 
      className={`border-l-4 ${
        request.status === 'pending' 
          ? 'border-l-yellow-500' 
          : request.status === 'approved'
          ? 'border-l-green-500'
          : 'border-l-red-500'
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-base flex items-center gap-2">
              {request.item_name}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {getItemTypeBadge(request.item_type)}
              {getStatusBadge(request.status)}
            </div>
          </div>
          {showActions && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => setSelectedRequest(request)}
              >
                <Check className="h-4 w-4 mr-1" />
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setSelectedRequest(request)}
              >
                <X className="h-4 w-4 mr-1" />
                Rejeitar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Alteração Solicitada */}
        <div className="mb-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            Alteração Solicitada
          </h4>
          
          {request.item_type === 'kit' ? (
            // Kit-specific changes display
            <div className="space-y-3">
              {/* Name change */}
              {request.original_data?.name !== request.requested_changes?.name && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-muted-foreground w-20">Nome:</span>
                  <div className="px-2 py-1 bg-red-100 border border-red-200 rounded text-sm">
                    <span className="text-red-800">{request.original_data?.name}</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <div className="px-2 py-1 bg-green-100 border border-green-200 rounded text-sm">
                    <span className="text-green-800">{request.requested_changes?.name}</span>
                  </div>
                </div>
              )}
              
              {/* Category change */}
              {request.original_data?.category !== request.requested_changes?.category && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-muted-foreground w-20">Tipo:</span>
                  <div className="px-2 py-1 bg-red-100 border border-red-200 rounded text-sm">
                    <span className="text-red-800">{request.original_data?.category || 'Nenhum'}</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <div className="px-2 py-1 bg-green-100 border border-green-200 rounded text-sm">
                    <span className="text-green-800">{request.requested_changes?.category || 'Nenhum'}</span>
                  </div>
                </div>
              )}

              {/* Equipment changes */}
              {request.requested_changes?.equipment && (
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Equipamentos:</span>
                  <div className="text-xs text-muted-foreground">
                    {request.requested_changes.equipment.map((e: any, i: number) => (
                      <span key={i} className="inline-block px-2 py-0.5 bg-muted rounded mr-1 mb-1">
                        {e.item_name} ({e.quantity}x)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Accessories changes */}
              {request.requested_changes?.accessories && request.requested_changes.accessories.length > 0 && (
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Acessórios:</span>
                  <div className="text-xs text-muted-foreground">
                    {request.requested_changes.accessories.map((a: any, i: number) => (
                      <span key={i} className="inline-block px-2 py-0.5 bg-muted rounded mr-1 mb-1">
                        {a.item_name} ({a.quantity}x)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Supplies changes */}
              {request.requested_changes?.supplies && request.requested_changes.supplies.length > 0 && (
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Insumos:</span>
                  <div className="text-xs text-muted-foreground">
                    {request.requested_changes.supplies.map((s: any, i: number) => (
                      <span key={i} className="inline-block px-2 py-0.5 bg-muted rounded mr-1 mb-1">
                        {s.item_name} ({s.quantity}x)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : request.requested_changes?.action === 'delete' ? (
            // Delete action display
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-3 py-2 bg-red-100 border border-red-200 rounded-md">
                <span className="text-xs text-red-600 block mb-1">Excluir:</span>
                <span className="font-medium text-red-800">{request.original_data?.item_name}</span>
              </div>
              <Badge variant="destructive" className="flex items-center gap-1">
                <X className="h-3 w-3" />
                Solicitação de Exclusão
              </Badge>
            </div>
          ) : (
            // Accessory/Supply simple change display
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-3 py-2 bg-red-100 border border-red-200 rounded-md">
                <span className="text-xs text-red-600 block mb-1">De:</span>
                <span className="font-medium text-red-800">{request.original_data?.item_name}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="px-3 py-2 bg-green-100 border border-green-200 rounded-md">
                <span className="text-xs text-green-600 block mb-1">Para:</span>
                <span className="font-medium text-green-800">{request.requested_changes?.item_name}</span>
              </div>
            </div>
          )}
        </div>
        
        {request.reason && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm">
              <strong className="text-blue-800">Justificativa:</strong>{' '}
              <span className="text-blue-700">{request.reason}</span>
            </p>
          </div>
        )}

        {request.review_notes && request.status !== 'pending' && (
          <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
            <p className="text-sm">
              <strong className="text-purple-800">Observação do revisor:</strong>{' '}
              <span className="text-purple-700">{request.review_notes}</span>
            </p>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t flex-wrap">
          {request.requester_email && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="font-medium">{request.requester_email}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Solicitado em {new Date(request.created_at).toLocaleDateString('pt-BR')} às{' '}
            {new Date(request.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          {request.reviewed_at && (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Revisado em {new Date(request.reviewed_at).toLocaleDateString('pt-BR')} às{' '}
              {new Date(request.reviewed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileEdit className="h-6 w-6" />
            Solicitações de Edição
          </h1>
          <p className="text-muted-foreground mt-1">
            Aprovar ou rejeitar solicitações de alteração em kits, acessórios e insumos
          </p>
        </div>
        {pendingRequests.length > 0 && (
          <Badge variant="destructive" className="text-lg px-3 py-1">
            {pendingRequests.length} pendente{pendingRequests.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted p-1 rounded-lg">
          <TabsTrigger 
            value="pending" 
            className="h-10 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            Pendentes
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="history"
            className="h-10 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            Histórico
            {historyRequests.length > 0 && (
              <span className="text-xs text-muted-foreground ml-1">
                ({historyRequests.length})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {pendingRequests.length > 0 ? (
            <div className="grid gap-4">
              {pendingRequests.map((request) => renderRequestCard(request, true))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação pendente</h3>
                <p className="text-muted-foreground text-center">
                  Todas as solicitações foram processadas.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-6">
          {historyRequests.length > 0 ? (
            <div className="grid gap-4">
              {historyRequests.map((request) => renderRequestCard(request, false))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum histórico</h3>
                <p className="text-muted-foreground text-center">
                  O histórico de solicitações aprovadas e rejeitadas aparecerá aqui.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5" />
              Revisar Solicitação
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 flex-wrap">
              {selectedRequest && getItemTypeBadge(selectedRequest.item_type)}
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <h4 className="text-sm font-semibold mb-3">Alteração Solicitada</h4>
              
              {selectedRequest?.item_type === 'kit' ? (
                // Kit changes display
                <div className="space-y-3">
                  {/* Name change */}
                  {selectedRequest.original_data?.name !== selectedRequest.requested_changes?.name && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-medium text-muted-foreground w-20">Nome:</span>
                      <div className="px-2 py-1 bg-red-100 border border-red-200 rounded text-sm">
                        <span className="text-red-800">{selectedRequest.original_data?.name}</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <div className="px-2 py-1 bg-green-100 border border-green-200 rounded text-sm">
                        <span className="text-green-800">{selectedRequest.requested_changes?.name}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Category change */}
                  {selectedRequest.original_data?.category !== selectedRequest.requested_changes?.category && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-medium text-muted-foreground w-20">Tipo:</span>
                      <div className="px-2 py-1 bg-red-100 border border-red-200 rounded text-sm">
                        <span className="text-red-800">{selectedRequest.original_data?.category || 'Nenhum'}</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <div className="px-2 py-1 bg-green-100 border border-green-200 rounded text-sm">
                        <span className="text-green-800">{selectedRequest.requested_changes?.category || 'Nenhum'}</span>
                      </div>
                    </div>
                  )}

                  {/* Equipment - Original vs New */}
                  {selectedRequest.requested_changes?.equipment && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-muted-foreground">Equipamentos:</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-red-50 border border-red-200 rounded">
                          <span className="text-xs text-red-600 block mb-1">Original:</span>
                          <div className="text-xs">
                            {(selectedRequest.original_data?.equipment || []).map((e: any, i: number) => (
                              <span key={i} className="inline-block px-1.5 py-0.5 bg-red-100 rounded mr-1 mb-1 text-red-800">
                                {e.item_name} ({e.quantity}x)
                              </span>
                            ))}
                            {(!selectedRequest.original_data?.equipment || selectedRequest.original_data.equipment.length === 0) && (
                              <span className="text-red-400 italic">Nenhum</span>
                            )}
                          </div>
                        </div>
                        <div className="p-2 bg-green-50 border border-green-200 rounded">
                          <span className="text-xs text-green-600 block mb-1">Novo:</span>
                          <div className="text-xs">
                            {selectedRequest.requested_changes.equipment.map((e: any, i: number) => (
                              <span key={i} className="inline-block px-1.5 py-0.5 bg-green-100 rounded mr-1 mb-1 text-green-800">
                                {e.item_name} ({e.quantity}x)
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Accessories - Original vs New */}
                  {(selectedRequest.requested_changes?.accessories?.length > 0 || selectedRequest.original_data?.accessories?.length > 0) && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-muted-foreground">Acessórios:</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-red-50 border border-red-200 rounded">
                          <span className="text-xs text-red-600 block mb-1">Original:</span>
                          <div className="text-xs">
                            {(selectedRequest.original_data?.accessories || []).map((a: any, i: number) => (
                              <span key={i} className="inline-block px-1.5 py-0.5 bg-red-100 rounded mr-1 mb-1 text-red-800">
                                {a.item_name} ({a.quantity}x)
                              </span>
                            ))}
                            {(!selectedRequest.original_data?.accessories || selectedRequest.original_data.accessories.length === 0) && (
                              <span className="text-red-400 italic">Nenhum</span>
                            )}
                          </div>
                        </div>
                        <div className="p-2 bg-green-50 border border-green-200 rounded">
                          <span className="text-xs text-green-600 block mb-1">Novo:</span>
                          <div className="text-xs">
                            {(selectedRequest.requested_changes?.accessories || []).map((a: any, i: number) => (
                              <span key={i} className="inline-block px-1.5 py-0.5 bg-green-100 rounded mr-1 mb-1 text-green-800">
                                {a.item_name} ({a.quantity}x)
                              </span>
                            ))}
                            {(!selectedRequest.requested_changes?.accessories || selectedRequest.requested_changes.accessories.length === 0) && (
                              <span className="text-green-400 italic">Nenhum</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Supplies - Original vs New */}
                  {(selectedRequest.requested_changes?.supplies?.length > 0 || selectedRequest.original_data?.supplies?.length > 0) && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-muted-foreground">Insumos:</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-red-50 border border-red-200 rounded">
                          <span className="text-xs text-red-600 block mb-1">Original:</span>
                          <div className="text-xs">
                            {(selectedRequest.original_data?.supplies || []).map((s: any, i: number) => (
                              <span key={i} className="inline-block px-1.5 py-0.5 bg-red-100 rounded mr-1 mb-1 text-red-800">
                                {s.item_name} ({s.quantity}x)
                              </span>
                            ))}
                            {(!selectedRequest.original_data?.supplies || selectedRequest.original_data.supplies.length === 0) && (
                              <span className="text-red-400 italic">Nenhum</span>
                            )}
                          </div>
                        </div>
                        <div className="p-2 bg-green-50 border border-green-200 rounded">
                          <span className="text-xs text-green-600 block mb-1">Novo:</span>
                          <div className="text-xs">
                            {(selectedRequest.requested_changes?.supplies || []).map((s: any, i: number) => (
                              <span key={i} className="inline-block px-1.5 py-0.5 bg-green-100 rounded mr-1 mb-1 text-green-800">
                                {s.item_name} ({s.quantity}x)
                              </span>
                            ))}
                            {(!selectedRequest.requested_changes?.supplies || selectedRequest.requested_changes.supplies.length === 0) && (
                              <span className="text-green-400 italic">Nenhum</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Accessory/Supply simple change display
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="px-3 py-2 bg-red-100 border border-red-200 rounded-md">
                    <span className="text-xs text-red-600 block mb-1">De:</span>
                    <span className="font-medium text-red-800">{selectedRequest?.original_data?.item_name}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="px-3 py-2 bg-green-100 border border-green-200 rounded-md">
                    <span className="text-xs text-green-600 block mb-1">Para:</span>
                    <span className="font-medium text-green-800">{selectedRequest?.requested_changes?.item_name}</span>
                  </div>
                </div>
              )}
            </div>

            {selectedRequest?.reason && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm">
                  <strong className="text-blue-800">Justificativa:</strong>{' '}
                  <span className="text-blue-700">{selectedRequest.reason}</span>
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Adicione observações sobre a decisão..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setReviewNotes("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRequest && handleReject(selectedRequest)}
              disabled={processingId === selectedRequest?.id}
            >
              <X className="h-4 w-4 mr-1" />
              Rejeitar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => selectedRequest && handleApprove(selectedRequest)}
              disabled={processingId === selectedRequest?.id}
            >
              <Check className="h-4 w-4 mr-1" />
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditRequests;
