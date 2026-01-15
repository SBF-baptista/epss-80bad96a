import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { fetchKitItemOptions, deleteKitItemOption } from "@/services/kitItemOptionsService";
import { Trash2, Wrench, FileText, ChevronDown, Search, Pencil } from "lucide-react";
import { useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EditRequestModal } from "./EditRequestModal";
import { supabase } from "@/integrations/supabase/client";

interface KitItemOption {
  id: string;
  item_name: string;
  item_type: string;
  description?: string | null;
  created_at: string;
}

export const SupplyHomologationList = () => {
  const { user } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, isGestor } = useUserRole();
  const [editModalItem, setEditModalItem] = useState<KitItemOption | null>(null);
  const [deleteModalItem, setDeleteModalItem] = useState<KitItemOption | null>(null);

  const { data: supplies = [], isLoading } = useQuery({
    queryKey: ['kit-item-options', 'supply'],
    queryFn: () => fetchKitItemOptions('supply'),
  });

  const filteredSupplies = useMemo(() => {
    if (!searchTerm) return supplies;
    return supplies.filter(supply =>
      supply.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supply.description && supply.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [supplies, searchTerm]);

  const handleDeleteSupply = async (supplyId: string, supplyName: string) => {
    try {
      console.log('Supply delete start', { supplyId, supplyName });
      setDeletingId(supplyId);
      const res = await deleteKitItemOption(supplyId);
      console.log('Supply delete success', { supplyId, res });
      
      queryClient.invalidateQueries({
        queryKey: ['kit-item-options', 'supply']
      });
      queryClient.invalidateQueries({
        queryKey: ['kit-item-options']
      });
      queryClient.invalidateQueries({
        queryKey: ['pending-homologation-items']
      });

      toast({
        title: "Insumo removido",
        description: `${supplyName} foi removido com sucesso e movido para pendentes.`,
      });
      
      setDialogOpen(null);
    } catch (error: any) {
      console.error('Error deleting supply:', error);
      toast({
        title: "Erro ao remover",
        description: error?.message || "Ocorreu um erro ao remover o insumo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenEditModal = (supply: KitItemOption) => {
    setEditModalItem({
      ...supply,
      item_type: 'supply'
    } as KitItemOption);
  };

  const handleOpenDeleteModal = (supply: KitItemOption) => {
    setDeleteModalItem({
      ...supply,
      item_type: 'supply'
    } as KitItemOption);
  };

  const handleSubmitDeleteRequest = async () => {
    if (!deleteModalItem) return;
    
    try {
      const { error } = await supabase
        .from('item_edit_requests')
        .insert({
          item_type: deleteModalItem.item_type,
          item_name: deleteModalItem.item_name,
          original_data: {
            id: deleteModalItem.id,
            item_name: deleteModalItem.item_name,
            description: deleteModalItem.description || null
          },
          requested_changes: {
            action: 'delete'
          },
          reason: 'Solicitação de exclusão',
          requested_by: user?.id,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Solicitação enviada",
        description: "A solicitação de exclusão foi enviada para aprovação do gestor."
      });
      setDeleteModalItem(null);
    } catch (error) {
      console.error('Error submitting delete request:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar solicitação de exclusão.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Insumos Homologados
            </CardTitle>
            <div className="w-6 h-6 animate-pulse bg-muted rounded"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-48"></div>
                  <div className="h-3 bg-muted rounded w-32"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Insumos Homologados ({supplies.length})
              </CardTitle>
              <ChevronDown 
                className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`} 
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {supplies.length > 0 && (
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar insumos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            {supplies.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhum insumo homologado</p>
                <p className="text-sm">Cadastre o primeiro insumo acima para começar</p>
              </div>
            ) : filteredSupplies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhum insumo encontrado para "{searchTerm}"</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSupplies.map((supply) => (
                  <div
                    key={supply.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">{supply.item_name}</h4>
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          Homologado
                        </Badge>
                      </div>
                      
                      {supply.description && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <p>{supply.description}</p>
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        Cadastrado em {new Date(supply.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <div className="flex gap-2 ml-4">
                      {/* Botão de Solicitação de Edição */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditModal(supply)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Solicitar edição ao gestor</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Botão de Solicitação de Exclusão */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDeleteModal(supply)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Solicitar exclusão ao gestor</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>

      {/* Modal de Solicitação de Edição */}
      <EditRequestModal
        open={!!editModalItem}
        onClose={() => setEditModalItem(null)}
        item={editModalItem ? { ...editModalItem, item_type: 'supply' } : null}
      />

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteModalItem} onOpenChange={(open) => !open && setDeleteModalItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Solicitar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja solicitar a exclusão do insumo <strong>{deleteModalItem?.item_name}</strong>? 
              Esta solicitação será enviada para aprovação do gestor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitDeleteRequest} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Solicitar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  );
};