import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface PlateValidationCheckboxProps {
  vehicleId: string;
  plate: string;
  isValidated: boolean;
  onToggle: (vehicleId: string, validated: boolean) => void;
}

export const PlateValidationCheckbox = ({
  vehicleId,
  plate,
  isValidated,
  onToggle,
}: PlateValidationCheckboxProps) => {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={`validate-${vehicleId}`}
        checked={isValidated}
        onCheckedChange={(checked) => onToggle(vehicleId, checked as boolean)}
      />
      <Label
        htmlFor={`validate-${vehicleId}`}
        className={`cursor-pointer text-sm ${
          isValidated ? "text-green-600 font-medium" : "text-muted-foreground"
        }`}
      >
        {isValidated ? "Validada ✓" : "Validar"}
      </Label>
    </div>
  );
};
