
import { Order } from "@/services/orderService";
import { ProductionItem } from "@/services/productionService";
import ProductionStatus from "./ProductionStatus";
import ProductionProgressBar from "./ProductionProgressBar";
import ProductionScannerTabs from "./ProductionScannerTabs";

interface ProductionFormProps {
  order: Order;
  productionItems: ProductionItem[];
  isScanning: boolean;
  imei: string;
  productionLineCode: string;
  scannerActive: boolean;
  scannerError: string;
  onImeiChange: (value: string) => void;
  onProductionLineCodeChange: (value: string) => void;
  onScannerToggle: () => void;
  onScanResult: (result: string) => void;
  onScanError: (error: string) => void;
  onScanItem: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onStartProduction: () => void;
  onCompleteProduction: () => void;
}

const ProductionForm = ({
  order,
  productionItems,
  isScanning,
  imei,
  productionLineCode,
  scannerActive,
  scannerError,
  onImeiChange,
  onProductionLineCodeChange,
  onScannerToggle,
  onScanResult,
  onScanError,
  onScanItem,
  onKeyPress,
  onStartProduction,
  onCompleteProduction,
}: ProductionFormProps) => {
  const totalTrackers = order.trackers.reduce((sum, tracker) => sum + tracker.quantity, 0);
  const scannedCount = productionItems.length;
  const isProductionComplete = scannedCount >= totalTrackers;

  return (
    <div className="space-y-6">
      <ProductionStatus
        orderNumber={order.number}
        scannedCount={scannedCount}
        totalTrackers={totalTrackers}
        isProductionComplete={isProductionComplete}
        onStartProduction={onStartProduction}
        onCompleteProduction={onCompleteProduction}
      />

      <ProductionProgressBar
        scannedCount={scannedCount}
        totalTrackers={totalTrackers}
      />

      <ProductionScannerTabs
        imei={imei}
        productionLineCode={productionLineCode}
        scannerActive={scannerActive}
        scannerError={scannerError}
        isScanning={isScanning}
        onImeiChange={onImeiChange}
        onProductionLineCodeChange={onProductionLineCodeChange}
        onScannerToggle={onScannerToggle}
        onScanResult={onScanResult}
        onScanError={onScanError}
        onScanItem={onScanItem}
        onKeyPress={onKeyPress}
      />
    </div>
  );
};

export default ProductionForm;
