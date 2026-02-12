
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/services/orderService";

export const useProductionScannerModal = (order: Order | null, isOpen: boolean) => {
  const { toast } = useToast();
  const [imei, setImei] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [productionLineCode, setProductionLineCode] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string>("");
  const [forceCleanupFn, setForceCleanupFn] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (order && isOpen) {
      setImei("");
      setSerialNumber("");
      setProductionLineCode("");
      setScannerError("");
    }
  }, [order, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      console.log('Production scanner modal closing - running enhanced cleanup...');
      setScannerActive(false);
      
      if (forceCleanupFn) {
        try {
          forceCleanupFn();
        } catch (error) {
          console.warn('Error in force cleanup:', error);
        }
      }
      
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
    
    setImei(result.trim());
    
    toast({
      title: "Código escaneado com sucesso",
      description: `IMEI: ${result}`,
    });
    
    setTimeout(() => {
      const serialInput = document.getElementById('serial-number');
      if (serialInput) {
        serialInput.focus();
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
    setSerialNumber("");
    setProductionLineCode("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && imei.trim() && productionLineCode.trim()) {
      return true;
    }
    return false;
  };

  const registerForceCleanup = (cleanupFn: () => void) => {
    console.log('Registering force cleanup function...');
    setForceCleanupFn(() => cleanupFn);
  };

  return {
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
  };
};
