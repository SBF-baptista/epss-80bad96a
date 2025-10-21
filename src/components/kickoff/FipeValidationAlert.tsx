import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface FipeValidationAlertProps {
  invalidVehicles: Array<{
    brand: string;
    model: string;
    year?: number;
  }>;
}

export const FipeValidationAlert = ({ invalidVehicles }: FipeValidationAlertProps) => {
  if (invalidVehicles.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Veículos fora do padrão FIPE</AlertTitle>
      <AlertDescription>
        <p className="mb-2">Os seguintes veículos não foram encontrados na tabela FIPE:</p>
        <ul className="list-disc list-inside space-y-1">
          {invalidVehicles.map((vehicle, idx) => (
            <li key={idx}>
              <strong>{vehicle.brand}</strong> - {vehicle.model}
              {vehicle.year && ` (${vehicle.year})`}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm">
          Use o botão de edição para corrigir os dados com base na tabela FIPE.
        </p>
      </AlertDescription>
    </Alert>
  );
};
