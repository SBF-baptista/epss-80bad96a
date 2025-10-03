import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SegsaleVehicle {
  brand: string;
  vehicle: string;
  year: number;
  quantity: number;
  accessories: string[];
  modules: string[];
}

interface SegsaleSale {
  company_name: string;
  usage_type: string;
  vehicles: SegsaleVehicle[];
}

const SegsaleTest = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          'https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/fetch-segsale-products?idResumoVenda=107'
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>Buscando dados Segsale ID 107...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados Segsale - ID Resumo Venda: 107</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-semibold">{data?.success ? 'Sucesso ✓' : 'Falha'}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Mensagem</p>
              <p className="font-semibold">{data?.message}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Total de vendas armazenadas</p>
              <p className="font-semibold">{data?.stored_count}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {data?.sales && data.sales.map((sale: SegsaleSale, idx: number) => (
        <Card key={idx}>
          <CardHeader>
            <CardTitle>Venda {idx + 1}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Empresa</p>
              <p className="font-semibold">{sale.company_name}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Tipo de Uso</p>
              <p className="font-semibold">{sale.usage_type}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Veículos</p>
              <div className="space-y-3">
                {sale.vehicles.map((vehicle: SegsaleVehicle, vIdx: number) => (
                  <Card key={vIdx} className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Marca</p>
                          <p className="font-medium">{vehicle.brand}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Modelo</p>
                          <p className="font-medium">{vehicle.vehicle}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Ano</p>
                          <p className="font-medium">{vehicle.year}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Quantidade</p>
                          <p className="font-medium">{vehicle.quantity}</p>
                        </div>
                      </div>
                      
                      {vehicle.accessories && vehicle.accessories.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1">Acessórios</p>
                          <div className="flex flex-wrap gap-1">
                            {vehicle.accessories.map((acc, aIdx) => (
                              <span key={aIdx} className="text-xs bg-primary/10 px-2 py-1 rounded">
                                {acc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {vehicle.modules && vehicle.modules.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1">Módulos</p>
                          <div className="flex flex-wrap gap-1">
                            {vehicle.modules.map((mod, mIdx) => (
                              <span key={mIdx} className="text-xs bg-secondary/50 px-2 py-1 rounded">
                                {mod}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>JSON Completo</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default SegsaleTest;
