
import { Badge } from "@/components/ui/badge";
import { Scan } from "lucide-react";
import { ProductionItem } from "@/services/productionService";

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
        <h3 className="font-semibold">Itens Processados</h3>
        <Badge variant="outline" className="font-mono">
          {productionItems.length} / {totalTrackers}
        </Badge>
      </div>
      
      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">Carregando itens...</p>
        </div>
      ) : productionItems.length > 0 ? (
        <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg">
          {productionItems.map((item, index) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="font-mono text-xs">
                  #{index + 1}
                </Badge>
                <div>
                  <p className="font-medium font-mono">{item.imei}</p>
                  <p className="text-sm text-gray-600">Linha: {item.production_line_code}</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(item.scanned_at).toLocaleString("pt-BR")}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
          <Scan className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Nenhum item processado ainda</p>
          <p className="text-sm">Use o scanner ou entrada manual para começar</p>
        </div>
      )}
    </div>
  );
};

export default ProductionItemsList;
