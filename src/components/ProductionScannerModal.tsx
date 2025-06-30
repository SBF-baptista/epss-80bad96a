
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Scan } from "lucide-react";
import { Order } from "@/services/orderService";
import { useProductionItems } from "@/hooks/useProductionItems";
import { useProductionScannerModal } from "@/hooks/useProductionScannerModal";
import ProductionForm from "./production/ProductionForm";
import ProductionItemsList from "./production/ProductionItemsList";

interface ProductionScannerModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const ProductionScannerModal = ({ order, isOpen, onClose, onUpdate }: ProductionScannerModalProps) => {
  const {
    imei,
    productionLineCode,
    scannerActive,
    scannerError,
    setImei,
    setProductionLineCode,
    setScannerActive,
    handleScanResult,
    handleScanError,
    clearForm,
    handleKeyPress,
    registerForceCleanup,
  } = useProductionScannerModal(order, isOpen);

  const {
    productionItems,
    isLoading,
    isScanning,
    handleScanItem,
    handleStartProduction,
    handleCompleteProduction,
  } = useProductionItems(order, isOpen);

  const onScanItemClick = async () => {
    const success = await handleScanItem(imei, productionLineCode);
    if (success) {
      clearForm();
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

  const onKeyPress = (e: React.KeyboardEvent) => {
    if (handleKeyPress(e) && !isScanning) {
      onScanItemClick();
    }
  };

  // Enhanced close handler with force cleanup
  const handleClose = () => {
    console.log('Modal close requested - ensuring cleanup...');
    setScannerActive(false);
    
    // Small delay to ensure scanner is deactivated before closing
    setTimeout(() => {
      onClose();
    }, 50);
  };

  if (!order) return null;

  const totalTrackers = order.trackers.reduce((sum, tracker) => sum + tracker.quantity, 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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
          <ProductionForm
            order={order}
            productionItems={productionItems}
            isScanning={isScanning}
            imei={imei}
            productionLineCode={productionLineCode}
            scannerActive={scannerActive}
            scannerError={scannerError}
            onImeiChange={setImei}
            onProductionLineCodeChange={setProductionLineCode}
            onScannerToggle={() => setScannerActive(!scannerActive)}
            onScanResult={handleScanResult}
            onScanError={handleScanError}
            onScanItem={onScanItemClick}
            onKeyPress={onKeyPress}
            onStartProduction={onStartProduction}
            onCompleteProduction={onCompleteProduction}
            onRegisterForceCleanup={registerForceCleanup}
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
