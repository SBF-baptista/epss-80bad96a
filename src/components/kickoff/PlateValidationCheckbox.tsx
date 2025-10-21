import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";

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
        className={`cursor-pointer flex items-center gap-2 ${
          isValidated ? "text-green-600 font-medium" : ""
        }`}
      >
        {isValidated && <Check className="h-4 w-4 text-green-600" />}
        <span className={isValidated ? "text-green-600" : ""}>
          {plate || "Não informada"}
        </span>
      </Label>
    </div>
  );
};
