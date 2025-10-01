import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InstallationOrder } from "@/types/installationOrder";
import { Calendar, User } from "lucide-react";

interface InstallationOrderCardProps {
  order: InstallationOrder;
  onClick: () => void;
  onDragStart: () => void;
}

const InstallationOrderCard = ({ order, onClick, onDragStart }: InstallationOrderCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "scheduled":
        return "Agendado";
      case "in_progress":
        return "Em Andamento";
      case "completed":
        return "Concluído";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  return (
    <Card
      className="p-3 sm:p-4 cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary"
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Customer Name - Title */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-base text-foreground line-clamp-2">
            {order.customer_name}
          </h4>
          <Badge className={`${getStatusColor(order.status)} text-xs whitespace-nowrap`}>
            {getStatusLabel(order.status)}
          </Badge>
        </div>

        {/* Technician Name */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span className="truncate">{order.technician_name}</span>
        </div>

        {/* Vehicle Info */}
        {order.vehicle_brand && order.vehicle_model && (
          <div className="text-sm text-muted-foreground">
            <p className="truncate">
              {order.vehicle_brand} {order.vehicle_model}
              {order.vehicle_year && ` (${order.vehicle_year})`}
            </p>
          </div>
        )}

        {/* Kit Name */}
        <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
          <span className="truncate block">Kit: {order.kit_name}</span>
        </div>

        {/* Scheduled Date */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Calendar className="h-3 w-3" />
          <span>
            {new Date(order.scheduled_date).toLocaleDateString("pt-BR")}
            {order.installation_time && ` às ${order.installation_time}`}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default InstallationOrderCard;
