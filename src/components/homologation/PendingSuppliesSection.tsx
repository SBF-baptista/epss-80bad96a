import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { fetchPendingHomologationItems, type PendingItem } from "@/services/pendingHomologationService";
import { AlertTriangle, Wrench, ChevronDown, Clock, Cog, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const PendingSuppliesSection = () => {
  const [isOpen, setIsOpen] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [approvingItems, setApprovingItems] = useState<Set<string>>(new Set());

  const { data: pendingItems, isLoading } = useQuery({
    queryKey: ['pending-homologation-items'],
    queryFn: fetchPendingHomologationItems,
    refetchInterval: 30000, // Refetch every 30 seconds to stay updated
  });

  const supplies = pendingItems?.supplies || [];
  const equipment = pendingItems?.equipment || [];
  const allItems = [...supplies, ...equipment];

  const handleApprove = async (item: PendingItem) => {
    const itemKey = item.item_name;
    setApprovingItems(prev => new Set(prev).add(itemKey));

    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .from('kit_item_options')
        .insert({
          item_name: item.item_name,
          item_type: item.item_type,
          description: `Homologado automaticamente em ${new Date().toLocaleDateString('pt-BR')}`,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Item homologado",
        description: `${item.item_name} foi homologado com sucesso.`
      });

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['pending-homologation-items'] });
      await queryClient.invalidateQueries({ queryKey: ['homologation-kits'] });
      await queryClient.invalidateQueries({ queryKey: ['kit-item-options'] });
    } catch (error) {
      console.error('Error approving item:', error);
      toast({
        title: "Erro ao homologar",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao homologar o item",
        variant: "destructive"
      });
    } finally {
      setApprovingItems(prev => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Insumos Pendentes de Homologação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allItems.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
            <Wrench className="h-5 w-5 text-green-500" />
            Insumos Pendentes de Homologação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
            <p className="text-lg font-medium mb-2">Todos os insumos homologados!</p>
            <p className="text-sm">Não há insumos pendentes de homologação nos kits cadastrados.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-orange-200 bg-orange-50">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-orange-100 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-orange-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Insumos Pendentes de Homologação ({allItems.length})
              </CardTitle>
              <ChevronDown 
                className={`h-5 w-5 text-orange-600 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`} 
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="mb-4 p-3 bg-orange-100 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-orange-800">
                  <p className="font-medium">Atenção!</p>
                  <p>Os insumos abaixo estão sendo utilizados em kits, mas ainda não foram homologados. Homologue-os para que os kits possam ser distribuídos.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {allItems.map((item, index) => (
                <div
                  key={`${item.item_name}-${index}`}
                  className="p-4 border border-orange-200 rounded-lg bg-white hover:bg-orange-50 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-orange-600" />
                        <h4 className="font-medium text-orange-900">{item.item_name}</h4>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {item.item_type === 'supply' ? 'Insumo' : 'Equipamento'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-orange-700 border-orange-300">
                          Qtd total: {item.quantity}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                          onClick={() => handleApprove(item)}
                          disabled={approvingItems.has(item.item_name)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {approvingItems.has(item.item_name) ? 'Homologando...' : 'Homologar'}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {item.kits && item.kits.length > 0 && (
                        <div>
                          <p className="text-sm text-orange-700 font-medium">
                            Usado em {item.kits.length} kit(s):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {item.kits.map((kit, kitIndex) => (
                              <Badge 
                                key={`${kit.id}-${kitIndex}`} 
                                variant="secondary" 
                                className="bg-orange-100 text-orange-800 border-orange-200"
                              >
                                {kit.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {item.customers && item.customers.length > 0 && (
                        <div>
                          <p className="text-sm text-orange-700 font-medium">
                            Usado por {item.customers.length} cliente(s):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {item.customers.map((customer, customerIndex) => (
                              <Badge 
                                key={`${customer.id}-${customerIndex}`} 
                                variant="secondary" 
                                className="bg-orange-100 text-orange-800 border-orange-200"
                              >
                                {customer.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Cog className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Como homologar:</p>
                  <p>Clique no botão "Homologar" ao lado de cada item ou use o formulário acima para cadastrar estes insumos como homologados. Depois que forem homologados, os kits correspondentes ficarão disponíveis para distribuição.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};