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

export const PendingAccessoriesSection = () => {
  const [isOpen, setIsOpen] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [approvingItems, setApprovingItems] = useState<Set<string>>(new Set());

  const { data: pendingItems, isLoading } = useQuery({
    queryKey: ['pending-homologation-items'],
    queryFn: fetchPendingHomologationItems,
    refetchInterval: 30000, // Refetch every 30 seconds to stay updated
  });

  const accessories = pendingItems?.accessories || [];

  const calculatePendingDays = (item: PendingItem): number => {
    if (!item.last_pending_date) return 0;
    
    const pendingDate = new Date(item.last_pending_date);
    const today = new Date();
    
    // Reset time to midnight for both dates to compare calendar days
    pendingDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - pendingDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

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
          item_type: 'accessory',
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
            Acessórios Pendentes de Homologação
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

  if (accessories.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-green-500" />
            Acessórios Pendentes de Homologação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
            <p className="text-lg font-medium mb-2">Todos os acessórios homologados!</p>
            <p className="text-sm">Não há acessórios pendentes de homologação nos kits cadastrados.</p>
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
                Acessórios Pendentes de Homologação ({accessories.length})
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
                  <p>Os acessórios abaixo estão sendo utilizados em kits, mas ainda não foram homologados. Homologue-os para que os kits possam ser distribuídos.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {accessories.map((accessory, index) => (
                <div
                  key={`${accessory.item_name}-${index}`}
                  className="p-4 border border-orange-200 rounded-lg bg-white hover:bg-orange-50 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-orange-600" />
                        <h4 className="font-medium text-orange-900">{accessory.item_name}</h4>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                          <Clock className="h-3 w-3 mr-1" />
                          {calculatePendingDays(accessory)} {calculatePendingDays(accessory) === 1 ? 'dia' : 'dias'}
                        </Badge>
                        <Badge variant="outline" className="text-orange-700 border-orange-300">
                          {accessory.kits?.length || 0} {accessory.kits?.length === 1 ? 'kit' : 'kits'}
                        </Badge>
                        {(accessory.vehicles_count ?? 0) > 0 && (
                          <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
                            {accessory.vehicles_count} {accessory.vehicles_count === 1 ? 'veículo' : 'veículos'}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-orange-700 border-orange-300">
                          Qtd total: {accessory.quantity}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                          onClick={() => handleApprove(accessory)}
                          disabled={approvingItems.has(accessory.item_name)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {approvingItems.has(accessory.item_name) ? 'Homologando...' : 'Homologar'}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {accessory.kits && accessory.kits.length > 0 && (
                        <div>
                          <p className="text-sm text-orange-700 font-medium">
                            Usado em {accessory.kits.length} kit(s):
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {accessory.kits.map((kit, kitIndex) => (
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
                      
                      {accessory.customers && accessory.customers.length > 0 && (
                        <div>
                          <p className="text-sm text-blue-700 font-medium flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Usado por {accessory.customers.length} cliente(s):
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {accessory.customers.map((customer, customerIndex) => (
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
                  <p>Use o formulário acima para cadastrar estes acessórios como homologados. Depois que forem homologados, os kits correspondentes ficarão disponíveis para distribuição.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};