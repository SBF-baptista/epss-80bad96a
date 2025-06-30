
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/services/orderService";

export const useProductionScannerModal = (order: Order | null, isOpen: boolean) => {
  const { toast } = useToast();
  const [imei, setImei] = useState("");
  const [productionLineCode, setProductionLineCode] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string>("");
  const [forceCleanupFn, setForceCleanupFn] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (order && isOpen) {
      // Reset form when modal opens
      setImei("");
      setProductionLineCode("");
      setScannerError("");
    }
  }, [order, isOpen]);

  // Enhanced cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      console.log('Production scanner modal closing - running enhanced cleanup...');
      setScannerActive(false);
      
      // Run force cleanup if available
      if (forceCleanupFn) {
        try {
          forceCleanupFn();
        } catch (error) {
          console.warn('Error in force cleanup:', error);
        }
      }
      
      // Additional cleanup with delay to ensure everything is stopped
      setTimeout(() => {
        if (forceCleanupFn) {
          try {
            forceCleanupFn();
          } catch (error) {
            console.warn('Error in delayed force cleanup:', error);
          }
        }
      }, 100);
    }
  }, [isOpen, forceCleanupFn]);

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

  const clearForm = () => {
    setImei("");
    setProductionLineCode("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && imei.trim() && productionLineCode.trim()) {
      return true; // Indicate that Enter was pressed with valid data
    }
    return false;
  };

  const registerForceCleanup = (cleanupFn: () => void) => {
    console.log('Registering force cleanup function...');
    setForceCleanupFn(() => cleanupFn);
  };

  return {
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
  };
};
