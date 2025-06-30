
import { Button } from "@/components/ui/button";
import { CameraOff } from "lucide-react";

interface CameraPermissionErrorProps {
  onRetry: () => void;
}

const CameraPermissionError = ({ onRetry }: CameraPermissionErrorProps) => {
  return (
    <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
      <CameraOff className="h-8 w-8 mx-auto mb-2 text-red-500" />
      <p className="text-red-700 font-medium mb-1">Acesso à câmera negado</p>
      <p className="text-sm text-red-600 mb-3">
        Permita o acesso à câmera para escanear códigos de barras
      </p>
      <Button onClick={onRetry} variant="outline" size="sm">
        Tentar novamente
      </Button>
    </div>
  );
};

export default CameraPermissionError;
