import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, CheckSquare, Car, MapPin, AlertTriangle } from "lucide-react";

interface PlateSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationIndex: number;
  locationLabel: string;
  locationAddress: string;
  allPlates: string[];
  selectedPlates: string[];
  /** Map of plate → location index where it's already assigned (excluding current) */
  plateAssignments: Map<string, number>;
  onConfirm: (plates: string[]) => void;
}

export const PlateSelectionModal = ({
  open,
  onOpenChange,
  locationIndex,
  locationLabel,
  locationAddress,
  allPlates,
  selectedPlates: initialSelected,
  plateAssignments,
  onConfirm,
}: PlateSelectionModalProps) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [confirmRelocate, setConfirmRelocate] = useState<string | null>(null);

  // Reset state when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelected(new Set(initialSelected));
      setSearch("");
      setConfirmRelocate(null);
    }
    onOpenChange(isOpen);
  };

  const filteredPlates = useMemo(() => {
    if (!search.trim()) return allPlates;
    const term = search.toLowerCase();
    return allPlates.filter((plate) => plate.toLowerCase().includes(term));
  }, [allPlates, search]);

  const getPlateStatus = (plate: string): "available" | "assigned_here" | "assigned_elsewhere" => {
    if (selected.has(plate)) return "assigned_here";
    const assignedTo = plateAssignments.get(plate);
    if (assignedTo !== undefined && assignedTo !== locationIndex) return "assigned_elsewhere";
    return "available";
  };

  const togglePlate = (plate: string) => {
    const status = getPlateStatus(plate);

    if (status === "assigned_elsewhere" && !selected.has(plate)) {
      setConfirmRelocate(plate);
      return;
    }

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(plate)) {
        next.delete(plate);
      } else {
        next.add(plate);
      }
      return next;
    });
  };

  const confirmRelocatePlate = () => {
    if (confirmRelocate) {
      setSelected((prev) => new Set(prev).add(confirmRelocate));
      setConfirmRelocate(null);
    }
  };

  const selectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      filteredPlates.forEach((p) => next.add(p));
      return next;
    });
  };

  const deselectAll = () => setSelected(new Set());

  // Stats
  const totalSelected = selected.size;
  const totalAvailable = allPlates.filter((p) => {
    const a = plateAssignments.get(p);
    return a === undefined || a === locationIndex;
  }).length;
  const totalAssignedElsewhere = allPlates.length - totalAvailable;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b space-y-1">
          <DialogTitle className="text-lg">Selecionar Placas – {locationLabel}</DialogTitle>
          <p className="text-sm text-muted-foreground">{locationAddress || "Endereço não informado"}</p>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Search & actions */}
            <div className="px-6 py-3 border-b space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por placa..."
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllVisible}>
                  <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                  Selecionar todas da página
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={deselectAll}>
                  Limpar seleção
                </Button>
              </div>
            </div>

            {/* Relocate confirmation */}
            {confirmRelocate && (
              <div className="mx-6 mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    A placa <strong>{confirmRelocate}</strong> já está vinculada ao Local{" "}
                    {(plateAssignments.get(confirmRelocate) ?? 0) + 1}.
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Deseja realocar esta placa para este local?
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="destructive" onClick={confirmRelocatePlate}>
                      Realocar
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmRelocate(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Plate list */}
            <ScrollArea className="flex-1 px-6">
              <div className="py-3 space-y-1">
                {filteredPlates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma placa encontrada</p>
                ) : (
                  filteredPlates.map((plate) => {
                    const status = getPlateStatus(plate);
                    const isSelected = selected.has(plate);
                    const assignedTo = plateAssignments.get(plate);

                    return (
                      <div
                        key={plate}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted/50 border border-transparent"
                        }`}
                        onClick={() => togglePlate(plate)}
                      >
                        <Checkbox checked={isSelected} onCheckedChange={() => togglePlate(plate)} />
                        <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-mono font-medium text-sm flex-1">{plate}</span>
                        {status === "assigned_elsewhere" && !isSelected && (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                            Local {(assignedTo ?? 0) + 1}
                          </Badge>
                        )}
                        {isSelected && (
                          <Badge variant="default" className="text-xs">
                            Selecionada
                          </Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Summary sidebar */}
          <div className="w-52 border-l bg-muted/30 p-4 flex flex-col gap-4 shrink-0">
            <h4 className="font-semibold text-sm">Resumo</h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Selecionadas</p>
                <p className="text-2xl font-bold text-primary">{totalSelected}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Disponíveis</p>
                <p className="text-lg font-semibold">{totalAvailable}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Vinculadas a outros locais</p>
                <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">{totalAssignedElsewhere}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total de placas</p>
                <p className="text-lg font-semibold">{allPlates.length}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => { onConfirm(Array.from(selected)); handleOpenChange(false); }}>
            Confirmar seleção ({totalSelected})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
