import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import KanbanBoard from "@/components/KanbanBoard";
import ShipmentPreparationModal from "@/components/ShipmentPreparationModal";
import ProductionCheckModal from "@/components/production/ProductionCheckModal";
import { fetchHomologationKits } from "@/services/homologationKitService";
import { getKitSchedules } from "@/services/kitScheduleService";
import { Order } from "@/services/orderService";
import { useAuth } from "@/hooks/useAuth";
import { useCentralRealtime } from "@/hooks/useCentralRealtime";

const Expedition = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [checkOrder, setCheckOrder] = useState<Order | null>(null);
  const isShipped = checkOrder?.status === "enviado";
  const address = checkOrder ? [checkOrder.installation_address_street, checkOrder.installation_address_number, checkOrder.installation_address_neighborhood, checkOrder.installation_address_city, checkOrder.installation_address_state, checkOrder.installation_address_postal_code].filter(Boolean).join(", ") : "";

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-foreground md:text-3xl">Expedição</h2>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-96 animate-pulse rounded-md bg-muted" />)}
          </div>
        ) : (
          <KanbanBoard
            schedules={schedules}
            kits={kits}
            onOrderUpdate={refetch}
            onShipmentClick={setSelectedOrder}
            onCheckClick={(order) => setCheckOrder(order)}
            mode="expedition"
          />
        )}
      </div>

      <ProductionCheckModal
        order={checkOrder}
        stage="verification"
        variant={isShipped ? "summary" : "expedition"}
        isOpen={!!checkOrder}
        onClose={() => setCheckOrder(null)}
        onUpdate={refetch}
        extraContent={isShipped && checkOrder ? (
          <div className="space-y-1 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="text-sm font-semibold text-foreground">Envio</p>
            <p>Endereço: <span className="text-foreground">{address || "Não informado"}</span></p>
            <p>Correios: <span className="font-mono text-foreground">{checkOrder.trackingCorreios || "—"}</span></p>
            <p>GoLog: <span className="font-mono text-foreground">{checkOrder.trackingGolog || "—"}</span></p>
            <p>Azul: <span className="font-mono text-foreground">{checkOrder.trackingAzul || "—"}</span></p>
            {checkOrder.trackingCode && <p>Rastreio anterior: <span className="font-mono text-foreground">{checkOrder.trackingCode}</span></p>}
            <p>Enviado por: <span className="text-foreground">{checkOrder.shippedByEmail || "Não informado"}</span>{checkOrder.shippedAt && ` · ${new Date(checkOrder.shippedAt).toLocaleString("pt-BR")}`}</p>
          </div>
        ) : undefined}
      />

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