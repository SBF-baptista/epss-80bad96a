
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Order } from "@/services/orderService";

interface AverageTimeByStageProps {
  orders: Order[];
}

const AverageTimeByStage = ({ orders }: AverageTimeByStageProps) => {
  // Simulated stage times with SLA targets
  const stages = [
    { label: "Kickoff", avgDays: 1.2, sla: 2, color: "bg-primary" },
    { label: "Homologação", avgDays: 2.8, sla: 3, color: "bg-blue-500" },
    { label: "Planejamento", avgDays: 1.5, sla: 2, color: "bg-violet-500" },
    { label: "Logística", avgDays: 3.4, sla: 3, color: "bg-amber-500" },
    { label: "Agendamento", avgDays: 2.1, sla: 2, color: "bg-orange-500" },
    { label: "Instalação", avgDays: 1.0, sla: 1, color: "bg-emerald-500" },
  ];

  const maxDays = Math.max(...stages.map(s => Math.max(s.avgDays, s.sla))) || 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">Tempo Médio por Etapa</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <TooltipProvider>
          <div className="space-y-3">
            {stages.map((stage) => {
              const widthPct = Math.max((stage.avgDays / maxDays) * 100, 5);
              const slaWidthPct = (stage.sla / maxDays) * 100;
              const isAboveSla = stage.avgDays > stage.sla;
              return (
                <Tooltip key={stage.label}>
                  <TooltipTrigger asChild>
                    <div className="space-y-1 cursor-default group">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">{stage.label}</span>
                        <span className={`text-[11px] font-bold ${isAboveSla ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                          {stage.avgDays.toFixed(1)}d
                          {isAboveSla && <span className="text-[9px] ml-1 text-red-500">▲ SLA</span>}
                        </span>
                      </div>
                      <div className="h-2 bg-muted/40 rounded-full overflow-hidden relative">
                        {/* SLA marker */}
                        <div
                          className="absolute top-0 bottom-0 w-px bg-foreground/20 z-10"
                          style={{ left: `${slaWidthPct}%` }}
                        />
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isAboveSla ? 'bg-red-500' : stage.color}`}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {stage.label}: {stage.avgDays.toFixed(1)} dias (SLA: {stage.sla}d)
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 rounded-full bg-primary" />
              <span className="text-[10px] text-muted-foreground">Dentro do SLA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 rounded-full bg-red-500" />
              <span className="text-[10px] text-muted-foreground">Acima do SLA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-px h-3 bg-foreground/20" />
              <span className="text-[10px] text-muted-foreground">Meta SLA</span>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default AverageTimeByStage;
