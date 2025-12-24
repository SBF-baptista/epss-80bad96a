import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { fetchPendingHomologationItems, type PendingItem } from "@/services/pendingHomologationService";
import { AlertTriangle, Package, ChevronDown, Clock, Wrench, User, Users, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cleanItemName } from "@/utils/itemNormalization";

export const PendingEquipmentSection = () => {
  const [isOpen, setIsOpen] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [approvingItems, setApprovingItems] = useState<Set<string>>(new Set());

  const { data: pendingItems, isLoading } = useQuery({
    queryKey: ['pending-homologation-items'],
    queryFn: fetchPendingHomologationItems,
    refetchInterval: 30000, // Refetch every 30 seconds to stay updated
  });

  const equipment = pendingItems?.equipment || [];

  const handleApprove = async (item: PendingItem) => {
    const itemKey = item.item_name;
    setApprovingItems(prev => new Set(prev).add(itemKey));

    try {
      const { error } = await supabase
        .from('kit_item_options')
        .insert({
          item_name: item.item_name,
          item_type: 'equipment',
          description: `Homologado automaticamente em ${new Date().toLocaleDateString('pt-BR')}`
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

  if (equipment.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-green-500" />
            Insumos Pendentes de Homologação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
            <p className="text-lg font-medium mb-2">Todos os insumos homologados!</p>
            <p className="text-sm">Não há insumos pendentes de homologação.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-purple-200 bg-purple-50">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-purple-100 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-purple-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-purple-500" />
                Insumos Pendentes de Homologação ({equipment.length})
              </CardTitle>
              <ChevronDown 
                className={`h-5 w-5 text-purple-600 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`} 
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="mb-4 p-3 bg-purple-100 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-purple-800">
                  <p className="font-medium">Atenção!</p>
                  <p>Os insumos abaixo estão sendo utilizados em kits ou clientes, mas ainda não foram homologados. Homologue-os para que os kits possam ser distribuídos.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {equipment.map((item, index) => (
                <div
                  key={`${item.item_name}-${index}`}
                  className="p-4 border border-purple-200 rounded-lg bg-white hover:bg-purple-50 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-purple-600" />
                        <h4 className="font-medium text-purple-900">{cleanItemName(item.item_name)}</h4>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-300">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-purple-700 border-purple-300">
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
                          <p className="text-sm text-purple-700 font-medium">
                            Usado em {item.kits.length} kit(s):
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {item.kits.map((kit, kitIndex) => (
                              <Badge 
                                key={`${kit.id}-${kitIndex}`} 
                                variant="secondary" 
                                className="bg-purple-100 text-purple-800 border-purple-200"
                              >
                                {kit.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {item.customers && item.customers.length > 0 && (
                        <div>
                          <p className="text-sm text-blue-700 font-medium flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Usado por {item.customers.length} cliente(s):
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {item.customers.map((customer, customerIndex) => (
                              <Badge 
                                key={`${customer.id}-${customerIndex}`} 
                                variant="secondary" 
                                className="bg-blue-100 text-blue-800 border-blue-200"
                              >
                                <User className="h-3 w-3 mr-1" />
                                {customer.name} ({customer.vehicles_count} veículo{customer.vehicles_count !== 1 ? 's' : ''})
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
                <Wrench className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Como homologar:</p>
                  <p>Clique no botão "Homologar" ao lado de cada item ou use o formulário de homologação de acessórios acima (selecione tipo "Equipamento"). Depois que forem homologados, os kits correspondentes ficarão disponíveis para distribuição.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};