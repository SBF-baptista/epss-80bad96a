
import { useEffect, useRef, useCallback, useState } from 'react';
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
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const initializingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const {
    isScanning,
    startScanning: startScanningState,
    stopScanning: stopScanningState,
  } = useScannerControls();

  const {
    startScanning: startZXingScanning,
    stopScanning: stopZXingScanning,
  } = useZXingScanner({
    onScan,
    onError: (err) => {
      // Don't surface "Erro ao iniciar o scanner" if it's just a transient init issue
      console.warn('ZXing error:', err);
    },
    isActive: false, // We control start/stop manually
    videoRef,
    videoPlayingRef,
    mountedRef,
  });

  // Start camera + scanner when isActive becomes true (triggered by user gesture)
  useEffect(() => {
    if (isActive && !initializingRef.current) {
      initializingRef.current = true;
      
      const initCamera = async () => {
        try {
          console.log('Requesting camera access from user gesture...');
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 640 },
              height: { ideal: 480 },
            }
          });

          if (!mountedRef.current) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }

          setHasPermission(true);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            videoPlayingRef.current = true;
            console.log('Camera video playing, starting ZXing scanner...');
            startScanningState();
            // Small delay to ensure video is fully ready
            setTimeout(() => {
              if (mountedRef.current) {
                startZXingScanning();
              }
            }, 300);
          }
        } catch (error) {
          console.error('Camera access error:', error);
          if (mountedRef.current) {
            setHasPermission(false);
            onError?.('Erro ao acessar câmera. Verifique as permissões.');
          }
        } finally {
          initializingRef.current = false;
        }
      };

      initCamera();
    } else if (!isActive) {
      initializingRef.current = false;
      stopScanningState();
      stopZXingScanning();
      videoPlayingRef.current = false;

      // Stop camera tracks
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => {
          t.stop();
          console.log('Camera track stopped');
        });
        videoRef.current.srcObject = null;
      }
      setHasPermission(null);
    }
  }, [isActive]);

  const forceCleanup = useCallback(() => {
    console.log('Force cleanup called...');
    stopScanningState();
    stopZXingScanning();
    videoPlayingRef.current = false;
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  }, [stopScanningState, stopZXingScanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      forceCleanup();
    };
  }, [forceCleanup]);

  const handleRetryPermission = useCallback(() => {
    setHasPermission(null);
  }, []);

  return {
    videoRef,
    hasPermission,
    isScanning,
    handleRetryPermission,
    forceCleanup,
  };
};
