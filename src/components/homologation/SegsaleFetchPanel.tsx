import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const SegsaleFetchPanel = () => {
  const [idResumoVenda, setIdResumoVenda] = useState("");
  const [loading, setLoading] = useState(false);

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

        // Show additional info about contract items
        const salesWithContracts = result.sales?.filter((s: any) => s.contract_items)?.length || 0;
        if (salesWithContracts > 0) {
          toast.info(
            `${salesWithContracts} contrato(s) com itens encontrado(s)`,
            { description: 'Veja o console do navegador para detalhes completos' }
          );
        }
      } else {
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
      <CardContent>
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
      </CardContent>
    </Card>
  );
};
