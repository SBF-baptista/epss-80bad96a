import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import InstallationOrderCard from "./InstallationOrderCard";
import type { InstallationOrder } from "@/types/installationOrder";

interface InstallationKanbanColumnProps {
  title: string;
  installationOrders: InstallationOrder[];
  color: string;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onOrderClick: (order: InstallationOrder) => void;
  onDragStart: (order: InstallationOrder) => void;
}

const InstallationKanbanColumn = ({
  title,
  installationOrders,
  color,
  onDragOver,
  onDrop,
  onOrderClick,
  onDragStart,
}: InstallationKanbanColumnProps) => {
  return (
    <Card
      className={`${color} h-full flex flex-col overflow-hidden`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="p-3 sm:p-4 border-b bg-background/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm sm:text-base text-foreground">
            {title}
          </h3>
          <Badge variant="secondary" className="text-xs sm:text-sm">
            {installationOrders.length}
          </Badge>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {installationOrders.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Nenhum pedido
          </div>
        ) : (
          installationOrders.map((order) => (
            <InstallationOrderCard
              key={order.id}
              order={order}
              onClick={() => onOrderClick(order)}
              onDragStart={() => onDragStart(order)}
            />
          ))
        )}
      </div>
    </Card>
  );
};

export default InstallationKanbanColumn;
