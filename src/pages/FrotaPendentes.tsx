import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SectionSkeleton } from '@/components/ui/loading'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

type TipoContrato = 'TELEMETRIA' | 'MENSALISTA'

interface PendenteItem {
  placa: string
  filial: string
  contrato: string
  pendente: boolean
  tipoContrato: TipoContrato
}

const SUPABASE_URL = 'https://eeidevcyxpnorbgcskdf.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlaWRldmN5eHBub3JiZ2Nza2RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNDY4NTIsImV4cCI6MjA2NjcyMjg1Mn0.d_522xNkZuA5upBT0TuqoIW8ylxTCVhYy3YAHp55xdg'

async function fetchPendentes(tipo: TipoContrato): Promise<PendenteItem[]> {
  const url = `${SUPABASE_URL}/functions/v1/frota-pendentes-listar?tipoContrato=${tipo}`
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  })
  const data = await resp.json()
  const arr = Array.isArray(data?.response) ? data.response : []
  return arr.map((r: any) => ({
    placa: String(r.placa ?? '').toUpperCase(),
    filial: String(r.filial ?? ''),
    contrato: String(r.contrato ?? ''),
    pendente: r.pendente === true,
    tipoContrato: tipo,
  }))
}

const FrotaPendentes = () => {
  const { toast } = useToast()
  const [tipoFilter, setTipoFilter] = useState<'ALL' | TipoContrato>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [checkPlate, setCheckPlate] = useState('')
  const [checkResult, setCheckResult] = useState<null | { pendente: boolean; data?: any }>(null)
  const [checking, setChecking] = useState(false)

  const telemetria = useQuery({
    queryKey: ['frota-pendentes', 'TELEMETRIA'],
    queryFn: () => fetchPendentes('TELEMETRIA'),
    staleTime: 1000 * 60 * 2,
  })
  const mensalista = useQuery({
    queryKey: ['frota-pendentes', 'MENSALISTA'],
    queryFn: () => fetchPendentes('MENSALISTA'),
    staleTime: 1000 * 60 * 2,
  })

  const isLoading = telemetria.isLoading || mensalista.isLoading
  const error = telemetria.error || mensalista.error

  const all = useMemo<PendenteItem[]>(
    () => [...(telemetria.data ?? []), ...(mensalista.data ?? [])],
    [telemetria.data, mensalista.data],
  )

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toUpperCase()
    return all.filter((r) => {
      const tipoMatch = tipoFilter === 'ALL' || r.tipoContrato === tipoFilter
      const search =
        !term ||
        r.placa.includes(term) ||
        r.contrato.includes(term) ||
        r.filial.includes(term)
      return tipoMatch && search
    })
  }, [all, tipoFilter, searchTerm])

  const handleCheckPlate = async () => {
    const placa = checkPlate.trim().toUpperCase()
    if (!placa) return
    setChecking(true)
    setCheckResult(null)
    try {
      const { data, error } = await supabase.functions.invoke('frota-check-placa-pendente', {
        body: { placa },
      })
      if (error) throw error
      setCheckResult({ pendente: !!data?.pendente, data: data?.data })
    } catch (err) {
      toast({
        title: 'Erro ao verificar placa',
        description: err instanceof Error ? err.message : 'Falha na consulta',
        variant: 'destructive',
      })
    } finally {
      setChecking(false)
    }
  }

  const refetchAll = () => {
    telemetria.refetch()
    mensalista.refetch()
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-none px-3 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
              Pendências Segsale (Frota)
            </h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Placas aguardando criação de unidade na base de pendências do Segsale.
            </p>
          </div>
          <Button variant="outline" onClick={refetchAll} disabled={isLoading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Verificação individual */}
        <Card className="mb-4">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm sm:text-base">Verificar placa</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Digite a placa (ex: ABC1D23)"
                value={checkPlate}
                onChange={(e) => setCheckPlate(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckPlate()}
                className="max-w-sm"
              />
              <Button onClick={handleCheckPlate} disabled={checking || !checkPlate.trim()}>
                {checking ? 'Verificando...' : 'Verificar'}
              </Button>
            </div>
            {checkResult && (
              <div className="mt-3">
                {checkResult.pendente ? (
                  <Alert>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <AlertDescription>
                      Placa <strong>{checkPlate.toUpperCase()}</strong> está na base de pendências.
                      {checkResult.data && (
                        <span className="ml-2 text-muted-foreground">
                          (Filial: {checkResult.data.filial ?? '-'} · Contrato:{' '}
                          {checkResult.data.contrato ?? '-'} · Tipo:{' '}
                          {checkResult.data.tipoContrato ?? '-'})
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <XCircle className="w-4 h-4" />
                    <AlertDescription>
                      Placa <strong>{checkPlate.toUpperCase()}</strong> NÃO está na base de pendências.
                      É necessário cadastrar no Segsale antes de agendar.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          <Card>
            <CardHeader className="pb-1 p-3"><CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle></CardHeader>
            <CardContent className="pt-0 px-3 pb-3"><div className="text-xl sm:text-2xl font-bold text-primary">{all.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 p-3"><CardTitle className="text-xs font-medium text-muted-foreground">Telemetria</CardTitle></CardHeader>
            <CardContent className="pt-0 px-3 pb-3"><div className="text-xl sm:text-2xl font-bold">{telemetria.data?.length ?? 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 p-3"><CardTitle className="text-xs font-medium text-muted-foreground">Mensalista</CardTitle></CardHeader>
            <CardContent className="pt-0 px-3 pb-3"><div className="text-xl sm:text-2xl font-bold">{mensalista.data?.length ?? 0}</div></CardContent>
          </Card>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 px-3 sm:px-6 pb-4 sm:pb-6 overflow-hidden">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-2 p-3 sm:p-4 flex-none space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base">
                Placas pendentes ({filtered.length})
              </CardTitle>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por placa, contrato ou filial..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
              <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as any)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os tipos</SelectItem>
                  <SelectItem value="TELEMETRIA">Telemetria</SelectItem>
                  <SelectItem value="MENSALISTA">Mensalista</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4 flex-1 overflow-hidden">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>Erro ao carregar pendências.</AlertDescription>
              </Alert>
            ) : isLoading ? (
              <SectionSkeleton rows={6} message="Carregando pendências..." />
            ) : filtered.length === 0 ? (
              <div className="flex justify-center items-center h-full text-muted-foreground">
                Nenhuma pendência encontrada.
              </div>
            ) : (
              <div className="h-full overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Placa</TableHead>
                      <TableHead className="text-xs sm:text-sm">Filial</TableHead>
                      <TableHead className="text-xs sm:text-sm">Contrato</TableHead>
                      <TableHead className="text-xs sm:text-sm">Tipo</TableHead>
                      <TableHead className="text-xs sm:text-sm">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r, idx) => (
                      <TableRow key={`${r.tipoContrato}-${r.placa}-${r.contrato}-${idx}`}>
                        <TableCell className="font-medium text-xs sm:text-sm">{r.placa}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{r.filial}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{r.contrato}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{r.tipoContrato}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="text-xs bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 border-amber-500/30">
                            Pendente
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default FrotaPendentes
