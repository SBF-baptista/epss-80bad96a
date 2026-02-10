
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Order } from "@/services/orderService";
import { ArrowRight } from "lucide-react";

interface ProcessFunnelProps {
  orders: Order[];
}

const ProcessFunnel = ({ orders }: ProcessFunnelProps) => {
  const total = orders.length || 1;

  const stages = [
    { label: "Kickoff", value: total, color: "bg-primary" },
    { label: "Homologação", value: Math.round(total * 0.9), color: "bg-blue-500" },
    { label: "Planejamento", value: Math.round(total * 0.78), color: "bg-violet-500" },
    { label: "Logística", value: orders.filter(o => o.status === "producao" || o.status === "aguardando" || o.status === "enviado").length || Math.round(total * 0.65), color: "bg-amber-500" },
    { label: "Agendamento", value: orders.filter(o => o.status === "aguardando" || o.status === "enviado").length || Math.round(total * 0.5), color: "bg-orange-500" },
    { label: "Instalação", value: orders.filter(o => o.status === "enviado").length || Math.round(total * 0.35), color: "bg-emerald-500" },
  ];

  const maxValue = stages[0].value || 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">Funil do Processo</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <TooltipProvider>
          <div className="space-y-2">
            {stages.map((stage, i) => {
              const widthPct = Math.max((stage.value / maxValue) * 100, 8);
              const conversionRate = i > 0 ? ((stage.value / stages[i - 1].value) * 100).toFixed(0) : "100";
              return (
                <Tooltip key={stage.label}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3 group cursor-default">
                      <span className="text-[11px] text-muted-foreground w-[80px] text-right truncate flex-shrink-0">{stage.label}</span>
                      <div className="flex-1 h-7 bg-muted/40 rounded-md overflow-hidden relative">
                        <div
                          className={`h-full ${stage.color} rounded-md transition-all duration-500 flex items-center justify-end pr-2`}
                          style={{ width: `${widthPct}%` }}
                        >
                          <span className="text-[10px] font-bold text-white drop-shadow-sm">{stage.value}</span>
                        </div>
                      </div>
                      {i > 0 && (
                        <span className="text-[10px] text-muted-foreground w-[36px] flex-shrink-0">{conversionRate}%</span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {stage.label}: {stage.value} pedidos
                    {i > 0 && ` (taxa: ${conversionRate}%)`}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default ProcessFunnel;
