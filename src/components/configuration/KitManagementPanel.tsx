import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, User, Package, AlertTriangle, Clock } from 'lucide-react';
import type { Technician } from '@/services/technicianService';
import type { HomologationKit } from '@/services/homologationKitService';
import type { KitScheduleWithDetails } from '@/services/kitScheduleService';
import { KitScheduleModal } from './KitScheduleModal';

interface KitManagementPanelProps {
  kits: HomologationKit[];
  technicians: Technician[];
  schedules: KitScheduleWithDetails[];
  onRefresh: () => void;
}

export const KitManagementPanel = ({ 
  kits, 
  technicians, 
  schedules, 
  onRefresh 
}: KitManagementPanelProps) => {
  const { toast } = useToast();
  const [selectedKit, setSelectedKit] = useState<HomologationKit | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const handleScheduleKit = (kit: HomologationKit) => {
    // Check if kit has homologation
    if (!kit.homologation_card_id) {
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

  const getKitStatus = (kit: HomologationKit) => {
    if (!kit.homologation_card_id) {
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

  return (
    <div className="h-full space-y-4">
      {/* Kit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full overflow-auto">
        {kits.map((kit) => {
          const kitStatus = getKitStatus(kit);
          const kitSchedules = getKitSchedules(kit.id!);
          const totalItems = kit.equipment.length + kit.accessories.length + kit.supplies.length;

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
                  </div>
                  <Badge variant={kitStatus.variant} className="ml-2">
                    {kitStatus.label}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {/* Kit Details */}
                  <div className="text-sm text-muted-foreground">
                    <p><strong>Total de itens:</strong> {totalItems}</p>
                    <p><strong>Equipamentos:</strong> {kit.equipment.length}</p>
                    <p><strong>Acessórios:</strong> {kit.accessories.length}</p>
                    <p><strong>Insumos:</strong> {kit.supplies.length}</p>
                  </div>

                  {/* Homologation Status */}
                  {!kit.homologation_card_id && (
                    <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-2 rounded-md">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">Aguardando homologação</span>
                    </div>
                  )}

                  {/* Current Schedules */}
                  {kitSchedules.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Agendamentos:</h4>
                      {kitSchedules.slice(0, 2).map((schedule) => (
                        <div key={schedule.id} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded-md">
                          <User className="w-4 h-4" />
                          <span className="flex-1">{schedule.technician.name}</span>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {new Date(schedule.scheduled_date).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      ))}
                      {kitSchedules.length > 2 && (
                        <p className="text-xs text-muted-foreground">
                          +{kitSchedules.length - 2} agendamento(s) adicional(is)
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleScheduleKit(kit)}
                      disabled={!kit.homologation_card_id}
                      className="flex-1"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      {kitSchedules.length > 0 ? 'Reagendar' : 'Agendar'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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