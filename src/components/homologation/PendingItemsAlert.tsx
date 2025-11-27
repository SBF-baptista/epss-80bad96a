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

  // Sort all items by pending days (oldest first)
  const sortedItems = itemsWithMetrics
    .sort((a, b) => b.pendingDays - a.pendingDays);

  const totalPendingItems = allPendingItems.length;
  const maxPendingDays = Math.max(...itemsWithMetrics.map(item => item.pendingDays), 0);

  return (
    <Alert className="border-orange-500 bg-orange-50 mb-4">
      <AlertTriangle className="h-5 w-5 text-orange-600" />
      <AlertTitle className="text-orange-900 font-semibold mb-2">
        {totalPendingItems} {totalPendingItems === 1 ? 'Item Pendente' : 'Itens Pendentes'} de Homologação
      </AlertTitle>
      <AlertDescription>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-white border-orange-300 text-orange-800">
              <Package className="h-3 w-3 mr-1" />
              {totalPendingItems} {totalPendingItems === 1 ? 'item' : 'itens'}
            </Badge>
            
            {maxPendingDays > 0 && (
              <Badge variant="outline" className="bg-orange-100 border-orange-400 text-orange-900">
                <Clock className="h-3 w-3 mr-1" />
                Mais antigo: {maxPendingDays} {maxPendingDays === 1 ? 'dia' : 'dias'}
              </Badge>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium text-orange-900">Itens aguardando homologação:</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sortedItems.map((item, index) => (
                <div 
                  key={`${item.item_name}-${index}`}
                  className="flex items-start justify-between text-sm bg-white p-3 rounded border border-orange-200 hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-start gap-2 flex-1">
                    <Package className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-orange-900 break-words">{item.item_name}</p>
                      <p className="text-xs text-orange-700 mt-0.5 capitalize">{item.item_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs ml-3 flex-shrink-0">
                    <div className="text-center">
                      <div className="font-semibold text-orange-700">{item.kitsCount}</div>
                      <div className="text-orange-600">{item.kitsCount === 1 ? 'kit' : 'kits'}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-red-700">{item.pendingDays}</div>
                      <div className="text-red-600">{item.pendingDays === 1 ? 'dia' : 'dias'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-orange-800 pt-2">
            Role para baixo para ver todos os itens pendentes e homologá-los.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
};
