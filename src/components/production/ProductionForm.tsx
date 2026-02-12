import { Order } from "@/services/orderService";
import { ProductionItem } from "@/services/productionService";
import ProductionScannerTabs from "./ProductionScannerTabs";

interface ProductionFormProps {
  order: Order;
  productionItems: ProductionItem[];
  isScanning: boolean;
  imei: string;
  serialNumber: string;
  productionLineCode: string;
  scannerActive: boolean;
  scannerError: string;
  onImeiChange: (value: string) => void;
  onSerialNumberChange: (value: string) => void;
  onProductionLineCodeChange: (value: string) => void;
  onScannerToggle: () => void;
  onScanResult: (result: string) => void;
  onScanError: (error: string) => void;
  onScanItem: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onStartProduction: () => void;
  onCompleteProduction: () => void;
  onRegisterForceCleanup: (cleanupFn: () => void) => void;
}

const ProductionForm = ({
  order,
  productionItems,
  isScanning,
  imei,
  serialNumber,
  productionLineCode,
  scannerActive,
  scannerError,
  onImeiChange,
  onSerialNumberChange,
  onProductionLineCodeChange,
  onScannerToggle,
  onScanResult,
  onScanError,
  onScanItem,
  onKeyPress,
  onStartProduction,
  onCompleteProduction,
  onRegisterForceCleanup,
}: ProductionFormProps) => {
  const totalTrackers = order.trackers.reduce((sum, tracker) => sum + tracker.quantity, 0);
  const scannedCount = productionItems.length;
  const isProductionComplete = scannedCount >= totalTrackers;

  return (
    <div className="space-y-6">
      <ProductionScannerTabs
        imei={imei}
        serialNumber={serialNumber}
        productionLineCode={productionLineCode}
        scannerActive={scannerActive}
        scannerError={scannerError}
        isScanning={isScanning}
        onImeiChange={onImeiChange}
        onSerialNumberChange={onSerialNumberChange}
        onProductionLineCodeChange={onProductionLineCodeChange}
        onScannerToggle={onScannerToggle}
        onScanResult={onScanResult}
        onScanError={onScanError}
        onScanItem={onScanItem}
        onKeyPress={onKeyPress}
        onRegisterForceCleanup={onRegisterForceCleanup}
      />
    </div>
  );
};

export default ProductionForm;
