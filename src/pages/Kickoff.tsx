import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Users, Truck, Edit, CheckCircle2, AlertCircle } from "lucide-react";
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
import { KickoffDetailsModal } from "@/components/kickoff/KickoffDetailsModal";

const Kickoff = () => {
  const [selectedSaleSummaryId, setSelectedSaleSummaryId] = useState<number | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);

  const { data: kickoffData, isLoading, refetch } = useQuery({
    queryKey: ['kickoff-data'],
    queryFn: getKickoffData,
  });

  const handleEditKickoff = (saleSummaryId: number, companyName: string) => {
    setSelectedSaleSummaryId(saleSummaryId);
    setSelectedCompanyName(companyName);
    setModalOpen(true);
  };

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
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
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
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {item.needs_blocking && (
                          <Badge variant="destructive" className="text-xs">
                            Bloqueio
                          </Badge>
                        )}
                        {item.has_kickoff_details ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditKickoff(item.sale_summary_id, item.company_name)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
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

      {selectedSaleSummaryId && (
        <KickoffDetailsModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          saleSummaryId={selectedSaleSummaryId}
          companyName={selectedCompanyName}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
};

export default Kickoff;
