import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2, MapPin, User, Phone, FileText, Car, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchSegsaleProductsDirect } from "@/services/segsaleService";

export default function SegsaleSearch() {
  const [idResumoVenda, setIdResumoVenda] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    const id = idResumoVenda.trim();
    if (!id) {
      toast({ title: "Digite um ID de Resumo de Venda", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResultData(null);
    try {
      const result: any = await fetchSegsaleProductsDirect(Number(id));
      console.log("📦 Resposta Segsale completa:", result);

      if (result?.success) {
        setResultData(result);
        if (result.cached) {
          toast({
            title: "Segsale indisponível: exibindo cache",
            description: `Último cache: ${result.cache_updated_at || "desconhecido"}`,
          });
        } else {
          toast({
            title: `Busca concluída: ${result.sales?.length || 0} venda(s)`,
          });
        }
      } else {
        toast({ title: "Erro ao buscar dados", description: result?.error || "Erro desconhecido", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Erro ao buscar Segsale:", err);
      toast({ title: "Erro ao buscar dados do Segsale", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Busca Segsale</h1>
        <p className="text-muted-foreground">Consulte os dados de uma venda pelo ID do Resumo de Venda</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Venda
          </CardTitle>
          <CardDescription>
            Digite o ID do Resumo de Venda para consultar todas as informações disponíveis na API Segsale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 max-w-md">
            <Input
              type="number"
              placeholder="Ex: 10945"
              value={idResumoVenda}
              onChange={(e) => setIdResumoVenda(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {resultData && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Resultado</h2>
            <Badge variant="outline" className="text-base">ID Resumo Venda: {resultData.sale_summary_id}</Badge>
            {resultData.cached && <Badge variant="secondary">Cache</Badge>}
          </div>

          {resultData.sales?.map((sale: any, idx: number) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {sale.company_name || "Empresa não identificada"}
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge>{sale.usage_type}</Badge>
                  {sale.pending_contract_id && (
                    <Badge variant="outline">
                      <FileText className="h-3 w-3 mr-1" />
                      Contrato: {sale.pending_contract_id}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Info do cliente */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {sale.cpf && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">CPF/CNPJ:</span> {sale.cpf}
                    </div>
                  )}
                  {sale.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Telefone:</span> {sale.phone}
                    </div>
                  )}
                </div>

                {/* Endereço */}
                {sale.address && (
                  <div className="p-3 rounded-lg bg-muted/40 border">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Endereço</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {sale.address.street}{sale.address.number ? `, ${sale.address.number}` : ""}
                      {sale.address.complement ? ` - ${sale.address.complement}` : ""}
                      <br />
                      {sale.address.district}{sale.address.city ? ` - ${sale.address.city}` : ""}
                      {sale.address.zip_code ? ` | CEP: ${sale.address.zip_code}` : ""}
                    </p>
                  </div>
                )}

                {/* Veículos */}
                {sale.vehicles?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                      <Car className="h-4 w-4" />
                      Veículos ({sale.vehicles.length})
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Marca</TableHead>
                          <TableHead>Modelo</TableHead>
                          <TableHead>Ano</TableHead>
                          <TableHead>Placa</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Acessórios</TableHead>
                          <TableHead>Módulos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sale.vehicles.map((v: any, vIdx: number) => (
                          <TableRow key={vIdx}>
                            <TableCell className="font-medium">{v.brand}</TableCell>
                            <TableCell>{v.vehicle}</TableCell>
                            <TableCell>{v.year || "—"}</TableCell>
                            <TableCell>{v.plate || "—"}</TableCell>
                            <TableCell>{v.quantity || 1}</TableCell>
                            <TableCell>
                              {v.accessories?.length > 0
                                ? v.accessories.map((a: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="mr-1 mb-1 text-xs">{a}</Badge>
                                  ))
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {v.modules?.length > 0
                                ? v.modules.map((m: string, i: number) => (
                                    <Badge key={i} variant="outline" className="mr-1 mb-1 text-xs">{m}</Badge>
                                  ))
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Itens do contrato */}
                {sale.contract_items?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                      <Package className="h-4 w-4" />
                      Itens do Contrato ({sale.contract_items.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {sale.contract_items.map((item: any, iIdx: number) => (
                        <div key={iIdx} className="flex justify-between items-center p-2 bg-muted/30 rounded border text-sm">
                          <span>{item.name}</span>
                          <Badge variant="secondary">Qtd: {item.quantity}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {resultData.processing?.forwarded && (
            <Card>
              <CardContent className="pt-4">
                <Badge variant={resultData.processing.success ? "default" : "destructive"}>
                  Processamento: {resultData.processing.success ? "✓ Sucesso" : "✗ Erro"}
                </Badge>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
