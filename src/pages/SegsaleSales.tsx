import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Package, RefreshCw, Filter, FileJson, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { SectionSkeleton } from "@/components/ui/loading";
import { fetchSegsaleProductsDirect } from "@/services/segsaleService";

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
  const [detailSaleId, setDetailSaleId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const openDetails = async (saleId: number) => {
    setDetailSaleId(saleId);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const result = await fetchSegsaleProductsDirect(saleId);
      setDetailData(result);
      if (!(result as any)?.success) {
        toast({ title: "Falha ao buscar detalhes", description: (result as any)?.error || "Erro desconhecido", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao buscar JSON", description: err?.message, variant: "destructive" });
    } finally {
      setDetailLoading(false);
    }
  };

  const copyJson = async () => {
    if (!detailData) return;
    await navigator.clipboard.writeText(JSON.stringify(detailData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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
        <SectionSkeleton rows={5} message="Carregando vendas..." />
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
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {items.length} veículo{items.length > 1 ? "s" : ""}
                      </Badge>
                      {saleId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetails(saleId)}
                          className="h-7 text-xs"
                        >
                          <FileJson className="h-3.5 w-3.5 mr-1" />
                          Ver JSON completo
                        </Button>
                      )}
                    </div>
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

      <Dialog open={detailSaleId !== null} onOpenChange={(o) => { if (!o) { setDetailSaleId(null); setDetailData(null); } }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-primary" />
              Detalhes completos — Venda #{detailSaleId}
            </DialogTitle>
            <DialogDescription>
              Resposta tratada do endpoint <code>fetch-segsale-products</code> (inclui dados da API Segsale + cliente local).
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Buscando dados no Segsale...</span>
            </div>
          ) : detailData ? (
            <Tabs defaultValue="resumo" className="flex-1 overflow-hidden flex flex-col">
              <TabsList>
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="veiculos">Veículos & Itens</TabsTrigger>
                <TabsTrigger value="json">JSON completo</TabsTrigger>
              </TabsList>

              <TabsContent value="resumo" className="overflow-auto space-y-3">
                {(() => {
                  const sale = detailData?.sales?.[0] || detailData?.sale || detailData;
                  const client = detailData?.client_id || sale?.client || {};
                  const items = sale?.contract_items || [];
                  return (
                    <div className="space-y-3 text-sm">
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Cliente</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2 text-xs">
                          <div><strong>Nome/Empresa:</strong> {client?.name || client?.company_name || sale?.customer_name || "—"}</div>
                          <div><strong>Documento:</strong> {client?.document_number || sale?.cpf_cnpj || "—"}</div>
                          <div><strong>Código Cliente:</strong> {client?.codigo_cliente || "—"}</div>
                          <div><strong>Telefone:</strong> {client?.phone || sale?.phone || "—"}</div>
                          <div className="col-span-2"><strong>Endereço:</strong> {[client?.address_street, client?.address_number, client?.address_city, client?.address_state].filter(Boolean).join(", ") || "—"}</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Venda</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2 text-xs">
                          <div><strong>ID Resumo:</strong> {sale?.id || detailSaleId}</div>
                          <div><strong>Pending Contract:</strong> {sale?.pending_contract_id || "—"}</div>
                          <div><strong>Status:</strong> {sale?.status || "—"}</div>
                          <div><strong>Vendedor:</strong> {sale?.seller || sale?.vendedor || "—"}</div>
                          <div><strong>Data:</strong> {sale?.date || sale?.created_at || "—"}</div>
                          <div><strong>Total veículos:</strong> {sale?.vehicles?.length || sale?.products?.length || 0}</div>
                        </CardContent>
                      </Card>

                      {items.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2"><CardTitle className="text-sm">Itens de Contrato ({items.length})</CardTitle></CardHeader>
                          <CardContent className="text-xs">
                            <ul className="list-disc pl-4 space-y-1">
                              {items.map((it: any, i: number) => (
                                <li key={i}>{it?.name || it?.description || JSON.stringify(it)} {it?.quantity ? `× ${it.quantity}` : ""}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="veiculos" className="overflow-auto">
                {(() => {
                  const sale = detailData?.sales?.[0] || detailData?.sale || detailData;
                  const vehicles = sale?.vehicles || sale?.products || [];
                  if (!vehicles.length) return <p className="text-sm text-muted-foreground">Nenhum veículo na resposta.</p>;
                  return (
                    <div className="space-y-3">
                      {vehicles.map((v: any, i: number) => (
                        <Card key={i}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">
                              {v.brand || v.marca || ""} {v.model || v.vehicle || v.modelo || ""} {v.plate ? `— ${v.plate}` : ""}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-xs space-y-1">
                            <div><strong>Ano:</strong> {v.year || v.ano || "—"} | <strong>Uso:</strong> {v.usage_type || v.tipo_uso || "—"}</div>
                            {(v.accessories?.length || v.modules?.length) ? (
                              <>
                                {v.accessories?.length > 0 && (
                                  <div><strong>Acessórios:</strong> {v.accessories.map((a: any) => a?.name || a).join(", ")}</div>
                                )}
                                {v.modules?.length > 0 && (
                                  <div><strong>Módulos:</strong> {v.modules.map((m: any) => m?.name || m).join(", ")}</div>
                                )}
                              </>
                            ) : (
                              <div className="text-muted-foreground italic">Sem acessórios/módulos retornados pelo Segsale.</div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="json" className="overflow-auto flex-1">
                <div className="flex justify-end mb-2">
                  <Button size="sm" variant="outline" onClick={copyJson}>
                    {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                    {copied ? "Copiado!" : "Copiar JSON"}
                  </Button>
                </div>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto whitespace-pre-wrap break-all">
{JSON.stringify(detailData, null, 2)}
                </pre>
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem dados.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
