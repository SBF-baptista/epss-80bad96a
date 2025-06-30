
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Scan } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/services/orderService";
import { useProductionItems } from "@/hooks/useProductionItems";
import ProductionStatus from "./production/ProductionStatus";
import ProductionProgressBar from "./production/ProductionProgressBar";
import ProductionScannerTabs from "./production/ProductionScannerTabs";
import ProductionItemsList from "./production/ProductionItemsList";

interface ProductionScannerModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const ProductionScannerModal = ({ order, isOpen, onClose, onUpdate }: ProductionScannerModalProps) => {
  const { toast } = useToast();
  const [imei, setImei] = useState("");
  const [productionLineCode, setProductionLineCode] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string>("");

  const {
    productionItems,
    isLoading,
    isScanning,
    handleScanItem,
    handleStartProduction,
    handleCompleteProduction,
  } = useProductionItems(order, isOpen);

  useEffect(() => {
    if (order && isOpen) {
      // Reset form when modal opens
      setImei("");
      setProductionLineCode("");
      setScannerError("");
    }
  }, [order, isOpen]);

  // Clean up scanner when modal closes
  useEffect(() => {
    if (!isOpen) {
      setScannerActive(false);
    }
  }, [isOpen]);

  const handleScanResult = (result: string) => {
    console.log('Scan result received:', result);
    setScannerError("");
    
    // Auto-fill IMEI field with scanned result
    setImei(result.trim());
    
    toast({
      title: "Código escaneado com sucesso",
      description: `IMEI: ${result}`,
    });
    
    // Focus on production line code field after a short delay
    setTimeout(() => {
      const lineCodeInput = document.getElementById('lineCode');
      if (lineCodeInput) {
        lineCodeInput.focus();
      }
    }, 100);
  };

  const handleScanError = (error: string) => {
    console.error('Scanner error:', error);
    setScannerError(error);
    toast({
      title: "Erro no scanner",
      description: error,
      variant: "destructive"
    });
  };

  const onScanItemClick = async () => {
    const success = await handleScanItem(imei, productionLineCode);
    if (success) {
      // Clear form
      setImei("");
      setProductionLineCode("");
    }
  };

  const onStartProduction = async () => {
    const success = await handleStartProduction();
    if (success) {
      onUpdate();
    }
  };

  const onCompleteProduction = async () => {
    const success = await handleCompleteProduction();
    if (success) {
      onUpdate();
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isScanning && imei.trim() && productionLineCode.trim()) {
      onScanItemClick();
    }
  };

  if (!order) return null;

  const totalTrackers = order.trackers.reduce((sum, tracker) => sum + tracker.quantity, 0);
  const scannedCount = productionItems.length;
  const isProductionComplete = scannedCount >= totalTrackers;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Scanner de Produção - {order.number}
          </DialogTitle>
          <DialogDescription>
            Escaneie os rastreadores durante o processo de produção
          </DialogDescription>
        </DialogHeader>

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

          <Separator />

          <ProductionScannerTabs
            imei={imei}
            productionLineCode={productionLineCode}
            scannerActive={scannerActive}
            scannerError={scannerError}
            isScanning={isScanning}
            onImeiChange={setImei}
            onProductionLineCodeChange={setProductionLineCode}
            onScannerToggle={() => setScannerActive(!scannerActive)}
            onScanResult={handleScanResult}
            onScanError={handleScanError}
            onScanItem={onScanItemClick}
            onKeyPress={handleKeyPress}
          />

          <Separator />

          <ProductionItemsList
            productionItems={productionItems}
            totalTrackers={totalTrackers}
            isLoading={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductionScannerModal;
