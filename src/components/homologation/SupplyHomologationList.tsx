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
import { Trash2, Wrench, FileText, ChevronDown, Search } from "lucide-react";
import { useState, useMemo } from "react";

export const SupplyHomologationList = () => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();

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

      toast({
        title: "Insumo removido",
        description: `${supplyName} foi removido com sucesso.`,
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

                    {isAdmin && (
                      <AlertDialog 
                        open={dialogOpen === supply.id}
                        onOpenChange={(open) => setDialogOpen(open ? supply.id : null)}
                      >
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-4 hover:bg-destructive hover:text-destructive-foreground"
                            disabled={deletingId === supply.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover Insumo</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover o insumo "<strong>{supply.item_name}</strong>"?
                              Esta ação não pode ser desfeita e o insumo não estará mais disponível para novos kits.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={deletingId === supply.id}>
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteSupply(supply.id, supply.item_name);
                              }}
                              disabled={deletingId === supply.id}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deletingId === supply.id ? "Removendo..." : "Remover"}
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