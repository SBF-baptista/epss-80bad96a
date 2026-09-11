import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { fetchKitItemOptions, deleteKitItemOption, updateKitItemOption } from "@/services/kitItemOptionsService";
import { Trash2, Radio, FileText, ChevronDown, Search, Pencil, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EditRequestModal } from "./EditRequestModal";
import { TrackerHomologationForm } from "./TrackerHomologationForm";

interface TrackerItem {
  id: string;
  item_name: string;
  item_type: string;
  description?: string | null;
  requires_homologation: boolean;
  created_at: string;
}

export const TrackerHomologationList = () => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canEditModule, canManageModule } = useUserRole();
  const canManage = canEditModule('accessories_supplies') || canManageModule('homologation');
  const [editModalItem, setEditModalItem] = useState<TrackerItem | null>(null);
  const [deleteModalItem, setDeleteModalItem] = useState<TrackerItem | null>(null);

  const { data: trackers = [], isLoading } = useQuery({
    queryKey: ['kit-item-options', 'equipment'],
    queryFn: () => fetchKitItemOptions('equipment'),
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });

  const filteredTrackers = useMemo(() => {
    if (!searchTerm) return trackers;
    const term = searchTerm.toLowerCase();
    return trackers.filter(
      (tracker) =>
        tracker.item_name.toLowerCase().includes(term) ||
        (tracker.description && tracker.description.toLowerCase().includes(term)),
    );
  }, [trackers, searchTerm]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['kit-item-options', 'equipment'] });
    queryClient.invalidateQueries({ queryKey: ['kit-item-options'] });
    queryClient.invalidateQueries({ queryKey: ['pending-homologation-items'] });
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      setDeletingId(id);
      await deleteKitItemOption(id);
      invalidate();
      toast({ title: "Rastreador removido", description: `${name} foi removido com sucesso.` });
      setDeleteModalItem(null);
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error?.message || "Ocorreu um erro ao remover o rastreador.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDirectUpdate = async (
    id: string,
    changes: { item_name: string; requires_homologation?: boolean },
  ) => {
    await updateKitItemOption(id, changes);
    invalidate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Rastreadores Homologados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CollapsibleTrigger asChild>
              <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2 cursor-pointer">
                <Radio className="h-5 w-5" />
                Rastreadores Homologados ({trackers.length})
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </CardTitle>
            </CollapsibleTrigger>
            {canManage && (
              <Button onClick={() => setIsFormModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Rastreador
              </Button>
            )}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {trackers.length > 0 && (
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar rastreadores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}

            {trackers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Radio className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhum rastreador cadastrado</p>
                <p className="text-sm">Cadastre o primeiro rastreador para começar</p>
              </div>
            ) : filteredTrackers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhum rastreador encontrado para "{searchTerm}"</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTrackers.map((tracker) => (
                  <div
                    key={tracker.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-foreground">{tracker.item_name}</h4>
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          Homologado
                        </Badge>
                        <Badge variant={tracker.requires_homologation ? "outline" : "secondary"}>
                          {tracker.requires_homologation ? "Exige homologação" : "Dispensa homologação"}
                        </Badge>
                      </div>

                      {tracker.description && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <p>{tracker.description}</p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Cadastrado em {new Date(tracker.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    {canManage && (
                      <div className="flex gap-2 ml-4">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setEditModalItem(tracker as TrackerItem)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar rastreador</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteModalItem(tracker as TrackerItem)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Excluir rastreador</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>

      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Cadastrar Novo Rastreador
            </DialogTitle>
          </DialogHeader>
          <TrackerHomologationForm onSuccess={() => setIsFormModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <EditRequestModal
        open={!!editModalItem}
        onClose={() => setEditModalItem(null)}
        mode="direct"
        onDirectSave={(changes) =>
          editModalItem ? handleDirectUpdate(editModalItem.id, changes) : Promise.resolve()
        }
        item={editModalItem ? { ...editModalItem, item_type: 'equipment' } : null}
      />

      <AlertDialog open={!!deleteModalItem} onOpenChange={(open) => !open && setDeleteModalItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Rastreador</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir o rastreador <strong>{deleteModalItem?.item_name}</strong>? Esta ação será aplicada
              imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteModalItem && handleDelete(deleteModalItem.id, deleteModalItem.item_name)}
              disabled={!!deletingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  );
};
