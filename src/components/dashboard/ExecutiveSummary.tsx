
import { Card, CardContent } from "@/components/ui/card";
import { Order } from "@/services/orderService";
import { BarChart3, Zap } from "lucide-react";

interface ExecutiveSummaryProps {
  orders: Order[];
}

const ExecutiveSummary = ({ orders }: ExecutiveSummaryProps) => {
  const total = orders.length;
  const byStatus = {
    novos: orders.filter(o => o.status === "novos").length,
    producao: orders.filter(o => o.status === "producao").length,
    aguardando: orders.filter(o => o.status === "aguardando").length,
    enviado: orders.filter(o => o.status === "enviado").length,
    standby: orders.filter(o => o.status === "standby").length,
  };

  if (total === 0) return null;

  const summaryParts: string[] = [];

  if (byStatus.enviado > 0) {
    summaryParts.push(`${byStatus.enviado} enviados`);
  }
  if (byStatus.producao > 0) {
    summaryParts.push(`${byStatus.producao} em produção`);
  }
  if (byStatus.aguardando > 0) {
    summaryParts.push(`${byStatus.aguardando} aguardando envio`);
  }
  if (byStatus.standby > 0) {
    summaryParts.push(`${byStatus.standby} em stand-by`);
  }
  if (byStatus.novos > 0) {
    summaryParts.push(`${byStatus.novos} novos`);
  }

  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardContent className="px-4 py-3 flex items-center gap-3">
        <div className="p-1.5 rounded-md bg-primary/10 flex-shrink-0">
          <BarChart3 className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{total} pedidos</span> no período: {summaryParts.join(" · ")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExecutiveSummary;
