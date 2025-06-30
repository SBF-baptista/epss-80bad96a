
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface ProductionStatusProps {
  orderNumber: string;
  scannedCount: number;
  totalTrackers: number;
  isProductionComplete: boolean;
  onStartProduction: () => void;
  onCompleteProduction: () => void;
}

const ProductionStatus = ({
  orderNumber,
  scannedCount,
  totalTrackers,
  isProductionComplete,
  onStartProduction,
  onCompleteProduction,
}: ProductionStatusProps) => {
  return (
    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div>
        <h3 className="font-semibold text-blue-900">Status da Produção</h3>
        <p className="text-sm text-blue-700">
          {scannedCount} de {totalTrackers} rastreadores escaneados
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onStartProduction} variant="outline" size="sm">
          Iniciar Produção
        </Button>
        {isProductionComplete && (
          <Button onClick={onCompleteProduction} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Concluir Produção
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProductionStatus;
