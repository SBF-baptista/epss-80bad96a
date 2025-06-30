
import { useEffect } from 'react';
import { useVideoStream } from './scanner/useVideoStream';
import { useScannerControls } from './scanner/useScannerControls';
import { useZXingScanner } from './scanner/useZXingScanner';

interface UseBarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
}

export const useBarcodeScanner = ({ onScan, onError, isActive }: UseBarcodeScannerProps) => {
  const {
    videoRef,
    hasPermission,
    videoPlayingRef,
    mountedRef,
    startVideoStream,
    cleanup,
    handleRetryPermission,
  } = useVideoStream({ isActive, onError });

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
      const initializeScanner = async () => {
        startScanning();
        const videoStarted = await startVideoStream();
        if (videoStarted) {
          // Wait for video to be ready then start ZXing scanning
          setTimeout(() => {
            if (videoPlayingRef.current && mountedRef.current) {
              startZXingScanning();
            }
          }, 1000);
        } else {
          stopScanning();
        }
      };
      
      initializeScanner();
    } else if (!isActive) {
      stopScanning();
      stopZXingScanning();
    }

    return () => {
      if (!isActive) {
        stopScanning();
        stopZXingScanning();
      }
    };
  }, [isActive, isScanning, startVideoStream, startScanning, stopScanning, startZXingScanning, stopZXingScanning, videoPlayingRef, mountedRef]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    videoRef,
    hasPermission,
    isScanning,
    handleRetryPermission,
  };
};
