
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

interface UseBarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
}

export const useBarcodeScanner = ({ onScan, onError, isActive }: UseBarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reader, setReader] = useState<BrowserMultiFormatReader | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const scanningRef = useRef<boolean>(false);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    setReader(codeReader);

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isActive && reader && videoRef.current) {
      startScanning();
    } else if (!isActive) {
      stopScanning();
    }

    return () => {
      if (!isActive) {
        stopScanning();
      }
    };
  }, [isActive, reader]);

  const cleanup = () => {
    stopScanning();
    if (reader) {
      reader.reset();
    }
    stopVideoStream();
  };

  const stopVideoStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startScanning = async () => {
    if (!reader || !videoRef.current || scanningRef.current) return;

    try {
      setIsScanning(true);
      scanningRef.current = true;
      
      console.log('Requesting camera access...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      setStream(mediaStream);
      setHasPermission(true);
      
      console.log('Camera access granted, starting scanner...');
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to be ready before starting decode attempts
        videoRef.current.onloadedmetadata = async () => {
          console.log('Video metadata loaded, attempting to play...');
          try {
            if (videoRef.current) {
              await videoRef.current.play();
              console.log('Video is now playing, starting scan loop...');
              startScanLoop();
            }
          } catch (playError) {
            console.error('Error playing video:', playError);
            onError?.('Erro ao reproduzir o vídeo da câmera.');
          }
        };
      }
      
    } catch (error) {
      console.error('Camera access error:', error);
      setHasPermission(false);
      setIsScanning(false);
      scanningRef.current = false;
      
      let errorMessage = 'Erro ao acessar câmera. Verifique as permissões.';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Acesso à câmera negado. Permita o acesso nas configurações do navegador.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Nenhuma câmera encontrada no dispositivo.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Câmera está sendo usada por outro aplicativo.';
        }
      }
      onError?.(errorMessage);
    }
  };

  const startScanLoop = () => {
    if (!scanningRef.current || !reader || !videoRef.current) return;

    console.log('Starting continuous scan loop...');
    
    const performScan = async () => {
      if (!scanningRef.current || !videoRef.current) return;

      try {
        const result = await reader.decodeOnceFromVideoDevice(null, videoRef.current);
        if (result && scanningRef.current) {
          console.log('Barcode detected:', result.getText());
          onScan(result.getText());
          // Don't stop scanning after successful read - keep scanning for more codes
        }
      } catch (error: any) {
        // Only log actual errors, not normal "not found" cases
        if (error.name && 
            error.name !== 'NotFoundException' && 
            error.name !== 'ChecksumException' && 
            error.name !== 'FormatException') {
          console.warn('Scanner error:', error.name, error.message);
          onError?.(error.message);
        }
        // For common "not found" errors, we just continue scanning silently
      }
    };

    // Start the scanning loop with intervals
    scanIntervalRef.current = setInterval(performScan, 100);
    
    // Also perform an immediate scan
    performScan();
  };

  const stopScanning = () => {
    console.log('Stopping scanner...');
    scanningRef.current = false;
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (reader) {
      reader.reset();
    }
    
    stopVideoStream();
    setIsScanning(false);
  };

  const handleRetryPermission = () => {
    setHasPermission(null);
    if (isActive) {
      setTimeout(startScanning, 100);
    }
  };

  return {
    videoRef,
    hasPermission,
    isScanning,
    handleRetryPermission,
  };
};
