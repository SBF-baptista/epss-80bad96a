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
import { Trash2, Camera, FileText, ChevronDown, Search, Pencil, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EditRequestModal } from "./EditRequestModal";
import { CameraHomologationForm } from "./CameraHomologationForm";

interface CameraItem {
  id: string;
  item_name: string;
  item_type: string;
  description?: string | null;
  requires_homologation: boolean;
  created_at: string;
}

export const CameraHomologationList = () => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canEditModule, canManageModule } = useUserRole();
  const canManage = canEditModule('accessories_supplies') || canManageModule('homologation');
  const [editModalItem, setEditModalItem] = useState<CameraItem | null>(null);
  const [deleteModalItem, setDeleteModalItem] = useState<CameraItem | null>(null);

  const { data: cameras = [], isLoading } = useQuery({
    queryKey: ['kit-item-options', 'camera'],
    queryFn: () => fetchKitItemOptions('camera'),
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });

  const filteredCameras = useMemo(() => {
    if (!searchTerm) return cameras;
    const term = searchTerm.toLowerCase();
    return cameras.filter(
      (camera) =>
        camera.item_name.toLowerCase().includes(term) ||
        (camera.description && camera.description.toLowerCase().includes(term)),
    );
  }, [cameras, searchTerm]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['kit-item-options', 'camera'] });
    queryClient.invalidateQueries({ queryKey: ['kit-item-options'] });
    queryClient.invalidateQueries({ queryKey: ['pending-homologation-items'] });
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      setDeletingId(id);
      await deleteKitItemOption(id);
      invalidate();
      toast({ title: "Câmera removida", description: `${name} foi removida com sucesso.` });
      setDeleteModalItem(null);
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error?.message || "Ocorreu um erro ao remover a câmera.",
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
            <Camera className="h-5 w-5" />
            Câmeras Homologadas
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
                <Camera className="h-5 w-5" />
                Câmeras Homologadas ({cameras.length})
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </CardTitle>
            </CollapsibleTrigger>
            {canManage && (
              <Button onClick={() => setIsFormModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Câmera
              </Button>
            )}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {cameras.length > 0 && (
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar câmeras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}

            {cameras.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhuma câmera cadastrada</p>
                <p className="text-sm">Cadastre a primeira câmera para começar</p>
              </div>
            ) : filteredCameras.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhuma câmera encontrada para "{searchTerm}"</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCameras.map((camera) => (
                  <div
                    key={camera.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-foreground">{camera.item_name}</h4>
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          Homologado
                        </Badge>
                        <Badge variant={camera.requires_homologation ? "outline" : "secondary"}>
                          {camera.requires_homologation ? "Exige homologação" : "Dispensa homologação"}
                        </Badge>
                      </div>

                      {camera.description && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <p>{camera.description}</p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Cadastrado em {new Date(camera.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    {canManage && (
                      <div className="flex gap-2 ml-4">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setEditModalItem(camera as CameraItem)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar câmera</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteModalItem(camera as CameraItem)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Excluir câmera</p>
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
              <Camera className="h-5 w-5" />
              Cadastrar Nova Câmera
            </DialogTitle>
          </DialogHeader>
          <CameraHomologationForm onSuccess={() => setIsFormModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <EditRequestModal
        open={!!editModalItem}
        onClose={() => setEditModalItem(null)}
        mode="direct"
        onDirectSave={(changes) =>
          editModalItem ? handleDirectUpdate(editModalItem.id, changes) : Promise.resolve()
        }
        item={editModalItem ? { ...editModalItem, item_type: 'camera' } : null}
      />

      <AlertDialog open={!!deleteModalItem} onOpenChange={(open) => !open && setDeleteModalItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Câmera</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir a câmera <strong>{deleteModalItem?.item_name}</strong>? Esta ação será aplicada
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
