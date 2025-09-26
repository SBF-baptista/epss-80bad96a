import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { fetchPendingHomologationItems, type PendingItem } from "@/services/pendingHomologationService";
import { AlertTriangle, Wrench, ChevronDown, Clock, Cog } from "lucide-react";
import { useState } from "react";

export const PendingSuppliesSection = () => {
  const [isOpen, setIsOpen] = useState(true);

  const { data: pendingItems, isLoading } = useQuery({
    queryKey: ['pending-homologation-items'],
    queryFn: fetchPendingHomologationItems,
    refetchInterval: 30000, // Refetch every 30 seconds to stay updated
  });

  const supplies = pendingItems?.supplies || [];

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

  if (supplies.length === 0) {
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
                Insumos Pendentes de Homologação ({supplies.length})
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
              {supplies.map((supply, index) => (
                <div
                  key={`${supply.item_name}-${index}`}
                  className="p-4 border border-orange-200 rounded-lg bg-white hover:bg-orange-50 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-orange-600" />
                        <h4 className="font-medium text-orange-900">{supply.item_name}</h4>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      </div>
                      <Badge variant="outline" className="text-orange-700 border-orange-300">
                        Qtd total: {supply.quantity}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-orange-700 font-medium">
                        Usado em {supply.kits.length} kit(s):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {supply.kits.map((kit, kitIndex) => (
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
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Cog className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Como homologar:</p>
                  <p>Use o formulário acima para cadastrar estes insumos como homologados. Depois que forem homologados, os kits correspondentes ficarão disponíveis para distribuição.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};