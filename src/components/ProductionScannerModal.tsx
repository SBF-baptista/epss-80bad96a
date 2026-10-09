
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Scan } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    serialNumber,
    productionLineCode,
    scannerActive,
    scannerError,
    setImei,
    setSerialNumber,
    setProductionLineCode,
    setScannerActive,
    handleScanResult,
    handleScanError,
    clearForm,
    handleKeyPress,
    registerForceCleanup,
  } = useProductionScannerModal(order, isOpen);

  const handleStatusChange = () => {
    onUpdate();
    onClose();
  };

  const {
    productionItems,
    isLoading,
    isScanning,
    handleScanItem,
    handleCompleteProduction,
  } = useProductionItems(order, isOpen, undefined, handleStatusChange);

  const onScanItemClick = async () => {
    const success = await handleScanItem(imei, productionLineCode, serialNumber);
    if (success) {
      clearForm();
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

  const handleClose = () => {
    console.log('Modal close requested - ensuring cleanup...');
    setScannerActive(false);
    
    setTimeout(() => {
      onClose();
    }, 50);
  };

  if (!order) return null;

  const totalTrackers = order.trackers.reduce((sum, tracker) => sum + tracker.quantity, 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-4 py-3 sm:px-6 text-left">
          <DialogTitle className="flex items-center gap-2 text-base font-medium">
            <Scan className="h-5 w-5 text-primary" />
            Scanner de produção
          </DialogTitle>
          <DialogDescription>
            {order.company_name} · <span className="font-mono">{order.plate || `Pedido ${order.number}`}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border bg-muted/40 p-3">
            <div className="min-w-0 text-xs text-muted-foreground space-y-0.5">
              <p className="text-sm font-medium text-foreground">{order.company_name}</p>
              {order.customer_document_number && <p>CNPJ/CPF: {order.customer_document_number}</p>}
              {order.customer_phone && <p>Telefone: {order.customer_phone}</p>}
            </div>
            <Badge variant="secondary" className="shrink-0">{order.configurationType !== "N/A" ? order.configurationType : order.configuration || "Sem configuração"}</Badge>
          </div>
          <ProductionForm
            order={order}
            productionItems={productionItems}
            isScanning={isScanning}
            imei={imei}
            serialNumber={serialNumber}
            productionLineCode={productionLineCode}
            scannerActive={scannerActive}
            scannerError={scannerError}
            onImeiChange={setImei}
            onSerialNumberChange={setSerialNumber}
            onProductionLineCodeChange={setProductionLineCode}
            onScannerToggle={() => setScannerActive(!scannerActive)}
            onScanResult={handleScanResult}
            onScanError={handleScanError}
            onScanItem={onScanItemClick}
            onKeyPress={onKeyPress}
            onStartProduction={() => undefined}
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
