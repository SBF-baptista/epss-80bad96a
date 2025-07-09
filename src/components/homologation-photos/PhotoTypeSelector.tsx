import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { photoTypes } from "./photoTypes";

interface PhotoTypeSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

const PhotoTypeSelector = ({ value, onValueChange, disabled }: PhotoTypeSelectorProps) => {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="photo-type-select" className="text-sm font-medium">
        Tipo:
      </Label>
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-40" id="photo-type-select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {photoTypes.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default PhotoTypeSelector;