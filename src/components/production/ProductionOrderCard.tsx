import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Order } from "@/services/orderService";
import { cn } from "@/lib/utils";

export interface CardStageProgress {
  accessoriesDone: number;
  suppliesDone: number;
  totalDone: number;
  imeiCount: number;
}

export const STAGE_ACCENT: Record<string, { border: string; text: string; bg: string }> = {
  scheduled: { border: "border-l-stage-orders", text: "text-stage-orders", bg: "bg-stage-orders" },
  counting: { border: "border-l-stage-counting", text: "text-stage-counting", bg: "bg-stage-counting" },
  in_progress: { border: "border-l-stage-production", text: "text-stage-production", bg: "bg-stage-production" },
  verifying: { border: "border-l-stage-verification", text: "text-stage-verification", bg: "bg-stage-verification" },
};

interface Props {
  order: Order;
  status: string;
  progress?: CardStageProgress;
  canDrag: boolean;
  workflowLabel?: string;
  onClick: () => void;
  onDragStart: () => void;
  onViewDetails?: () => void;
}

const ProductionOrderCard = ({ order, status, progress, canDrag, workflowLabel, onClick, onDragStart, onViewDetails }: Props) => {
  const accent = STAGE_ACCENT[status] ?? STAGE_ACCENT.scheduled;
  const plates = order.plate && order.plate !== "Placa pendente" ? [order.plate] : [];
  const accN = order.accessories?.length ?? 0;
  const supN = order.supplies?.length ?? 0;
  const totalItems = order.trackers.length + accN + (order.modules?.length ?? 0) + supN;
  const pct = totalItems ? Math.round(((progress?.totalDone ?? 0) / totalItems) * 100) : 0;
  const imeis = progress?.imeiCount ?? 0;
  const verificationReady = !!order.countingCompletedAt && imeis > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={canDrag}
      onDragStart={onDragStart}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn("rounded-lg border border-border border-l-4 bg-card p-3 shadow-sm transition-shadow hover:shadow-md cursor-pointer space-y-3", accent.border)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-medium leading-snug text-foreground break-words">{order.company_name || "Cliente"}</p>
          <div className="flex flex-wrap gap-1">
            {plates.length ? plates.map((p) => (
              <span key={p} className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{p}</span>
            )) : <span className="text-xs text-muted-foreground">Placa pendente</span>}
          </div>
        </div>
        {onViewDetails && (
          <button
            onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Ver detalhes do pedido"
            aria-label="Ver detalhes do pedido"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
      </div>

      {status === "scheduled" && (
        <p className="text-xs text-muted-foreground">{totalItems} {totalItems === 1 ? "item previsto" : "itens previstos"} no kit</p>
      )}

      {status === "counting" && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Acessórios {progress?.accessoriesDone ?? 0}/{accN} · Insumos {progress?.suppliesDone ?? 0}/{supN}
          </p>
          <Progress value={pct} className="h-1.5" />
        </div>
      )}

      {status === "in_progress" && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{imeis}</span> {imeis === 1 ? "IMEI registrado" : "IMEIs registrados"}
        </p>
      )}

      {status === "verifying" && (
        <p className={cn("text-xs", verificationReady ? "text-success" : "text-muted-foreground")}>
          {verificationReady
            ? "Pronto para expedição"
            : !order.countingCompletedAt ? "Falta concluir a contagem" : "Falta registrar IMEI"}
        </p>
      )}

      {order.countingCompletedByEmail && status !== "counting" && (
        <p className="text-xs text-muted-foreground break-all">
          Contagem por {order.countingCompletedByEmail}
          {order.countingNotes && <span className="block break-words text-foreground">Obs.: {order.countingNotes}</span>}
        </p>
      )}

      {workflowLabel && (
        <Button size="sm" className="w-full min-h-9" onClick={(e) => { e.stopPropagation(); onClick(); }}>
          {workflowLabel}
        </Button>
      )}
    </div>
  );
};

export default ProductionOrderCard;
