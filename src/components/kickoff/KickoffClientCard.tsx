import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Car, Edit, Shield } from "lucide-react";
import type { KickoffClient } from "@/services/kickoffService";

interface KickoffClientCardProps {
  client: KickoffClient;
  daysInKickoff: number;
  onEditKickoff: (saleSummaryId: number, companyName: string) => void;
}

export const KickoffClientCard = ({ client, daysInKickoff, onEditKickoff }: KickoffClientCardProps) => {
  // Get status styling based on days pending
  const getStatusConfig = () => {
    if (daysInKickoff > 10) {
      return {
        badgeClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800",
        accentClass: "bg-red-500",
        label: `${daysInKickoff} dias pendente`
      };
    } else if (daysInKickoff > 5) {
      return {
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
        accentClass: "bg-amber-500",
        label: `${daysInKickoff} dias pendente`
      };
    } else if (daysInKickoff > 0) {
      return {
        badgeClass: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700",
        accentClass: "bg-slate-400",
        label: `${daysInKickoff} ${daysInKickoff === 1 ? 'dia' : 'dias'} pendente`
      };
    }
    return {
      badgeClass: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700",
      accentClass: "bg-slate-400",
      label: "Novo"
    };
  };

  const statusConfig = getStatusConfig();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group relative overflow-hidden border border-border/60 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 cursor-pointer h-full">
        {/* Accent bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${statusConfig.accentClass}`} />
        
        <CardContent className="p-5 pt-6 flex flex-col h-full">
          {/* Client name */}
          <h3 className="font-semibold text-base text-foreground leading-tight line-clamp-2 mb-3">
            {client.company_name}
          </h3>

          {/* Status badge */}
          {daysInKickoff > 0 && (
            <Badge 
              variant="outline" 
              className={`text-xs font-medium w-fit mb-3 ${statusConfig.badgeClass}`}
            >
              <Clock className="h-3 w-3 mr-1.5" />
              {statusConfig.label}
            </Badge>
          )}

          {/* Vehicle count */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Car className="h-4 w-4" />
            <span>{client.total_vehicles} {client.total_vehicles === 1 ? 'veículo' : 'veículos'}</span>
          </div>

          {/* Blocking indicator */}
          {client.needs_blocking && (
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="destructive" className="text-xs font-medium">
                <Shield className="h-3 w-3 mr-1" />
                Bloqueio
              </Badge>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action button */}
          <Button
            size="sm"
            onClick={() => onEditKickoff(client.sale_summary_id, client.company_name)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 group-hover:shadow-sm"
          >
            <Edit className="h-4 w-4 mr-2" />
            Realizar Kickoff
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
