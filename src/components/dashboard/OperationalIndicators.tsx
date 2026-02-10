
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Order } from "@/services/orderService";
import { Info } from "lucide-react";

interface OperationalIndicatorsProps {
  orders: Order[];
}

const OperationalIndicators = ({ orders }: OperationalIndicatorsProps) => {
  const total = orders.length || 1;

  const standbyOrders = orders.filter(o => o.status === "standby").length;
  const waitingOrders = orders.filter(o => o.status === "aguardando").length;

  const indicators = [
    {
      label: "Pendência de Kit",
      value: total > 0 ? ((standbyOrders / total) * 100).toFixed(1) : "0",
      color: standbyOrders > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
      barColor: standbyOrders > 0 ? "bg-amber-500" : "bg-emerald-500",
      tooltip: "Percentual de pedidos em stand-by, geralmente associados a pendência de kit ou componentes."
    },
    {
      label: "Aguardando Agendamento",
      value: total > 0 ? ((waitingOrders / total) * 100).toFixed(1) : "0",
      color: waitingOrders > 0 ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400",
      barColor: waitingOrders > 0 ? "bg-blue-500" : "bg-emerald-500",
      tooltip: "Pedidos prontos aguardando agendamento de instalação."
    },
    {
      label: "Instalação Reagendada",
      value: "4.2",
      color: "text-orange-600 dark:text-orange-400",
      barColor: "bg-orange-500",
      tooltip: "Percentual de instalações que foram reagendadas ao menos uma vez."
    },
    {
      label: "Taxa de Retrabalho",
      value: "2.1",
      color: "text-red-600 dark:text-red-400",
      barColor: "bg-red-500",
      tooltip: "Instalações que exigiram retorno ao local por falha ou problema técnico."
    },
    {
      label: "Taxa de Exceções",
      value: "1.5",
      color: "text-violet-600 dark:text-violet-400",
      barColor: "bg-violet-500",
      tooltip: "Pedidos que fugiram do fluxo padrão (configuração especial, emergência, etc.)."
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">Indicadores Operacionais</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <TooltipProvider>
          <div className="space-y-3.5">
            {indicators.map((ind) => {
              const numValue = parseFloat(ind.value);
              return (
                <div key={ind.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{ind.label}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px] text-xs">
                          {ind.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className={`text-sm font-bold ${ind.color}`}>{ind.value}%</span>
                  </div>
                  <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                    <div className={`h-full ${ind.barColor} rounded-full transition-all duration-500`} style={{ width: `${Math.min(numValue, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default OperationalIndicators;
