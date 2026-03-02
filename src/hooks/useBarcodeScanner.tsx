
import { useEffect, useRef, useCallback } from 'react';
import { useScannerControls } from './scanner/useScannerControls';
import { useZXingScanner } from './scanner/useZXingScanner';

interface UseBarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
}

export const useBarcodeScanner = ({ onScan, onError, isActive }: UseBarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoPlayingRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const {
    isScanning,
    startScanning,
    stopScanning,
  } = useScannerControls();

  const {
    startScanning: startZXingScanning,
    stopScanning: stopZXingScanning,
  } = useZXingScanner({
    onScan,
    onError,
    isActive,
    videoRef,
    videoPlayingRef,
    mountedRef,
  });

  useEffect(() => {
    if (isActive && !isScanning) {
      startScanning();
      // ZXing will manage the camera via decodeFromVideoDevice
      videoPlayingRef.current = true;
    } else if (!isActive) {
      stopScanning();
      stopZXingScanning();
      videoPlayingRef.current = false;
    }

    return () => {
      if (!isActive) {
        stopScanning();
        stopZXingScanning();
      }
    };
  }, [isActive, isScanning, startScanning, stopScanning, stopZXingScanning]);

  const forceCleanup = useCallback(() => {
    console.log('Force cleanup called...');
    stopScanning();
    stopZXingScanning();
    videoPlayingRef.current = false;
  }, [stopScanning, stopZXingScanning]);

  const handleRetryPermission = useCallback(() => {
    if (isActive && mountedRef.current) {
      stopZXingScanning();
      setTimeout(() => startZXingScanning(), 200);
    }
  }, [isActive, startZXingScanning, stopZXingScanning]);

  return {
    videoRef,
    hasPermission: isActive ? true : null,
    isScanning,
    handleRetryPermission,
    forceCleanup,
  };
};
