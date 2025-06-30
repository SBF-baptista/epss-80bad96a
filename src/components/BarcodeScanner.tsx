
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

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    setReader(codeReader);

    return () => {
      codeReader.reset();
    };
  }, []);

  useEffect(() => {
    if (isActive && reader && videoRef.current) {
      startScanning();
    } else if (!isActive && reader) {
      stopScanning();
    }

    return () => {
      if (reader) {
        reader.reset();
      }
    };
  }, [isActive, reader]);

  const startScanning = async () => {
    if (!reader || !videoRef.current) return;

    try {
      setIsScanning(true);
      
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Use back camera on mobile
        } 
      });
      
      setHasPermission(true);
      
      // Start scanning
      reader.decodeFromVideoDevice(null, videoRef.current, (result, error) => {
        if (result) {
          onScan(result.getText());
          // Continue scanning for next code
        }
        if (error && error.name !== 'NotFoundException') {
          console.error('Scanning error:', error);
          onError?.(error.message);
        }
      });
    } catch (error) {
      console.error('Camera access error:', error);
      setHasPermission(false);
      onError?.('Erro ao acessar câmera. Verifique as permissões.');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (reader) {
      reader.reset();
    }
    setIsScanning(false);
  };

  if (hasPermission === false) {
    return (
      <div className="text-center p-4 bg-red-50 rounded-lg">
        <CameraOff className="h-8 w-8 mx-auto mb-2 text-red-500" />
        <p className="text-red-700 font-medium">Acesso à câmera negado</p>
        <p className="text-sm text-red-600">
          Permita o acesso à câmera para escanear códigos
        </p>
        <Button onClick={() => setHasPermission(null)} variant="outline" size="sm" className="mt-2">
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Scanner de Código</h4>
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
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-white border-dashed w-48 h-24 rounded-lg flex items-center justify-center">
              <Scan className="h-8 w-8 text-white opacity-75" />
            </div>
          </div>
          {isScanning && (
            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
              Escaneando...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;
