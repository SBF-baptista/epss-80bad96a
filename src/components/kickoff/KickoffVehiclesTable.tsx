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
import type { KickoffVehicle } from "@/services/kickoffService";

interface KickoffVehiclesTableProps {
  vehicles: KickoffVehicle[];
}

// Available products/usage types
const availableProducts = [
  "Rastreamento",
  "Telemetria",
  "Gestão de Frotas",
  "Videomonitoramento"
];

export const KickoffVehiclesTable = ({ vehicles }: KickoffVehiclesTableProps) => {
  const [selectedProducts, setSelectedProducts] = useState<Map<string, Set<string>>>(
    new Map(vehicles.map(v => [v.id, new Set([v.usage_type])]))
  );

  const toggleProduct = (vehicleId: string, product: string) => {
    setSelectedProducts(prev => {
      const newMap = new Map(prev);
      const vehicleProducts = new Set(newMap.get(vehicleId) || []);
      
      if (vehicleProducts.has(product)) {
        vehicleProducts.delete(product);
      } else {
        vehicleProducts.add(product);
      }
      
      newMap.set(vehicleId, vehicleProducts);
      return newMap;
    });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Placa</TableHead>
            <TableHead>Veículo</TableHead>
            <TableHead>Ano</TableHead>
            <TableHead>Produtos</TableHead>
            <TableHead>Módulos/Acessórios</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((vehicle) => {
            const normalize = (s: string) => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
            const modulesList = vehicle.modules.filter(m => normalize(m.categories || '') === 'modulos');
            const accessoriesList = vehicle.modules.filter(m => normalize(m.categories || '') !== 'modulos');
            const vehicleProducts = selectedProducts.get(vehicle.id) || new Set();

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
                  <div className="space-y-2">
                    {availableProducts.map((product) => (
                      <div key={product} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${vehicle.id}-${product}`}
                          checked={vehicleProducts.has(product)}
                          onCheckedChange={() => toggleProduct(vehicle.id, product)}
                        />
                        <label
                          htmlFor={`${vehicle.id}-${product}`}
                          className="text-sm cursor-pointer"
                        >
                          {product}
                        </label>
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2 max-w-xs">
                    {modulesList.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Módulos:</p>
                        <div className="flex gap-1 flex-wrap">
                          {modulesList.map((item, idx) => (
                            <Badge key={`mod-${idx}`} variant="secondary" className="text-xs">
                              {item.name} ({item.quantity}x)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {accessoriesList.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Acessórios:</p>
                        <div className="flex gap-1 flex-wrap">
                          {accessoriesList.map((item, idx) => (
                            <Badge key={`acc-${idx}`} variant="outline" className="text-xs">
                              {item.name} ({item.quantity}x)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {modulesList.length === 0 && accessoriesList.length === 0 && (
                      <span className="text-xs text-muted-foreground">Nenhum</span>
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
