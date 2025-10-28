import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { fetchKitItemOptions, deleteKitItemOption } from "@/services/kitItemOptionsService";
import { Trash2, Package, FileText, ChevronDown, Search } from "lucide-react";
import { useState, useMemo } from "react";

export const AccessoryHomologationList = () => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();

  const { data: accessories = [], isLoading } = useQuery({
    queryKey: ['kit-item-options', 'accessory'],
    queryFn: () => fetchKitItemOptions('accessory'),
  });

  const filteredAccessories = useMemo(() => {
    if (!searchTerm) return accessories;
    return accessories.filter(accessory =>
      accessory.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (accessory.description && accessory.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [accessories, searchTerm]);

  const handleDeleteAccessory = async (accessoryId: string, accessoryName: string) => {
    try {
      console.log('Accessory delete start', { accessoryId, accessoryName });
      setDeletingId(accessoryId);
      const res = await deleteKitItemOption(accessoryId);
      console.log('Accessory delete success', { accessoryId, res });
      
      queryClient.invalidateQueries({
        queryKey: ['kit-item-options', 'accessory']
      });

      toast({
        title: "Acessório removido",
        description: `${accessoryName} foi removido com sucesso.`,
      });
      
      setDialogOpen(null);
    } catch (error: any) {
      console.error('Error deleting accessory:', error);
      toast({
        title: "Erro ao remover",
        description: error?.message || "Ocorreu um erro ao remover o acessório. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
              <Package className="h-5 w-5" />
              Acessórios Homologados
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
                <Package className="h-5 w-5" />
                Acessórios Homologados ({accessories.length})
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
            {accessories.length > 0 && (
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar acessórios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            {accessories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhum acessório homologado</p>
                <p className="text-sm">Cadastre o primeiro acessório acima para começar</p>
              </div>
            ) : filteredAccessories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhum acessório encontrado para "{searchTerm}"</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAccessories.map((accessory) => (
                  <div
                    key={accessory.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">{accessory.item_name}</h4>
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          Homologado
                        </Badge>
                      </div>
                      
                      {accessory.description && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <p>{accessory.description}</p>
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        Cadastrado em {new Date(accessory.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    {isAdmin && (
                      <AlertDialog 
                        open={dialogOpen === accessory.id}
                        onOpenChange={(open) => setDialogOpen(open ? accessory.id : null)}
                      >
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-4 hover:bg-destructive hover:text-destructive-foreground"
                            disabled={deletingId === accessory.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover Acessório</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover o acessório "<strong>{accessory.item_name}</strong>"?
                              Esta ação não pode ser desfeita e o acessório não estará mais disponível para novos kits.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={deletingId === accessory.id}>
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteAccessory(accessory.id, accessory.item_name);
                              }}
                              disabled={deletingId === accessory.id}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deletingId === accessory.id ? "Removendo..." : "Remover"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};