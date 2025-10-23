import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Package, CheckCircle, Info } from "lucide-react";
import type { KickoffModule } from "@/services/kickoffService";
import { suggestKitsForVehicle, type KitMatch } from "@/services/kitMatchingService";
import { Skeleton } from "@/components/ui/skeleton";

interface KitSuggestionCellProps {
  vehicleId: string;
  vehicleModules: KickoffModule[];
  selectedKits: Set<string>;
  onKitToggle: (vehicleId: string, kitId: string) => void;
  disabled?: boolean;
}

export const KitSuggestionCell = ({
  vehicleId,
  vehicleModules,
  selectedKits,
  onKitToggle,
  disabled = false,
}: KitSuggestionCellProps) => {
  const [suggestedKits, setSuggestedKits] = useState<KitMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (vehicleModules.length > 0) {
      loadKitSuggestions();
    }
  }, [vehicleModules]);

  const loadKitSuggestions = async () => {
    setLoading(true);
    try {
      const suggestions = await suggestKitsForVehicle(vehicleModules);
      setSuggestedKits(suggestions);
    } catch (error) {
      console.error('Error loading kit suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-24" />
      </div>
    );
  }

  if (suggestedKits.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Package className="h-4 w-4" />
        <span>Nenhum kit sugerido</span>
      </div>
    );
  }

  const selectedCount = Array.from(selectedKits).filter(kitId =>
    suggestedKits.some(sk => sk.kit.id === kitId)
  ).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-auto py-2 px-3 flex items-center gap-2"
          disabled={disabled}
        >
          <Package className="h-4 w-4" />
          <div className="flex flex-col items-start">
            <span className="text-xs font-medium">
              {selectedCount > 0 ? `${selectedCount} kit(s) selecionado(s)` : 'Selecionar kits'}
            </span>
            <span className="text-xs text-muted-foreground">
              {suggestedKits.length} sugestão(ões)
            </span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px]" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Kits Sugeridos
            </h4>
            <p className="text-xs text-muted-foreground">
              Baseado nos módulos e acessórios do veículo
            </p>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {suggestedKits.map((match) => {
              const isSelected = selectedKits.has(match.kit.id!);
              return (
                <div
                  key={match.kit.id}
                  className={`border rounded-lg p-3 space-y-2 ${
                    isSelected ? 'bg-muted/50 border-primary' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      <Checkbox
                        id={`kit-${vehicleId}-${match.kit.id}`}
                        checked={isSelected}
                        onCheckedChange={() => onKitToggle(vehicleId, match.kit.id!)}
                        disabled={disabled}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`kit-${vehicleId}-${match.kit.id}`}
                          className="font-medium cursor-pointer"
                        >
                          {match.kit.name}
                        </Label>
                        {match.kit.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {match.kit.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="default" className="shrink-0 bg-green-600 text-white">
                      {match.matchedItems.length} {match.matchedItems.length === 1 ? 'item' : 'itens'}
                    </Badge>
                  </div>

                  <div className="ml-6 space-y-1">
                    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle className="h-3 w-3" />
                      <span className="font-medium">
                        Itens compatíveis:
                      </span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {match.matchedItems.slice(0, 3).map((item, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                          {item}
                        </Badge>
                      ))}
                      {match.matchedItems.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{match.matchedItems.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {match.unmatchedItems.length > 0 && (
                    <div className="ml-6 space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Info className="h-3 w-3" />
                        <span className="font-medium">
                          Itens adicionais do kit:
                        </span>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {match.unmatchedItems.slice(0, 2).map((item, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-muted">
                            {item}
                          </Badge>
                        ))}
                        {match.unmatchedItems.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{match.unmatchedItems.length - 2}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        Itens do kit não encontrados no veículo
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
