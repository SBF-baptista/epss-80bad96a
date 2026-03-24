import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Package, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface IncomingVehicleRow {
  id: string;
  sale_summary_id: number | null;
  company_name: string | null;
  cpf: string | null;
  brand: string;
  vehicle: string;
  year: number | null;
  plate: string | null;
  usage_type: string;
  quantity: number | null;
  address_city: string | null;
  processed: boolean;
  kickoff_completed: boolean | null;
  received_at: string;
  phone: string | null;
  pending_contract_id: number | null;
}

const usageTypeLabels: Record<string, string> = {
  rastreamento: "Rastreamento",
  telemetria: "Telemetria",
  telemetria_can: "Telemetria CAN",
  camera: "Câmera",
  camera_telemetria: "Câmera + Telemetria",
};

export default function SegsaleSales() {
  const [vehicles, setVehicles] = useState<IncomingVehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("incoming_vehicles")
        .select("id, sale_summary_id, company_name, cpf, brand, vehicle, year, plate, usage_type, quantity, address_city, processed, kickoff_completed, received_at, phone, pending_contract_id")
        .order("received_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setVehicles((data as IncomingVehicleRow[]) || []);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
      toast({ title: "Erro ao carregar vendas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const filtered = vehicles.filter((v) => {
    const matchesSearch =
      !search ||
      (v.company_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.vehicle || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.plate || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.brand || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.cpf || "").includes(search) ||
      String(v.sale_summary_id || "").includes(search);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "processed" && v.processed) ||
      (statusFilter === "pending" && !v.processed);

    return matchesSearch && matchesStatus;
  });

  // Group by sale_summary_id
  const grouped = filtered.reduce<Record<string, IncomingVehicleRow[]>>((acc, v) => {
    const key = v.sale_summary_id ? String(v.sale_summary_id) : `sem-id-${v.id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});

  const sortedGroups = Object.entries(grouped).sort(([, a], [, b]) => {
    const dateA = new Date(a[0].received_at).getTime();
    const dateB = new Date(b[0].received_at).getTime();
    return dateB - dateA;
  });

  const totalVehicles = filtered.length;
  const processedCount = filtered.filter((v) => v.processed).length;
  const pendingCount = totalVehicles - processedCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendas Segsale</h1>
          <p className="text-muted-foreground">Todas as vendas recebidas do Segsale com data/hora de importação</p>
        </div>
        <Button onClick={fetchVehicles} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-foreground">{totalVehicles}</div>
            <p className="text-sm text-muted-foreground">Total de Veículos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-green-600">{processedCount}</div>
            <p className="text-sm text-muted-foreground">Processados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa, veículo, placa, CPF ou ID venda..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="processed">Processados</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : sortedGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma venda encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map(([groupKey, items]) => {
            const first = items[0];
            const saleId = first.sale_summary_id;
            return (
              <Card key={groupKey}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      {saleId ? `Venda #${saleId}` : "Sem ID de Venda"} — {first.company_name || "Empresa não informada"}
                      {first.cpf && <span className="text-sm text-muted-foreground font-normal ml-2">({first.cpf})</span>}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {items.length} veículo{items.length > 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Veículo</TableHead>
                          <TableHead>Ano</TableHead>
                          <TableHead>Placa</TableHead>
                          <TableHead>Tipo de Uso</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Cidade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Kickoff</TableHead>
                          <TableHead>Recebido em</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">
                              {v.brand} {v.vehicle}
                            </TableCell>
                            <TableCell>{v.year || "—"}</TableCell>
                            <TableCell>{v.plate || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {usageTypeLabels[v.usage_type] || v.usage_type}
                              </Badge>
                            </TableCell>
                            <TableCell>{v.quantity ?? 1}</TableCell>
                            <TableCell>{v.address_city || "—"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={v.processed ? "default" : "outline"}
                                className={v.processed ? "bg-green-600 hover:bg-green-700 text-white" : "border-yellow-500 text-yellow-700"}
                              >
                                {v.processed ? "Processado" : "Pendente"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={v.kickoff_completed ? "default" : "outline"}
                                className={v.kickoff_completed ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-muted-foreground/30 text-muted-foreground"}
                              >
                                {v.kickoff_completed ? "Concluído" : "Pendente"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(v.received_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
