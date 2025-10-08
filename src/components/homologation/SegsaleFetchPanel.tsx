import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const SegsaleFetchPanel = () => {
  const [idResumoVenda, setIdResumoVenda] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  const handleFetch = async () => {
    if (!idResumoVenda.trim()) {
      toast.error("Digite um ID de Resumo de Venda");
      return;
    }

    setLoading(true);
    try {
      // Construct URL with query parameter
      const url = `https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/fetch-segsale-products?idResumoVenda=${idResumoVenda}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('📦 Resposta Segsale completa:', result);

      if (result.success) {
        // Store result to display
        setResultData(result);

        // Log contract items if available
        result.sales?.forEach((sale: any) => {
          if (sale.contract_items) {
            console.log(`✅ Itens do Contrato ${sale.id_contrato_pendente}:`, sale.contract_items);
          }
        });

        toast.success(
          `Busca concluída: ${result.stored_count} venda(s) armazenada(s)`,
          {
            description: result.processing?.forwarded 
              ? `Processamento: ${result.processing.success ? 'Sucesso' : 'Erro'}`
              : 'Aguardando processamento manual'
          }
        );
      } else {
        setResultData(null);
        toast.error("Erro ao buscar dados", {
          description: result.error || "Erro desconhecido"
        });
      }
    } catch (err: any) {
      console.error("Erro ao buscar Segsale:", err);
      toast.error("Erro ao buscar dados do Segsale", {
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buscar Venda Segsale</CardTitle>
        <CardDescription>
          Digite o ID do Resumo de Venda para buscar e processar automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="ID Resumo Venda (ex: 257)"
            value={idResumoVenda}
            onChange={(e) => setIdResumoVenda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
          />
          <Button onClick={handleFetch} disabled={loading}>
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </div>

        {resultData && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Resultado da Busca</h3>
              <Badge variant="outline">ID: {resultData.id_resumo_venda}</Badge>
            </div>
            
            <Separator />

            {resultData.sales?.map((sale: any, idx: number) => (
              <div key={idx} className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Empresa:</span> {sale.company_name}
                  </div>
                  <div>
                    <span className="font-medium">Tipo de Uso:</span> {sale.usage_type}
                  </div>
                  {sale.cpf && (
                    <div>
                      <span className="font-medium">CPF:</span> {sale.cpf}
                    </div>
                  )}
                  {sale.phone && (
                    <div>
                      <span className="font-medium">Telefone:</span> {sale.phone}
                    </div>
                  )}
                  {sale.id_contrato_pendente && (
                    <div>
                      <span className="font-medium">ID Contrato:</span> {sale.id_contrato_pendente}
                    </div>
                  )}
                </div>

                {sale.vehicles?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Veículos:</h4>
                    {sale.vehicles.map((vehicle: any, vIdx: number) => (
                      <div key={vIdx} className="pl-4 border-l-2 border-primary/20 text-sm">
                        <div><strong>{vehicle.brand}</strong> {vehicle.vehicle}</div>
                        <div className="text-muted-foreground">
                          Ano: {vehicle.year} | Quantidade: {vehicle.quantity}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {sale.contract_items?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      ✅ Itens do Contrato ({sale.contract_items.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {sale.contract_items.map((item: any, iIdx: number) => (
                        <div key={iIdx} className="flex justify-between items-center p-2 bg-background rounded border text-sm">
                          <span>{item.accessory_name}</span>
                          <Badge variant="secondary">Qtd: {item.quantity}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sale.address && (
                  <div className="space-y-1 text-sm">
                    <h4 className="font-medium">Endereço:</h4>
                    <div className="pl-4 text-muted-foreground">
                      {sale.address.street}, {sale.address.number}
                      {sale.address.complement && ` - ${sale.address.complement}`}
                      <br />
                      {sale.address.district} - {sale.address.city}
                      <br />
                      CEP: {sale.address.zip_code}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {resultData.processing?.forwarded && (
              <div className="pt-2">
                <Badge variant={resultData.processing.success ? "default" : "destructive"}>
                  Processamento: {resultData.processing.success ? "✓ Sucesso" : "✗ Erro"}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
