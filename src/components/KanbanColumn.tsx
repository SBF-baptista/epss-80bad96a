
import { Order } from "@/services/orderService";
import ProductionOrderCard, { CardStageProgress, STAGE_ACCENT } from "./production/ProductionOrderCard";
import { ClipboardCheck, ClipboardList, Cog, Package, Truck } from "lucide-react";

interface KanbanColumnProps {
  title: string;
  orders: Order[];
  color: string;
  status: string;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onOrderClick: (order: Order) => void;
  onOrderViewDetailsClick?: (order: Order) => void;
  onDragStart: (order: Order) => void;
  onScanClick?: (order: Order) => void;
  onShipmentClick?: (order: Order) => void;
  onWorkflowClick?: (order: Order) => void;
  workflowLabel?: string;
  canDrag?: boolean;
  mode?: "production" | "expedition";
  progressById?: Record<string, CardStageProgress>;
}

const statusIcons: Record<string, React.ElementType> = {
  "scheduled": ClipboardList,
  "counting": ClipboardCheck,
  "in_progress": Cog,
  "verifying": ClipboardCheck,
  "expedition_check": ClipboardCheck,
  "completed": Package,
  "shipped": Truck,
};

const KanbanColumn = ({
  title,
  orders,
  status,
  onDragOver,
  onDrop,
  onOrderClick,
  onOrderViewDetailsClick,
  onDragStart,
  canDrag = false,
  onWorkflowClick,
  workflowLabel,
  progressById = {},
}: KanbanColumnProps) => {
  const Icon = statusIcons[status] || ClipboardList;
    const accent = STAGE_ACCENT[status] ?? STAGE_ACCENT.scheduled;
    return (
      <section className="flex h-full min-h-80 flex-col overflow-hidden rounded-xl border border-border bg-muted/40" onDragOver={onDragOver} onDrop={onDrop} aria-label={title}>
        <div className={`h-1 ${accent.bg}`} />
        <header className="flex items-center gap-2 border-b border-border bg-card px-3 py-2.5">
          <Icon className={`h-4 w-4 ${accent.text}`} />
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{orders.length}</span>
        </header>
        <div className="flex-1 space-y-2.5 overflow-y-auto p-2.5 kanban-scroll max-h-[70vh]">
          {orders.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">Nenhum pedido nesta etapa</p>
          ) : orders.map((order) => (
            <ProductionOrderCard
              key={order.id}
              order={order}
              status={status}
              progress={progressById[order.id]}
              canDrag={canDrag}
              workflowLabel={workflowLabel}
              onClick={() => onWorkflowClick ? onWorkflowClick(order) : onOrderClick(order)}
              onDragStart={() => onDragStart(order)}
              onViewDetails={onOrderViewDetailsClick ? () => onOrderViewDetailsClick(order) : undefined}
            />
          ))}
        </div>
      </section>
    );
};

export default KanbanColumn;
