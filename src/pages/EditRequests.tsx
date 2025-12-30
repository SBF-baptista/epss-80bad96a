import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Check, 
  X, 
  Clock, 
  FileEdit, 
  Package, 
  User,
  AlertCircle,
  CheckCircle2,
  XCircle
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
}

const EditRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('item_edit_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as EditRequest[]) || []);
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

  const handleApprove = async (request: EditRequest) => {
    setProcessingId(request.id);
    try {
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

      // TODO: Apply the actual changes to the kit items here
      
      toast.success('Solicitação aprovada com sucesso');
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
    return type === 'accessory' ? (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
        <Package className="h-3 w-3 mr-1" />
        Acessório
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
        <Package className="h-3 w-3 mr-1" />
        Insumo
      </Badge>
    );
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileEdit className="h-6 w-6" />
            Solicitações de Edição
          </h1>
          <p className="text-muted-foreground mt-1">
            Aprovar ou rejeitar solicitações de alteração em acessórios e insumos
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-lg px-3 py-1">
            {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Aguardando Aprovação ({pendingRequests.length})
          </h2>
          <div className="grid gap-4">
            {pendingRequests.map((request) => (
              <Card key={request.id} className="border-l-4 border-l-yellow-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        {request.item_name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {getItemTypeBadge(request.item_type)}
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
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
                        onClick={() => {
                          setSelectedRequest(request);
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {request.reason && (
                    <div className="mb-3 p-3 bg-muted/50 rounded-md">
                      <p className="text-sm">
                        <strong>Motivo:</strong> {request.reason}
                      </p>
                    </div>
                  )}
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <h4 className="text-sm font-semibold text-red-800 mb-2">Dados Originais</h4>
                      <pre className="text-xs text-red-700 whitespace-pre-wrap">
                        {JSON.stringify(request.original_data, null, 2)}
                      </pre>
                    </div>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <h4 className="text-sm font-semibold text-green-800 mb-2">Alterações Solicitadas</h4>
                      <pre className="text-xs text-green-700 whitespace-pre-wrap">
                        {JSON.stringify(request.requested_changes, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground">
                    Solicitado em {new Date(request.created_at).toLocaleDateString('pt-BR')} às {new Date(request.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Histórico de Solicitações</h2>
          <div className="grid gap-4">
            {processedRequests.map((request) => (
              <Card key={request.id} className="opacity-75">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        {request.item_name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {getItemTypeBadge(request.item_type)}
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {request.review_notes && (
                    <div className="mb-3 p-3 bg-muted/50 rounded-md">
                      <p className="text-sm">
                        <strong>Observação do revisor:</strong> {request.review_notes}
                      </p>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Revisado em {request.reviewed_at ? new Date(request.reviewed_at).toLocaleDateString('pt-BR') : 'N/A'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileEdit className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação</h3>
            <p className="text-muted-foreground text-center">
              Não há solicitações de edição de acessórios ou insumos no momento.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisar Solicitação</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <strong>Item:</strong> {selectedRequest?.item_name}
            </div>
            {selectedRequest?.reason && (
              <div>
                <strong>Motivo:</strong> {selectedRequest.reason}
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Adicione observações sobre a decisão..."
                className="mt-1"
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
