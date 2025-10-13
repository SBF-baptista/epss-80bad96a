import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Users, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getKickoffData } from "@/services/kickoffService";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Kickoff = () => {
  const { data: kickoffData, isLoading } = useQuery({
    queryKey: ['kickoff-data'],
    queryFn: getKickoffData,
  });

  // Agrupar por usage_type para o resumo
  const usageTypeSummary = kickoffData?.usage_types.reduce((acc, item) => {
    const existing = acc.find(x => x.usage_type === item.usage_type);
    if (existing) {
      existing.total_quantity += item.total_quantity;
    } else {
      acc.push({
        usage_type: item.usage_type,
        total_quantity: item.total_quantity
      });
    }
    return acc;
  }, [] as { usage_type: string; total_quantity: number }[]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Kickoff</h1>
        <p className="text-muted-foreground">
          Unidades por tipo de uso vindas do Segsale
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Veículos
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{kickoffData?.total_vehicles || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Veículos do Segsale
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{kickoffData?.total_companies || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Empresas únicas
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tipos de Uso
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{usageTypeSummary?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Configurações diferentes
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unidades por Tipo de Uso</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : kickoffData && kickoffData.usage_types.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Uso</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Veículos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kickoffData.usage_types.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <Badge variant="outline">{item.usage_type}</Badge>
                    </TableCell>
                    <TableCell>{item.company_name}</TableCell>
                    <TableCell className="text-right font-bold">
                      {item.total_quantity}x
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.vehicle_count} {item.vehicle_count === 1 ? 'veículo' : 'veículos'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado do Segsale disponível
            </div>
          )}
        </CardContent>
      </Card>

      {usageTypeSummary && usageTypeSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo por Tipo de Uso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {usageTypeSummary.map((item, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{item.usage_type}</Badge>
                      <div className="text-2xl font-bold">{item.total_quantity}x</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Kickoff;
