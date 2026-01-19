import { Button } from "@/components/ui/button";
import { CheckCircle, Play } from "lucide-react";

interface ProductionStatusProps {
  orderNumber: string;
  scannedCount: number;
  totalTrackers: number;
  isProductionComplete: boolean;
  currentStatus: string;
  onStartProduction: () => void;
  onCompleteProduction: () => void;
}

const ProductionStatus = ({
  orderNumber,
  scannedCount,
  totalTrackers,
  isProductionComplete,
  currentStatus,
  onStartProduction,
  onCompleteProduction,
}: ProductionStatusProps) => {
  // Show "Iniciar Produção" for scheduled (Pedidos) status
  const showStartButton = currentStatus === 'novos' || currentStatus === 'scheduled';
  // Show "Concluir Produção" for in_progress (Em Produção) status
  const showCompleteButton = currentStatus === 'producao' || currentStatus === 'in_progress';

  return (
    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div>
        <h3 className="font-semibold text-blue-900">Status da Produção</h3>
        <p className="text-sm text-blue-700">
          {scannedCount} de {totalTrackers} rastreadores escaneados
        </p>
      </div>
      <div className="flex gap-2">
        {showStartButton && (
          <Button onClick={onStartProduction} className="bg-primary hover:bg-primary/90">
            <Play className="h-4 w-4 mr-2" />
            Iniciar Produção
          </Button>
        )}
        {showCompleteButton && (
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
