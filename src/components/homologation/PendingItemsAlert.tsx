import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Clock, Package, Calendar } from "lucide-react";
import { fetchPendingHomologationItems } from "@/services/pendingHomologationService";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PendingItemWithMetrics {
  item_name: string;
  item_type: string;
  kitsCount: number;
  planningKitsCount: number;
  oldestCreatedAt: Date;
  pendingDays: number;
}

export const PendingItemsAlert = () => {
  // Fetch pending items
  const { data: pendingItems } = useQuery({
    queryKey: ['pending-homologation-items'],
    queryFn: fetchPendingHomologationItems,
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch planning schedules
  const { data: planningSchedules } = useQuery({
    queryKey: ['planning-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kit_schedules')
        .select('id, selected_kit_ids, accessories, supplies, status, created_at')
        .in('status', ['scheduled', 'confirmed', 'pending']);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Fetch all kits with their created dates
  const { data: kits } = useQuery({
    queryKey: ['homologation-kits-dates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homologation_kits')
        .select('id, name, created_at');
      
      if (error) throw error;
      return data || [];
    },
  });

  if (!pendingItems || !planningSchedules || !kits) {
    return null;
  }

  // Combine all pending items
  const allPendingItems = [
    ...pendingItems.accessories,
    ...pendingItems.supplies,
    ...pendingItems.equipment,
  ];

  if (allPendingItems.length === 0) {
    return null;
  }

  // Create a map of kit_id to created_at
  const kitsDateMap = new Map(kits.map(k => [k.id, new Date(k.created_at)]));

  // Calculate metrics for each pending item
  const itemsWithMetrics: PendingItemWithMetrics[] = allPendingItems.map(item => {
    // Count kits that use this item
    const kitsCount = item.kits?.length || 0;

    // Find oldest kit creation date for this item
    let oldestDate = new Date();
    item.kits?.forEach(kit => {
      const kitDate = kitsDateMap.get(kit.id);
      if (kitDate && kitDate < oldestDate) {
        oldestDate = kitDate;
      }
    });

    // Calculate pending days
    const pendingDays = Math.floor((new Date().getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));

    // Count planning kits that depend on this item
    let planningKitsCount = 0;
    planningSchedules.forEach(schedule => {
      // Check if this item is in the schedule's kits, accessories, or supplies
      const selectedKitIds = schedule.selected_kit_ids || [];
      const hasKitWithItem = selectedKitIds.some(kitId => 
        item.kits?.some(k => k.id === kitId)
      );

      const accessories = schedule.accessories || [];
      const supplies = schedule.supplies || [];
      const hasDirectItem = 
        accessories.includes(item.item_name) || 
        supplies.includes(item.item_name);

      if (hasKitWithItem || hasDirectItem) {
        planningKitsCount++;
      }
    });

    return {
      item_name: item.item_name,
      item_type: item.item_type,
      kitsCount,
      planningKitsCount,
      oldestCreatedAt: oldestDate,
      pendingDays,
    };
  });

  // Sort by pending days (oldest first) and filter items with planning impact
  const criticalItems = itemsWithMetrics
    .filter(item => item.planningKitsCount > 0)
    .sort((a, b) => b.pendingDays - a.pendingDays)
    .slice(0, 3); // Show top 3 critical items

  const totalPendingItems = allPendingItems.length;
  const totalPlanningImpacted = itemsWithMetrics.reduce((sum, item) => sum + item.planningKitsCount, 0);
  const maxPendingDays = Math.max(...itemsWithMetrics.map(item => item.pendingDays), 0);

  return (
    <Alert className="border-orange-500 bg-orange-50 mb-4">
      <AlertTriangle className="h-5 w-5 text-orange-600" />
      <AlertTitle className="text-orange-900 font-semibold mb-2">
        Itens Pendentes de Homologação Detectados
      </AlertTitle>
      <AlertDescription>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="bg-white border-orange-300 text-orange-800">
              <Package className="h-3 w-3 mr-1" />
              {totalPendingItems} {totalPendingItems === 1 ? 'item pendente' : 'itens pendentes'}
            </Badge>
            
            {totalPlanningImpacted > 0 && (
              <Badge variant="outline" className="bg-red-50 border-red-300 text-red-800">
                <Calendar className="h-3 w-3 mr-1" />
                {totalPlanningImpacted} {totalPlanningImpacted === 1 ? 'agendamento impactado' : 'agendamentos impactados'}
              </Badge>
            )}

            {maxPendingDays > 0 && (
              <Badge variant="outline" className="bg-orange-100 border-orange-400 text-orange-900">
                <Clock className="h-3 w-3 mr-1" />
                Mais antigo: {maxPendingDays} {maxPendingDays === 1 ? 'dia' : 'dias'}
              </Badge>
            )}
          </div>

          {criticalItems.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-orange-200">
              <p className="text-sm font-medium text-orange-900">Itens críticos (impactam agendamentos):</p>
              <div className="space-y-2">
                {criticalItems.map((item, index) => (
                  <div 
                    key={`${item.item_name}-${index}`}
                    className="flex items-center justify-between text-sm bg-white p-2 rounded border border-orange-200"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-orange-600" />
                      <span className="font-medium text-orange-900">{item.item_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-orange-700">
                        {item.kitsCount} {item.kitsCount === 1 ? 'kit' : 'kits'}
                      </span>
                      <span className="text-red-700 font-medium">
                        {item.planningKitsCount} {item.planningKitsCount === 1 ? 'agendamento' : 'agendamentos'}
                      </span>
                      <span className="text-orange-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(item.oldestCreatedAt, { locale: ptBR, addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-sm text-orange-800 pt-2">
            Role para baixo para ver todos os itens pendentes e homologá-los.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
};
