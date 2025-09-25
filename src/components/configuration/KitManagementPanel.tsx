import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, User, Package, AlertTriangle, Clock, CheckCircle, XCircle, Timer } from 'lucide-react';
import type { Technician } from '@/services/technicianService';
import type { HomologationKit } from '@/services/homologationKitService';
import type { KitScheduleWithDetails } from '@/services/kitScheduleService';
import { KitScheduleModal } from './KitScheduleModal';
import { KitCreationModal } from './KitCreationModal';
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
  const [selectedKit, setSelectedKit] = useState<HomologationKit | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);

const handleScheduleKit = (kit: HomologationKit) => {
  const isHomologated = homologationStatuses.get(kit.id!)?.isHomologated ?? false;
  if (!isHomologated) {
    toast({
      title: "Kit sem homologação",
      description: "Este kit precisa ser homologado antes de ser agendado.",
      variant: "destructive"
    });
    return;
  }

  setSelectedKit(kit);
  setIsScheduleModalOpen(true);
};

  const getKitSchedules = (kitId: string) => {
    return schedules.filter(schedule => schedule.kit_id === kitId);
  };

const getKitStatus = (kit: HomologationKit, isHomologated: boolean) => {
  if (!isHomologated) {
    return { status: 'not_homologated', label: 'Não Homologado', variant: 'destructive' as const };
  }

  const kitSchedules = getKitSchedules(kit.id!);
  if (kitSchedules.length === 0) {
    return { status: 'available', label: 'Disponível', variant: 'default' as const };
  }

  const hasScheduled = kitSchedules.some(s => s.status === 'scheduled');
  const hasInProgress = kitSchedules.some(s => s.status === 'in_progress');
  const hasCompleted = kitSchedules.some(s => s.status === 'completed');

  if (hasInProgress) {
    return { status: 'in_progress', label: 'Em Instalação', variant: 'secondary' as const };
  }
  if (hasScheduled) {
    return { status: 'scheduled', label: 'Agendado', variant: 'outline' as const };
  }
  if (hasCompleted) {
    return { status: 'completed', label: 'Instalado', variant: 'default' as const };
  }

  return { status: 'available', label: 'Disponível', variant: 'default' as const };
};

const calculatePendingDays = (createdAt: string): number => {
  if (!createdAt) return 0;
  const createdDate = new Date(createdAt);
  const currentDate = new Date();
  const diffTime = currentDate.getTime() - createdDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const KitItemsSection = ({ kit, homologationStatus }: { kit: HomologationKit, homologationStatus: HomologationStatus | undefined }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const allItems = [
    ...kit.equipment.map(item => ({ ...item, category: 'Equipamentos' })),
    ...kit.accessories.map(item => ({ ...item, category: 'Acessórios' })),
    ...kit.supplies.map(item => ({ ...item, category: 'Insumos' }))
  ];

  const homologatedItems = homologationStatus?.homologatedItems || { equipment: [], accessories: [], supplies: [] };
  const homologatedCount = allItems.filter(item => [
    ...homologatedItems.equipment,
    ...homologatedItems.accessories,
    ...homologatedItems.supplies
  ].some(homItem => homItem.item_name === item.item_name)).length;

  return (
    <div className="space-y-2">
      <div 
        className="flex items-center justify-between cursor-pointer p-2 bg-muted/20 rounded-md hover:bg-muted/40 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Itens do Kit</span>
          <Badge variant="outline" className="text-xs">
            {homologatedCount}/{allItems.length} homologados
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? '▼' : '▶'}
        </div>
      </div>
      
      {isExpanded && (
        <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto border rounded-md p-2 bg-background/50">
          {allItems.map((item, index) => {
            const isHomologated = [
              ...homologatedItems.equipment,
              ...homologatedItems.accessories,
              ...homologatedItems.supplies
            ].some(homItem => homItem.item_name === item.item_name);

            return (
              <div key={index} className="flex items-center justify-between p-1 text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isHomologated ? (
                    <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-600 flex-shrink-0" />
                  )}
                  <span className="font-medium truncate">{item.item_name}</span>
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {item.category.charAt(0)}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">{item.quantity}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

  return (
    <div className="h-full flex flex-col space-y-3">
      {/* Header with Add Kit Button */}
      <div className="flex justify-between items-center flex-shrink-0">
        <h3 className="text-lg font-semibold">Kits de Homologação</h3>
        <Button onClick={() => setIsCreationModalOpen(true)} size="sm">
          <Package className="w-4 h-4 mr-2" />
          Novo Kit
        </Button>
      </div>

      {/* Kit Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-auto">
        {kits.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
            <Package className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold text-muted-foreground mb-2">Nenhum Kit Encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Ainda não há kits de homologação criados. Crie o primeiro kit para começar a gerenciar as instalações.
            </p>
            <Button onClick={() => setIsCreationModalOpen(true)} size="sm">
              <Package className="w-4 h-4 mr-2" />
              Criar Primeiro Kit
            </Button>
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
                <CardHeader className="pb-2 px-4 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{kit.name}</span>
                      </CardTitle>
                      {kit.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{kit.description}</p>
                      )}
                      {/* Contador de dias pendentes */}
                      {!isHomologated && pendingDays > 0 && (
                        <div className="flex items-center gap-2 mt-2 text-red-600 bg-red-50 p-1.5 rounded-md">
                          <Timer className="w-3 h-3 flex-shrink-0" />
                          <span className="text-xs font-semibold">
                            {pendingDays} dia{pendingDays !== 1 ? 's' : ''} pendente{pendingDays !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    <Badge variant={kitStatus.variant} className="text-xs px-2 py-1 flex-shrink-0">
                      {kitStatus.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {/* Kit Details com números destacados - mais compacto */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="flex items-center justify-between p-1.5 bg-primary/5 rounded-md">
                        <span className="text-xs font-medium">Total</span>
                        <Badge variant="secondary" className="bg-primary text-primary-foreground font-bold text-xs px-2 py-0">
                          {totalItems}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-1.5 bg-blue-50 rounded-md">
                        <span className="text-xs font-medium">Equip.</span>
                        <Badge variant="outline" className="border-blue-500 text-blue-700 font-bold text-xs px-2 py-0">
                          {kit.equipment.length}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-1.5 bg-green-50 rounded-md">
                        <span className="text-xs font-medium">Acess.</span>
                        <Badge variant="outline" className="border-green-500 text-green-700 font-bold text-xs px-2 py-0">
                          {kit.accessories.length}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-1.5 bg-purple-50 rounded-md">
                        <span className="text-xs font-medium">Insum.</span>
                        <Badge variant="outline" className="border-purple-500 text-purple-700 font-bold text-xs px-2 py-0">
                          {kit.supplies.length}
                        </Badge>
                      </div>
                    </div>

                    {/* Detalhamento dos itens do kit - agora colapsável */}
                    <KitItemsSection kit={kit} homologationStatus={homologationStatus} />

                    {/* Homologation Status - mais compacto */}
                    {!isHomologated && (
                      <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-1.5 rounded-md">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        <span className="text-xs">Aguardando homologação</span>
                      </div>
                    )}

                    {/* Current Schedules - mais compacto */}
                    {kitSchedules.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-medium">Agendamentos:</h4>
                        {kitSchedules.slice(0, 1).map((schedule) => (
                          <div key={schedule.id} className="flex items-center gap-2 text-xs p-1.5 bg-muted/50 rounded-md">
                            <User className="w-3 h-3 flex-shrink-0" />
                            <span className="flex-1 truncate">{schedule.technician.name}</span>
                            <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
                              <Calendar className="w-3 h-3" />
                              <span className="text-xs">
                                {new Date(schedule.scheduled_date).toLocaleDateString('pt-BR', { 
                                  day: '2-digit', 
                                  month: '2-digit' 
                                })}
                              </span>
                            </div>
                          </div>
                        ))}
                        {kitSchedules.length > 1 && (
                          <p className="text-xs text-muted-foreground">
                            +{kitSchedules.length - 1} agendamento(s)
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions - mais compacto */}
                    <div className="pt-2 border-t">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleScheduleKit(kit)}
                        disabled={!isHomologated}
                        className="w-full h-8 text-xs"
                      >
                        <Clock className="w-3 h-3 mr-2" />
                        {kitSchedules.length > 0 ? 'Reagendar' : 'Agendar'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Kit Creation Modal */}
      <KitCreationModal
        isOpen={isCreationModalOpen}
        onClose={() => setIsCreationModalOpen(false)}
        onSuccess={() => {
          onRefresh();
          setIsCreationModalOpen(false);
        }}
      />

      {/* Schedule Modal */}
      {selectedKit && (
        <KitScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => {
            setIsScheduleModalOpen(false);
            setSelectedKit(null);
          }}
          kit={selectedKit}
          technicians={technicians}
          existingSchedules={getKitSchedules(selectedKit.id!)}
          onSuccess={() => {
            onRefresh();
            setIsScheduleModalOpen(false);
            setSelectedKit(null);
          }}
        />
      )}
    </div>
  );
};