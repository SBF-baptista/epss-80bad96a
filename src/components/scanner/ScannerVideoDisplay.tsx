
import { RefObject } from 'react';
import { Scan } from "lucide-react";

interface ScannerVideoDisplayProps {
  videoRef: RefObject<HTMLVideoElement>;
  isScanning: boolean;
  hasPermission: boolean | null;
}

const ScannerVideoDisplay = ({ videoRef, isScanning, hasPermission }: ScannerVideoDisplayProps) => {
  return (
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
  );
};

export default ScannerVideoDisplay;
