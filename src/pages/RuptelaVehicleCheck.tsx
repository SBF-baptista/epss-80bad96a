import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ruptelaVehicleService, type RuptelaCheckResponse } from '@/services/ruptelaVehicleService';

export default function RuptelaVehicleCheck() {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RuptelaCheckResponse | null>(null);

  const handleCheck = async () => {
    if (!brand.trim() || !model.trim()) {
      toast.error('Informe marca e modelo');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await ruptelaVehicleService.checkVehicle(
        brand.trim(),
        model.trim(),
        year ? Number(year) : undefined,
      );
      setResult(res);
      if (res.stale) toast.warning('Exibindo dados em cache antigo (Ruptela indisponível)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Falha ao consultar Ruptela', { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compatibilidade Ruptela</h1>
        <p className="text-muted-foreground">
          Verifique se um veículo é suportado pelos rastreadores Ruptela e quais dispositivos são
          compatíveis.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consultar veículo</CardTitle>
          <CardDescription>
            Os dados são consultados diretamente da lista oficial pública da Ruptela, com cache de
            24h.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ex: Mercedes-Benz"
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ex: Actros"
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Ano (opcional)</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Ex: 2022"
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              />
            </div>
          </div>
          <Button onClick={handleCheck} disabled={loading} className="w-full md:w-auto">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Consultando...
              </>
            ) : (
              'Verificar compatibilidade'
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {result.supported ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Veículo suportado
                    </>
                  ) : result.candidates.length > 0 ? (
                    <>
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      Match parcial
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-destructive" />
                      Não encontrado
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {result.brand} {result.model}
                  {result.year ? ` · ${result.year}` : ''}
                </CardDescription>
              </div>
              {result.stale && <Badge variant="outline">Cache antigo</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.matched_entry && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Geração</div>
                    <div className="font-medium">{result.matched_entry.generation || '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Tipo</div>
                    <div className="font-medium capitalize">{result.matched_entry.type || '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Período</div>
                    <div className="font-medium">
                      {result.matched_entry.year_from ?? '?'} -{' '}
                      {result.matched_entry.year_to ?? 'atual'}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Conexão</div>
                    <div className="font-medium">
                      {result.matched_entry.connection_methods.join(', ') || '-'}
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="text-sm text-muted-foreground mb-2">Dispositivos compatíveis</div>
                  <div className="flex flex-wrap gap-2">
                    {result.matched_entry.devices.map((d) => (
                      <Badge key={d} variant="secondary">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>

                {result.matched_entry.regions.length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Regiões</div>
                    <div className="flex flex-wrap gap-2">
                      {result.matched_entry.regions.map((r) => (
                        <Badge key={r} variant="outline">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!result.supported && result.candidates.length > 0 && (
              <div>
                <Separator className="my-4" />
                <div className="text-sm text-muted-foreground mb-2">
                  Modelos parecidos encontrados:
                </div>
                <div className="space-y-2">
                  {result.candidates.slice(0, 5).map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded border bg-muted/30 text-sm"
                    >
                      <div>
                        <span className="font-medium">{c.model}</span>
                        <span className="text-muted-foreground ml-2">
                          {c.generation} · {c.year_from ?? '?'}-{c.year_to ?? 'atual'}
                        </span>
                      </div>
                      <div className="flex gap-2 items-center">
                        {!c.year_in_range && result.year && (
                          <Badge variant="outline" className="text-xs">
                            fora do ano
                          </Badge>
                        )}
                        <Badge variant="secondary">{c.match_score}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!result.supported && result.candidates.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum modelo dessa marca corresponde. Verifique a grafia ou consulte a lista
                completa em{' '}
                <a
                  href={`https://vehicles.ruptela.com/vehicles?brand=${encodeURIComponent(result.brand)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  vehicles.ruptela.com
                </a>
                .
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
