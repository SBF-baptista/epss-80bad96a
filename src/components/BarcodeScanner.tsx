
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import CameraPermissionError from './scanner/CameraPermissionError';
import ScannerControls from './scanner/ScannerControls';
import ScannerVideoDisplay from './scanner/ScannerVideoDisplay';
import ScannerInstructions from './scanner/ScannerInstructions';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
  onToggle: () => void;
}

const BarcodeScanner = ({ onScan, onError, isActive, onToggle }: BarcodeScannerProps) => {
  const {
    videoRef,
    hasPermission,
    isScanning,
    handleRetryPermission,
  } = useBarcodeScanner({ onScan, onError, isActive });

  if (hasPermission === false) {
    return <CameraPermissionError onRetry={handleRetryPermission} />;
  }

  return (
    <div className="space-y-4">
      <ScannerControls isActive={isActive} onToggle={onToggle} />

      {isActive && (
        <ScannerVideoDisplay
          videoRef={videoRef}
          isScanning={isScanning}
          hasPermission={hasPermission}
        />
      )}

      {isActive && <ScannerInstructions />}
    </div>
  );
};

export default BarcodeScanner;
