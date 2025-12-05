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
import { Input } from "@/components/ui/input";
import { Pencil, CheckCircle, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { KickoffVehicle } from "@/services/kickoffService";
import { EditVehicleModal } from "./EditVehicleModal";
import { PlateValidationCheckbox } from "./PlateValidationCheckbox";
import { useFipeBrands } from "@/hooks/useFipeData";
import { fetchFipeModels, fetchFipeYears } from "@/services/fipeService";

interface KickoffVehiclesTableProps {
  vehicles: KickoffVehicle[];
  selectedModules: Map<string, Set<string>>;
  onModuleToggle: (vehicleId: string, moduleName: string) => void;
  vehicleBlocking: Map<string, { needsBlocking: boolean; engineBlocking: boolean; fuelBlocking: boolean; quantity: number }>;
  onBlockingToggle: (vehicleId: string, field: 'needsBlocking' | 'engineBlocking' | 'fuelBlocking', value: boolean) => void;
  vehicleSiren: Map<string, { hasSiren: boolean; quantity: number }>;
  onSirenToggle: (vehicleId: string, value: boolean) => void;
  vehicleVideoMonitoring: Map<string, boolean>;
  onVideoMonitoringChange: (vehicleId: string, value: boolean) => void;
  saleSummaryId: number;
  onVehicleUpdate: () => void;
  onBlockingQuantityChange: (vehicleId: string, quantity: number) => void;
  onSirenQuantityChange: (vehicleId: string, quantity: number) => void;
  validatedPlates: Set<string>;
  onPlateValidationChange: (vehicleId: string, validated: boolean) => void;
}

// Helper function to capitalize first letter of each word (PT-BR style)
const capitalizeWords = (text: string): string => {
  if (!text) return "N/A";
  return text
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const KickoffVehiclesTable = ({ 
  vehicles, 
  selectedModules, 
  onModuleToggle,
  vehicleBlocking,
  onBlockingToggle,
  vehicleSiren,
  onSirenToggle,
  vehicleVideoMonitoring,
  onVideoMonitoringChange,
  saleSummaryId,
  onVehicleUpdate,
  onBlockingQuantityChange,
  onSirenQuantityChange,
  validatedPlates,
  onPlateValidationChange
}: KickoffVehiclesTableProps) => {
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<KickoffVehicle | null>(null);
  const [invalidVehicles, setInvalidVehicles] = useState<Array<{
    brand: string; 
    model: string; 
    year?: number;
    issue: 'brand' | 'model' | 'year';
    suggestion?: string;
  }>>([]);
  const [validating, setValidating] = useState(false);
  
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
          fuelBlocking: false,
          quantity: 1
        };
        
        if (!currentBlocking.needsBlocking) {
          onBlockingToggle(vehicle.id, 'needsBlocking', true);
        }
      }
    });
  }, [vehicles]);

  const validateVehiclesAgainstFipe = async () => {
    setValidating(true);
    const invalid: Array<{ 
      brand: string; 
      model: string; 
      year?: number;
      issue: 'brand' | 'model' | 'year';
      suggestion?: string;
    }> = [];
    
    for (const vehicle of vehicles) {
      // 1️⃣ Validar Marca
      const brandMatch = brands.find(
        b => b.name.toUpperCase() === vehicle.brand.toUpperCase()
      );
      
      if (!brandMatch) {
        // Buscar marcas similares
        const suggestion = brands
          .filter(b => {
            const brandName = b.name.toUpperCase();
            const vehicleBrand = vehicle.brand.toUpperCase();
            return brandName.includes(vehicleBrand.substring(0, 3)) ||
                   vehicleBrand.includes(brandName.substring(0, 3));
          })
          .map(b => b.name)
          .slice(0, 3)
          .join(', ');
        
        invalid.push({
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          issue: 'brand',
          suggestion: suggestion || 'Nenhuma sugestão encontrada'
        });
        continue; // Se marca inválida, não adianta validar modelo/ano
      }
      
      // 2️⃣ Validar Modelo (precisa buscar da API)
      try {
        const modelData = await fetchFipeModels(brandMatch.code);
        const modelMatch = modelData.find(m => 
          m.name.toUpperCase().includes(vehicle.model.toUpperCase()) ||
          vehicle.model.toUpperCase().includes(m.name.toUpperCase())
        );
        
        if (!modelMatch) {
          // Buscar modelos similares
          const suggestion = modelData
            .filter(m => {
              const modelName = m.name.toUpperCase();
              const vehicleModel = vehicle.model.toUpperCase();
              return modelName.includes(vehicleModel.substring(0, 3)) ||
                     vehicleModel.includes(modelName.substring(0, 3));
            })
            .map(m => m.name)
            .slice(0, 3)
            .join(', ');
          
          invalid.push({
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            issue: 'model',
            suggestion: suggestion || 'Nenhuma sugestão encontrada'
          });
          continue;
        }
        
        // 3️⃣ Validar Ano (se fornecido)
        if (vehicle.year) {
          const yearData = await fetchFipeYears(brandMatch.code, modelMatch.code);
          const yearMatch = yearData.find(y => 
            y.name.includes(vehicle.year.toString())
          );
          
          if (!yearMatch) {
            // Listar anos disponíveis
            const suggestion = yearData
              .map(y => y.name)
              .slice(0, 5)
              .join(', ');
            
            invalid.push({
              brand: vehicle.brand,
              model: vehicle.model,
              year: vehicle.year,
              issue: 'year',
              suggestion: suggestion || 'Nenhuma sugestão encontrada'
            });
          }
        }
      } catch (error) {
        console.error('Erro na validação FIPE:', error);
      }
    }
    
    setInvalidVehicles(invalid);
    setValidating(false);
  };

  const handlePlateValidation = (vehicleId: string, validated: boolean) => {
    onPlateValidationChange(vehicleId, validated);
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

  const getVehicleValidationDetails = (vehicle: KickoffVehicle) => {
    const invalidVehicle = invalidVehicles.find(
      inv => inv.brand.toUpperCase() === vehicle.brand.toUpperCase() &&
             inv.model.toUpperCase() === vehicle.model.toUpperCase()
    );
    
    if (!invalidVehicle) return null;
    
    const errorMessages = {
      brand: `Marca "${invalidVehicle.brand}" não encontrada na FIPE`,
      model: `Modelo "${invalidVehicle.model}" não encontrado na FIPE`,
      year: `Ano "${invalidVehicle.year}" não encontrado na FIPE`
    };
    
    return {
      error: errorMessages[invalidVehicle.issue],
      suggestion: invalidVehicle.suggestion
    };
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
    
    <div className="space-y-4 w-full">
      {/* Mobile/Tablet Card Layout */}
      <div className="lg:hidden space-y-4">
        {vehicles.map((vehicle) => {
          const normalize = (s: string) => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
          const modulesList = vehicle.modules.filter(m => normalize(m.categories || '') === 'modulos');
          const accessoriesList = vehicle.modules.filter(m => normalize(m.categories || '') !== 'modulos');
          const vehicleModules = selectedModules.get(vehicle.id) || new Set();
          const blocking = vehicleBlocking.get(vehicle.id) || { needsBlocking: false, engineBlocking: false, fuelBlocking: false };
          const isPlateValidated = validatedPlates.has(vehicle.id);
          
          return (
            <div key={vehicle.id} className={`border rounded-lg p-4 space-y-4 bg-card ${isPlateValidated ? 'opacity-60' : ''}`}>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 pb-3 border-b">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold text-lg ${isPlateValidated ? 'text-green-600' : ''}`}>
                      {vehicle.plate || "Sem placa"}
                    </span>
                    {vehicle.quantity > 1 && (
                      <Badge variant="outline">{vehicle.quantity}x</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {vehicle.brand} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
                  </div>
                  <Badge variant="secondary" className="text-xs mt-1">
                    Produto: {capitalizeWords(vehicle.usage_type || '')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditClick(vehicle)}
                    disabled={isPlateValidated}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* FIPE Status */}
              <div className="flex items-center gap-2 pb-3 border-b">
                {isVehicleInvalid(vehicle) ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 cursor-help">
                        <AlertTriangle className="h-4 w-4 text-error" />
                        <Badge variant="outline" className="bg-error-light text-error border-error-border">
                          Fora do padrão FIPE
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <div className="space-y-2">
                        <p className="font-semibold text-error">
                          {getVehicleValidationDetails(vehicle)?.error}
                        </p>
                        {getVehicleValidationDetails(vehicle)?.suggestion && (
                          <div className="text-xs">
                            <p className="font-medium mb-1">Sugestões da FIPE:</p>
                            <p className="text-muted-foreground">
                              {getVehicleValidationDetails(vehicle)?.suggestion}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Clique no botão de edição para corrigir
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <Badge variant="outline" className="bg-success-light text-success border-success-border">
                          Dentro do padrão FIPE
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Veículo encontrado na tabela FIPE</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Modules */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Módulos</Label>
                <div className="space-y-2">
                  {modulesList.length > 0 ? (
                    modulesList.map((module, idx) => (
                      <div key={`mod-${idx}`} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mobile-${vehicle.id}-${module.name}`}
                          checked={vehicleModules.has(module.name)}
                          onCheckedChange={() => onModuleToggle(vehicle.id, module.name)}
                          disabled={isPlateValidated}
                        />
                        <Label htmlFor={`mobile-${vehicle.id}-${module.name}`} className="text-sm cursor-pointer">
                          {module.name} ({module.quantity}x)
                        </Label>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Nenhum módulo</span>
                  )}
                </div>
              </div>

              {/* Accessories */}
              {accessoriesList.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Acessórios</Label>
                  <div className="flex gap-1 flex-wrap">
                    {accessoriesList.map((item, idx) => (
                      <Badge key={`acc-${idx}`} variant="outline" className="text-xs">
                        {item.name} ({item.quantity}x)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Blocking */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`mobile-${vehicle.id}-blocking`}
                      checked={blocking.needsBlocking}
                      onCheckedChange={(checked) => onBlockingToggle(vehicle.id, 'needsBlocking', checked as boolean)}
                      disabled={isPlateValidated}
                    />
                    <Label htmlFor={`mobile-${vehicle.id}-blocking`} className="text-sm font-semibold cursor-pointer">
                      Necessita de bloqueio
                    </Label>
                  </div>
                  {blocking.needsBlocking && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Qtd:</Label>
                      <Input
                        type="number"
                        min="1"
                        value={blocking.quantity}
                        onChange={(e) => onBlockingQuantityChange(vehicle.id, parseInt(e.target.value) || 1)}
                        className="w-16 h-8 text-xs"
                        disabled={isPlateValidated}
                      />
                    </div>
                  )}
                </div>
                {blocking.needsBlocking && (
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`mobile-${vehicle.id}-engine`}
                        checked={blocking.engineBlocking}
                        onCheckedChange={(checked) => onBlockingToggle(vehicle.id, 'engineBlocking', checked as boolean)}
                        disabled={isPlateValidated}
                      />
                      <Label htmlFor={`mobile-${vehicle.id}-engine`} className="text-sm cursor-pointer">
                        Bloqueio de partida
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`mobile-${vehicle.id}-fuel`}
                        checked={blocking.fuelBlocking}
                        onCheckedChange={(checked) => onBlockingToggle(vehicle.id, 'fuelBlocking', checked as boolean)}
                        disabled={isPlateValidated}
                      />
                      <Label htmlFor={`mobile-${vehicle.id}-fuel`} className="text-sm cursor-pointer">
                        Bloqueio de combustível
                      </Label>
                    </div>
                  </div>
                )}
              </div>

              {/* Siren */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`mobile-siren-${vehicle.id}`}
                      checked={vehicleSiren.get(vehicle.id)?.hasSiren || false}
                      onCheckedChange={(checked) => onSirenToggle(vehicle.id, checked as boolean)}
                      disabled={isPlateValidated}
                    />
                    <Label htmlFor={`mobile-siren-${vehicle.id}`} className="text-sm font-semibold cursor-pointer">
                      Possui Sirene
                    </Label>
                  </div>
                  {vehicleSiren.get(vehicle.id)?.hasSiren && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Qtd:</Label>
                      <Input
                        type="number"
                        min="1"
                        value={vehicleSiren.get(vehicle.id)?.quantity || 1}
                        onChange={(e) => onSirenQuantityChange(vehicle.id, parseInt(e.target.value) || 1)}
                        className="w-16 h-8 text-xs"
                        disabled={isPlateValidated}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Video Monitoring */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Veículo com Videomonitoramento?</Label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`mobile-video-yes-${vehicle.id}`}
                      checked={vehicleVideoMonitoring.get(vehicle.id) === true}
                      onCheckedChange={(checked) => {
                        if (checked) onVideoMonitoringChange(vehicle.id, true);
                      }}
                      disabled={isPlateValidated}
                    />
                    <Label htmlFor={`mobile-video-yes-${vehicle.id}`} className="text-sm cursor-pointer">
                      Sim
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`mobile-video-no-${vehicle.id}`}
                      checked={vehicleVideoMonitoring.get(vehicle.id) === false}
                      onCheckedChange={(checked) => {
                        if (checked) onVideoMonitoringChange(vehicle.id, false);
                      }}
                      disabled={isPlateValidated}
                    />
                    <Label htmlFor={`mobile-video-no-${vehicle.id}`} className="text-sm cursor-pointer">
                      Não
                    </Label>
                  </div>
                </div>
              </div>

              {/* Validation */}
              <div className="pt-2 border-t">
                <PlateValidationCheckbox
                  vehicleId={vehicle.id}
                  plate={vehicle.plate || ""}
                  isValidated={isPlateValidated}
                  onToggle={handlePlateValidation}
                />
              </div>
            </div>
          );
        })}
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
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`siren-${vehicle.id}`}
                        checked={vehicleSiren.get(vehicle.id)?.hasSiren || false}
                        onCheckedChange={(checked) => 
                          onSirenToggle(vehicle.id, checked as boolean)
                        }
                        disabled={isPlateValidated}
                      />
                      <Label htmlFor={`siren-${vehicle.id}`} className="text-sm font-medium cursor-pointer">
                        Possui Sirene
                      </Label>
                    </div>
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
                  <div className="flex items-center justify-center gap-2">
                    {isVehicleInvalid(vehicle) ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 cursor-help">
                            <AlertTriangle className="h-5 w-5 text-error" />
                            <div className="flex flex-col items-start">
                              <Badge variant="outline" className="bg-error-light text-error border-error-border">
                                Fora do padrão
                              </Badge>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <div className="space-y-2">
                            <p className="font-semibold text-error">
                              {getVehicleValidationDetails(vehicle)?.error}
                            </p>
                            {getVehicleValidationDetails(vehicle)?.suggestion && (
                              <div className="text-xs">
                                <p className="font-medium mb-1">Sugestões da FIPE:</p>
                                <p className="text-muted-foreground">
                                  {getVehicleValidationDetails(vehicle)?.suggestion}
                                </p>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Clique no botão de edição para corrigir
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-success" />
                        <Badge variant="outline" className="bg-success-light text-success border-success-border">
                          Dentro do padrão
                        </Badge>
                      </div>
                    )}
                  </div>
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
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden lg:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Placa</TableHead>
              <TableHead className="whitespace-nowrap">Produto</TableHead>
              <TableHead className="whitespace-nowrap">Marca</TableHead>
              <TableHead className="whitespace-nowrap">Modelo</TableHead>
              <TableHead className="whitespace-nowrap">Ano</TableHead>
              <TableHead className="whitespace-nowrap">Módulos</TableHead>
              <TableHead className="whitespace-nowrap">Acessórios</TableHead>
              <TableHead className="whitespace-nowrap">Bloqueio</TableHead>
              <TableHead className="whitespace-nowrap">Sirene</TableHead>
              <TableHead className="whitespace-nowrap">Videomonitoramento</TableHead>
              <TableHead className="whitespace-nowrap">Editar</TableHead>
              <TableHead className="whitespace-nowrap">FIPE</TableHead>
              <TableHead className="whitespace-nowrap">Validação</TableHead>
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
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {capitalizeWords(vehicle.usage_type || '')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
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
                      <div className="flex items-center gap-2">
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
                        <>
                          <div className="flex items-center gap-2 ml-6">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Quantidade:</Label>
                            <Input
                              type="number"
                              min="1"
                              value={blocking.quantity}
                              onChange={(e) => onBlockingQuantityChange(vehicle.id, parseInt(e.target.value) || 1)}
                              className="w-16 h-8 text-xs"
                              disabled={isPlateValidated}
                            />
                          </div>
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
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`siren-${vehicle.id}`}
                          checked={vehicleSiren.get(vehicle.id)?.hasSiren || false}
                          onCheckedChange={(checked) => 
                            onSirenToggle(vehicle.id, checked as boolean)
                          }
                          disabled={isPlateValidated}
                        />
                        <Label htmlFor={`siren-${vehicle.id}`} className="text-sm font-medium cursor-pointer">
                          Possui Sirene
                        </Label>
                      </div>
                      {vehicleSiren.get(vehicle.id)?.hasSiren && (
                        <div className="flex items-center gap-2 ml-6">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Quantidade:</Label>
                          <Input
                            type="number"
                            min="1"
                            value={vehicleSiren.get(vehicle.id)?.quantity || 1}
                            onChange={(e) => onSirenQuantityChange(vehicle.id, parseInt(e.target.value) || 1)}
                            className="w-16 h-8 text-xs"
                            disabled={isPlateValidated}
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium block mb-2">Videomonitoramento?</Label>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`video-yes-${vehicle.id}`}
                            checked={vehicleVideoMonitoring.get(vehicle.id) === true}
                            onCheckedChange={(checked) => {
                              if (checked) onVideoMonitoringChange(vehicle.id, true);
                            }}
                            disabled={isPlateValidated}
                          />
                          <Label htmlFor={`video-yes-${vehicle.id}`} className="text-sm cursor-pointer">
                            Sim
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`video-no-${vehicle.id}`}
                            checked={vehicleVideoMonitoring.get(vehicle.id) === false}
                            onCheckedChange={(checked) => {
                              if (checked) onVideoMonitoringChange(vehicle.id, false);
                            }}
                            disabled={isPlateValidated}
                          />
                          <Label htmlFor={`video-no-${vehicle.id}`} className="text-sm cursor-pointer">
                            Não
                          </Label>
                        </div>
                      </div>
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
                    <div className="flex items-center justify-center gap-2">
                      {isVehicleInvalid(vehicle) ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 cursor-help">
                              <AlertTriangle className="h-5 w-5 text-error" />
                              <div className="flex flex-col items-start">
                                <Badge variant="outline" className="bg-error-light text-error border-error-border">
                                  Fora do padrão
                                </Badge>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <div className="space-y-2">
                              <p className="font-semibold text-error">
                                {getVehicleValidationDetails(vehicle)?.error}
                              </p>
                              {getVehicleValidationDetails(vehicle)?.suggestion && (
                                <div className="text-xs">
                                  <p className="font-medium mb-1">Sugestões da FIPE:</p>
                                  <p className="text-muted-foreground">
                                    {getVehicleValidationDetails(vehicle)?.suggestion}
                                  </p>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                Clique no botão de edição para corrigir
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-success" />
                          <Badge variant="outline" className="bg-success-light text-success border-success-border">
                            Dentro do padrão
                          </Badge>
                        </div>
                      )}
                    </div>
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
