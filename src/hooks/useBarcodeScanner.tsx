
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

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    setReader(codeReader);

    return () => {
      codeReader.reset();
      stopVideoStream();
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
      }
      
      const scanLoop = () => {
        if (!scanningRef.current || !videoRef.current) return;
        
        reader.decodeFromVideoDevice(null, videoRef.current, (result, error) => {
          if (!scanningRef.current) return;
          
          if (result) {
            console.log('Barcode detected:', result.getText());
            onScan(result.getText());
          }
          
          if (error && error.name !== 'NotFoundException') {
            console.warn('Scanner error (non-critical):', error.name, error.message);
            if (error.name !== 'ChecksumException' && error.name !== 'FormatException') {
              onError?.(error.message);
            }
          }
        });
      };
      
      setTimeout(scanLoop, 100);
      
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

  const stopScanning = () => {
    console.log('Stopping scanner...');
    scanningRef.current = false;
    
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
