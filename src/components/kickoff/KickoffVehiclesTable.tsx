import { useState } from "react";
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
import type { KickoffVehicle } from "@/services/kickoffService";

interface KickoffVehiclesTableProps {
  vehicles: KickoffVehicle[];
  selectedModules: Map<string, Set<string>>;
  onModuleToggle: (vehicleId: string, moduleName: string) => void;
  vehicleBlocking: Map<string, { needsBlocking: boolean; engineBlocking: boolean; fuelBlocking: boolean }>;
  onBlockingToggle: (vehicleId: string, field: 'needsBlocking' | 'engineBlocking' | 'fuelBlocking', value: boolean) => void;
}

export const KickoffVehiclesTable = ({ 
  vehicles, 
  selectedModules,
  onModuleToggle,
  vehicleBlocking,
  onBlockingToggle
}: KickoffVehiclesTableProps) => {

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Placa</TableHead>
            <TableHead>Veículo</TableHead>
            <TableHead>Ano</TableHead>
            <TableHead>Módulos</TableHead>
            <TableHead>Acessórios</TableHead>
            <TableHead>Bloqueio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((vehicle) => {
            const normalize = (s: string) => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
            const modulesList = vehicle.modules.filter(m => normalize(m.categories || '') === 'modulos');
            const accessoriesList = vehicle.modules.filter(m => normalize(m.categories || '') !== 'modulos');
            const vehicleModules = selectedModules.get(vehicle.id) || new Set();
            const blocking = vehicleBlocking.get(vehicle.id) || { needsBlocking: false, engineBlocking: false, fuelBlocking: false };

            return (
              <TableRow key={vehicle.id}>
                <TableCell className="font-medium">
                  {vehicle.plate || <span className="text-muted-foreground">Não informada</span>}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">{vehicle.brand} {vehicle.model}</p>
                    {vehicle.quantity > 1 && (
                      <Badge variant="outline" className="text-xs">
                        {vehicle.quantity}x
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {vehicle.year || <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell>
                  <div className="space-y-2 max-w-[200px]">
                    {modulesList.length > 0 ? (
                      modulesList.map((module, idx) => (
                        <div key={`mod-${idx}`} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${vehicle.id}-${module.name}`}
                            checked={vehicleModules.has(module.name)}
                            onCheckedChange={() => onModuleToggle(vehicle.id, module.name)}
                          />
                          <label
                            htmlFor={`${vehicle.id}-${module.name}`}
                            className="text-sm cursor-pointer"
                          >
                            {module.name} ({module.quantity}x)
                          </label>
                        </div>
                      ))
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
                          />
                          <Label htmlFor={`${vehicle.id}-fuel`} className="text-xs cursor-pointer">
                            Bloqueio de combustível
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
