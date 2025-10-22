import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Pencil, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { KickoffVehicle } from "@/services/kickoffService";
import { EditVehicleModal } from "./EditVehicleModal";
import { PlateValidationCheckbox } from "./PlateValidationCheckbox";
import { FipeValidationAlert } from "./FipeValidationAlert";
import { useFipeBrands } from "@/hooks/useFipeData";

interface KickoffVehiclesTableProps {
  vehicles: KickoffVehicle[];
  selectedModules: Map<string, Set<string>>;
  onModuleToggle: (vehicleId: string, moduleName: string) => void;
  vehicleBlocking: Map<string, { needsBlocking: boolean; engineBlocking: boolean; fuelBlocking: boolean }>;
  onBlockingToggle: (vehicleId: string, field: 'needsBlocking' | 'engineBlocking' | 'fuelBlocking', value: boolean) => void;
  saleSummaryId: number;
  onVehicleUpdate: () => void;
}

export const KickoffVehiclesTable = ({ 
  vehicles, 
  selectedModules,
  onModuleToggle,
  vehicleBlocking,
  onBlockingToggle,
  saleSummaryId,
  onVehicleUpdate
}: KickoffVehiclesTableProps) => {
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<KickoffVehicle | null>(null);
  const [validatedPlates, setValidatedPlates] = useState<Set<string>>(new Set());
  const [invalidVehicles, setInvalidVehicles] = useState<Array<{ brand: string; model: string; year?: number }>>([]);
  
  const { brands } = useFipeBrands();

  // Validate vehicles against FIPE on mount and when brands load
  useEffect(() => {
    if (brands.length > 0) {
      validateVehiclesAgainstFipe();
    }
  }, [brands, vehicles]);

  // Auto-check blocking flag if vehicle has "Bloqueio" accessory
  useEffect(() => {
    vehicles.forEach(vehicle => {
      const hasBlockingAccessory = vehicle.modules.some(module => 
        module.name.toUpperCase().includes("BLOQUEIO")
      );
      
      if (hasBlockingAccessory) {
        const currentBlocking = vehicleBlocking.get(vehicle.id) || { 
          needsBlocking: false, 
          engineBlocking: false, 
          fuelBlocking: false 
        };
        
        if (!currentBlocking.needsBlocking) {
          onBlockingToggle(vehicle.id, 'needsBlocking', true);
        }
      }
    });
  }, [vehicles]);

  const validateVehiclesAgainstFipe = () => {
    const invalid: Array<{ brand: string; model: string; year?: number }> = [];
    
    vehicles.forEach(vehicle => {
      const brandMatch = brands.find(
        b => b.name.toUpperCase() === vehicle.brand.toUpperCase()
      );
      
      if (!brandMatch) {
        invalid.push({
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year
        });
      }
    });
    
    setInvalidVehicles(invalid);
  };

  const handlePlateValidation = (vehicleId: string, validated: boolean) => {
    setValidatedPlates(prev => {
      const newSet = new Set(prev);
      if (validated) {
        newSet.add(vehicleId);
      } else {
        newSet.delete(vehicleId);
      }
      return newSet;
    });
  };

  const handleEditClick = (vehicle: KickoffVehicle) => {
    setEditingVehicle(vehicle);
    setEditingVehicleId(vehicle.id);
    setEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setEditingVehicle(null);
    setEditingVehicleId(null);
    onVehicleUpdate();
  };

  const isVehicleInvalid = (vehicle: KickoffVehicle): boolean => {
    return invalidVehicles.some(
      inv => inv.brand.toUpperCase() === vehicle.brand.toUpperCase() &&
             inv.model.toUpperCase() === vehicle.model.toUpperCase()
    );
  };

  return (
    <TooltipProvider>
      {editingVehicle && (
        <EditVehicleModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          vehicleId={editingVehicle.id}
          currentBrand={editingVehicle.brand}
          currentModel={editingVehicle.model}
          currentYear={editingVehicle.year}
          saleSummaryId={saleSummaryId}
          onSuccess={handleEditSuccess}
        />
      )}
    
    <div className="space-y-4">
      <FipeValidationAlert invalidVehicles={invalidVehicles} />
      
      <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Placa</TableHead>
            <TableHead>Marca</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead>Ano</TableHead>
            <TableHead>Módulos</TableHead>
            <TableHead>Acessórios</TableHead>
            <TableHead>Bloqueio</TableHead>
            <TableHead className="w-[80px]">Ações</TableHead>
            <TableHead className="w-[100px]">Validação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((vehicle) => {
            const normalize = (s: string) => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
            const modulesList = vehicle.modules.filter(m => normalize(m.categories || '') === 'modulos');
            const accessoriesList = vehicle.modules.filter(m => normalize(m.categories || '') !== 'modulos');
            const vehicleModules = selectedModules.get(vehicle.id) || new Set();
            const blocking = vehicleBlocking.get(vehicle.id) || { needsBlocking: false, engineBlocking: false, fuelBlocking: false };

            const isPlateValidated = validatedPlates.has(vehicle.id);
            
            return (
              <TableRow key={vehicle.id} className={isPlateValidated ? "opacity-60" : ""}>
                <TableCell className="font-medium">
                  <span className={isPlateValidated ? "text-green-600 font-semibold" : ""}>
                    {vehicle.plate || "Não informada"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {isVehicleInvalid(vehicle) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Veículo não encontrado na tabela FIPE</p>
                          <p className="text-xs">Use o botão de edição para corrigir</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <span className="font-medium">{vehicle.brand}</span>
                    {vehicle.quantity > 1 && (
                      <Badge variant="outline" className="text-xs">
                        {vehicle.quantity}x
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{vehicle.model}</span>
                </TableCell>
                <TableCell>
                  {vehicle.year || <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell>
                  <div className="space-y-2 max-w-[250px]">
                    {modulesList.length > 0 ? (
                      <div className="space-y-2">
                        {modulesList.map((module, idx) => (
                          <div key={`mod-${idx}`} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${vehicle.id}-${module.name}`}
                              checked={vehicleModules.has(module.name)}
                              onCheckedChange={() => onModuleToggle(vehicle.id, module.name)}
                              disabled={isPlateValidated}
                            />
                            <Badge variant="outline" className="text-xs flex-1">
                              {module.name} ({module.quantity}x)
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Nenhum módulo</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px]">
                    {accessoriesList.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {accessoriesList.map((item, idx) => (
                          <Badge key={`acc-${idx}`} variant="outline" className="text-xs">
                            {item.name} ({item.quantity}x)
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Nenhum</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${vehicle.id}-blocking`}
                        checked={blocking.needsBlocking}
                        onCheckedChange={(checked) => onBlockingToggle(vehicle.id, 'needsBlocking', checked as boolean)}
                        disabled={isPlateValidated}
                      />
                      <Label htmlFor={`${vehicle.id}-blocking`} className="text-sm cursor-pointer">
                        Necessita de bloqueio
                      </Label>
                    </div>
                    {blocking.needsBlocking && (
                      <div className="ml-6 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${vehicle.id}-engine`}
                            checked={blocking.engineBlocking}
                            onCheckedChange={(checked) => onBlockingToggle(vehicle.id, 'engineBlocking', checked as boolean)}
                            disabled={isPlateValidated}
                          />
                          <Label htmlFor={`${vehicle.id}-engine`} className="text-xs cursor-pointer">
                            Bloqueio de partida
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${vehicle.id}-fuel`}
                            checked={blocking.fuelBlocking}
                            onCheckedChange={(checked) => onBlockingToggle(vehicle.id, 'fuelBlocking', checked as boolean)}
                            disabled={isPlateValidated}
                          />
                          <Label htmlFor={`${vehicle.id}-fuel`} className="text-xs cursor-pointer">
                            Bloqueio de combustível
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditClick(vehicle)}
                    title="Editar marca, modelo e ano"
                    disabled={isPlateValidated}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
                <TableCell>
                  <PlateValidationCheckbox
                    vehicleId={vehicle.id}
                    plate={vehicle.plate || ""}
                    isValidated={isPlateValidated}
                    onToggle={handlePlateValidation}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </div>
    </TooltipProvider>
  );
};
