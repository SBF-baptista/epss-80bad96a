
import { useState, useCallback } from 'react';

export const useScannerControls = () => {
  const [isScanning, setIsScanning] = useState(false);

  const startScanning = useCallback(() => {
    console.log('Starting scanning state...');
    setIsScanning(true);
  }, []);

  const stopScanning = useCallback(() => {
    console.log('Stopping scanning state...');
    setIsScanning(false);
  }, []);

  return {
    isScanning,
    startScanning,
    stopScanning,
  };
};
