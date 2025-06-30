
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, Scan } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
  onToggle: () => void;
}

const BarcodeScanner = ({ onScan, onError, isActive, onToggle }: BarcodeScannerProps) => {
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
      
      // Request camera permission with specific constraints
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: 'environment' }, // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      setStream(mediaStream);
      setHasPermission(true);
      
      console.log('Camera access granted, starting scanner...');
      
      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      // Start decoding with improved error handling
      const scanLoop = () => {
        if (!scanningRef.current || !videoRef.current) return;
        
        reader.decodeFromVideoDevice(null, videoRef.current, (result, error) => {
          if (!scanningRef.current) return;
          
          if (result) {
            console.log('Barcode detected:', result.getText());
            onScan(result.getText());
            // Continue scanning for next code without stopping
          }
          
          // Only report errors that are not "NotFoundException" 
          // (which is normal when no barcode is in view)
          if (error && error.name !== 'NotFoundException') {
            console.warn('Scanner error (non-critical):', error.name, error.message);
            // Don't report NotFoundException to user as it's expected
            if (error.name !== 'ChecksumException' && error.name !== 'FormatException') {
              onError?.(error.message);
            }
          }
        });
      };
      
      // Small delay to ensure video is ready
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

  if (hasPermission === false) {
    return (
      <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
        <CameraOff className="h-8 w-8 mx-auto mb-2 text-red-500" />
        <p className="text-red-700 font-medium mb-1">Acesso à câmera negado</p>
        <p className="text-sm text-red-600 mb-3">
          Permita o acesso à câmera para escanear códigos de barras
        </p>
        <Button onClick={handleRetryPermission} variant="outline" size="sm">
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Scanner de Código de Barras</h4>
        <Button
          onClick={onToggle}
          variant={isActive ? "default" : "outline"}
          size="sm"
          className="flex items-center gap-2"
        >
          {isActive ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {isActive ? "Parar Scanner" : "Iniciar Scanner"}
        </Button>
      </div>

      {isActive && (
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full h-48 bg-black rounded-lg object-cover"
            autoPlay
            playsInline
            muted
          />
          
          {/* Scanning overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-white border-dashed w-48 h-16 rounded-lg flex items-center justify-center bg-black bg-opacity-20">
              <Scan className="h-6 w-6 text-white opacity-75" />
            </div>
          </div>
          
          {/* Status indicator */}
          {isScanning && (
            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
              Escaneando...
            </div>
          )}
          
          {/* Loading state */}
          {!isScanning && hasPermission === null && (
            <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
              Carregando...
            </div>
          )}
        </div>
      )}

      {isActive && (
        <div className="text-sm text-gray-600 space-y-1">
          <p>• Aponte a câmera para o código de barras</p>
          <p>• O código será detectado automaticamente</p>
          <p>• Mantenha o código centralizado na área marcada</p>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;
