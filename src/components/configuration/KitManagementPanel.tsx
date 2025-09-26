import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Package, AlertTriangle, CheckCircle, XCircle, Timer } from 'lucide-react';
import type { Technician } from '@/services/technicianService';
import type { HomologationKit } from '@/services/homologationKitService';
import type { KitScheduleWithDetails } from '@/services/kitScheduleService';
import type { HomologationStatus } from '@/services/kitHomologationService';

interface KitManagementPanelProps {
  kits: HomologationKit[];
  technicians: Technician[];
  schedules: KitScheduleWithDetails[];
  homologationStatuses: Map<string, HomologationStatus>;
  onRefresh: () => void;
}

export const KitManagementPanel = ({ 
  kits, 
  technicians, 
  schedules, 
  homologationStatuses,
  onRefresh 
}: KitManagementPanelProps) => {
  const { toast } = useToast();

  const getKitSchedules = (kitId: string) => {
    return schedules.filter(schedule => schedule.kit_id === kitId);
  };

  const getKitStatus = (kit: HomologationKit, isHomologated: boolean) => {
    if (!isHomologated) {
      return { status: 'not_homologated', label: 'Não Homologado', variant: 'destructive' as const };
    }
    return { status: 'homologated', label: 'Homologado', variant: 'default' as const };
  };

const calculatePendingDays = (createdAt: string): number => {
  if (!createdAt) return 0;
  const createdDate = new Date(createdAt);
  const currentDate = new Date();
  const diffTime = currentDate.getTime() - createdDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const renderKitItems = (kit: HomologationKit, homologationStatus: HomologationStatus | undefined) => {
  const allItems = [
    ...kit.equipment.map(item => ({ ...item, category: 'Equipamentos' })),
    ...kit.accessories.map(item => ({ ...item, category: 'Acessórios' })),
    ...kit.supplies.map(item => ({ ...item, category: 'Insumos' }))
  ];

  const homologatedItems = homologationStatus?.homologatedItems || { equipment: [], accessories: [], supplies: [] };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Detalhamento dos Itens:</h4>
      <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
        {allItems.map((item, index) => {
          const isHomologated = [
            ...homologatedItems.equipment,
            ...homologatedItems.accessories,
            ...homologatedItems.supplies
          ].some(homItem => homItem.item_name === item.item_name);

          return (
            <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-md text-xs">
              <div className="flex items-center gap-2">
                {isHomologated ? (
                  <CheckCircle className="w-3 h-3 text-green-600" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-600" />
                )}
                <span className="font-medium">{item.item_name}</span>
                <Badge variant="outline" className="text-xs">
                  {item.category}
                </Badge>
              </div>
              <Badge variant="outline" className="text-xs">
                Qtd: {item.quantity}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
};

  return (
    <div className="h-full space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Kits de Homologação</h3>
      </div>

      {/* Kit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full overflow-auto">
        {kits.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">Nenhum Kit Encontrado</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Ainda não há kits de homologação criados. Crie o primeiro kit para começar a gerenciar as instalações.
            </p>
            <p className="text-muted-foreground">
              Não há kits de homologação criados no momento.
            </p>
          </div>
        ) : (
          kits.map((kit) => {
            const homologationStatus = homologationStatuses.get(kit.id!);
            const isHomologated = homologationStatus?.isHomologated ?? false;
            const kitStatus = getKitStatus(kit, isHomologated);
            const kitSchedules = getKitSchedules(kit.id!);
            const totalItems = kit.equipment.length + kit.accessories.length + kit.supplies.length;
            const pendingDays = !isHomologated ? calculatePendingDays(kit.created_at || '') : 0;

            return (
              <Card key={kit.id} className="h-fit hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        {kit.name}
                      </CardTitle>
                      {kit.description && (
                        <p className="text-sm text-muted-foreground mt-1">{kit.description}</p>
                      )}
                      {/* Contador de dias pendentes */}
                      {!isHomologated && (
                        <div className="flex items-center gap-2 mt-2 text-red-600 bg-red-50 p-2 rounded-md">
                          <Timer className="w-4 h-4" />
                          <span className="text-sm font-semibold">
                            {pendingDays} dia{pendingDays !== 1 ? 's' : ''} pendente{pendingDays !== 1 ? 's' : ''} de homologação
                          </span>
                        </div>
                      )}
                    </div>
                    <Badge variant={kitStatus.variant} className="ml-2">
                      {kitStatus.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {/* Kit Details com números destacados */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between p-2 bg-primary/5 rounded-md">
                        <span className="text-sm font-medium">Total de itens</span>
                        <Badge variant="secondary" className="bg-primary text-primary-foreground font-bold">
                          {totalItems}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md">
                        <span className="text-sm font-medium">Equipamentos</span>
                        <Badge variant="outline" className="border-blue-500 text-blue-700 font-bold">
                          {kit.equipment.length}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded-md">
                        <span className="text-sm font-medium">Acessórios</span>
                        <Badge variant="outline" className="border-green-500 text-green-700 font-bold">
                          {kit.accessories.length}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-purple-50 rounded-md">
                        <span className="text-sm font-medium">Insumos</span>
                        <Badge variant="outline" className="border-purple-500 text-purple-700 font-bold">
                          {kit.supplies.length}
                        </Badge>
                      </div>
                    </div>

                    {/* Detalhamento dos itens do kit */}
                    {renderKitItems(kit, homologationStatus)}

                    {/* Homologation Status */}
                    {!isHomologated && (
                      <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-2 rounded-md">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm">Aguardando homologação</span>
                      </div>
                    )}

                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

    </div>
  );
};