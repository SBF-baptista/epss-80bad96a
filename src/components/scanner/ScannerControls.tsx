
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

interface ScannerControlsProps {
  isActive: boolean;
  onToggle: () => void;
}

const ScannerControls = ({ isActive, onToggle }: ScannerControlsProps) => {
  return (
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
  );
};

export default ScannerControls;
