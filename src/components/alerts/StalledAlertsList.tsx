import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Car, Clock, Factory, CalendarClock, ClipboardList } from "lucide-react";
import type { StalledAlert, StalledAlertType } from "@/services/stalledAlertsService";

const iconByType: Record<StalledAlertType, React.ComponentType<{ className?: string }>> = {
  planning: ClipboardList,
  production: Factory,
  scheduling: CalendarClock,
};

const severity = (days: number) => {
  if (days >= 7) return "destructive" as const;
  if (days >= 5) return "default" as const;
  return "secondary" as const;
};

interface Props {
  alerts: StalledAlert[];
  onNavigated?: () => void;
  compact?: boolean;
}

export const StalledAlertsList = ({ alerts, onNavigated, compact }: Props) => {
  const navigate = useNavigate();
  if (!alerts.length) {
    return (
      <div className="text-sm text-muted-foreground py-6 text-center">
        Nenhum veículo ou cliente parado no momento. 🎉
      </div>
    );
  }
  return (
    <div className={`divide-y divide-border ${compact ? "" : "rounded-md border"}`}>
      {alerts.map((a) => {
        const Icon = iconByType[a.type];
        return (
          <div key={a.id} className="flex items-center gap-3 p-3">
            <div className="p-2 rounded-md bg-muted shrink-0">
              <Icon className="h-4 w-4 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-foreground truncate">
                  {a.customerName}
                </span>
                {a.plate && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Car className="h-3 w-3" /> {a.plate}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <span>{a.stageLabel}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  há {a.daysStalled} {a.daysStalled === 1 ? "dia" : "dias"}
                </span>
              </div>
            </div>
            <Badge variant={severity(a.daysStalled)} className="shrink-0">
              {a.daysStalled}d
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                navigate(a.link);
                onNavigated?.();
              }}
            >
              Ver <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export const StalledAlertsEmptyIcon = AlertTriangle;
