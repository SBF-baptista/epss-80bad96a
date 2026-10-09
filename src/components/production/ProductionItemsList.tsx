
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Scan } from "lucide-react";
import { ProductionItem } from "@/services/productionService";
import { SectionSkeleton } from "@/components/ui/loading";

interface ProductionItemsListProps {
  productionItems: ProductionItem[];
  totalTrackers: number;
  isLoading: boolean;
}

const ProductionItemsList = ({
  productionItems,
  totalTrackers,
  isLoading,
}: ProductionItemsListProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Itens processados</h3>
        <Badge variant="outline" className="font-mono">
          {productionItems.length} {productionItems.length === 1 ? "registrado" : "registrados"}
        </Badge>
      </div>
      
      {isLoading ? (
        <SectionSkeleton rows={3} message="Carregando itens..." />
      ) : productionItems.length > 0 ? (
        <div className="max-h-60 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {productionItems.map((item, index) => (
            <div key={item.id} className="flex items-center justify-between gap-3 bg-card p-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-label={`Item ${index + 1}`} />
                <div>
                  <p className="font-mono text-sm text-foreground break-all">{item.imei}</p>
                  {item.serial_number && (
                    <p className="text-xs text-muted-foreground">Serial: {item.serial_number}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Linha: {item.production_line_code}</p>
                </div>
              </div>
              <div className="hidden text-xs text-muted-foreground sm:block">
                {new Date(item.scanned_at).toLocaleString("pt-BR")}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
          <Scan className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm text-foreground">Nenhum item processado ainda</p>
          <p className="text-sm">Use o scanner ou entrada manual para começar</p>
        </div>
      )}
    </div>
  );
};

export default ProductionItemsList;
