import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import KanbanBoard from "@/components/KanbanBoard";
import ShipmentPreparationModal from "@/components/ShipmentPreparationModal";
import { fetchHomologationKits } from "@/services/homologationKitService";
import { getKitSchedules } from "@/services/kitScheduleService";
import { Order } from "@/services/orderService";
import { useAuth } from "@/hooks/useAuth";
import { useCentralRealtime } from "@/hooks/useCentralRealtime";

const Expedition = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: schedules = [], isLoading, refetch } = useQuery({
    queryKey: ["kit-schedules"],
    queryFn: getKitSchedules,
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    retry: (count, error) => !/401|403|404/.test(String(error)) && count < 2,
  });

  const { data: kits = [] } = useQuery({
    queryKey: ["homologation-kits"],
    queryFn: () => fetchHomologationKits(),
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
    retry: (count, error) => !/401|403|404/.test(String(error)) && count < 2,
  });

  const invalidateSchedules = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["kit-schedules"] });
  }, [queryClient]);
  useCentralRealtime("kit_schedules", invalidateSchedules);

  return (
    <div className="min-h-full bg-muted/30 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">Expedição</h2>
          <p className="text-sm text-muted-foreground md:text-base">Preparação e acompanhamento dos envios</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1].map((item) => <div key={item} className="h-96 animate-pulse rounded-md bg-muted" />)}
          </div>
        ) : (
          <KanbanBoard
            schedules={schedules}
            kits={kits}
            onOrderUpdate={refetch}
            onShipmentClick={setSelectedOrder}
            mode="expedition"
          />
        )}
      </div>

      {selectedOrder && (
        <ShipmentPreparationModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={refetch}
        />
      )}
    </div>
  );
};

export default Expedition;