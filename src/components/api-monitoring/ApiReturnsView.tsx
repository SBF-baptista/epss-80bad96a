import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, Code, Database, FileJson } from "lucide-react";
import { useState } from "react";
import { ENDPOINT_RETURNS_CATALOG, type EndpointReturnDoc } from "@/services/endpointReturnsCatalog";

const methodColors: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-800 border-emerald-200",
  POST: "bg-blue-100 text-blue-800 border-blue-200",
  PUT: "bg-amber-100 text-amber-800 border-amber-200",
  DELETE: "bg-red-100 text-red-800 border-red-200",
  PATCH: "bg-purple-100 text-purple-800 border-purple-200",
};

function EndpointCard({ ep }: { ep: EndpointReturnDoc }) {
  const { data: example, isFetching, refetch } = useQuery({
    queryKey: ["endpoint-live-example", ep.name],
    queryFn: async () => (ep.fetchLiveExample ? await ep.fetchLiveExample() : null),
    staleTime: 30_000,
    enabled: !!ep.fetchLiveExample,
  });

  return (
    <AccordionItem value={ep.name} className="border rounded-lg bg-background">
      <AccordionTrigger className="px-4 hover:no-underline">
        <div className="flex items-center gap-3 flex-1 text-left">
          <Badge className={methodColors[ep.method] || ""}>{ep.method}</Badge>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{ep.name}</div>
            <div className="text-xs text-muted-foreground font-mono truncate">{ep.url}</div>
          </div>
          <Badge variant="outline" className="text-xs">{ep.system}</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 space-y-4">
        {/* Descrição */}
        <section>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Descrição detalhada</h4>
          <p className="text-sm leading-relaxed text-foreground/90">{ep.description}</p>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <Database className="h-3 w-3" /> <span className="font-medium">Fonte:</span> {ep.dataSource}
          </p>
        </section>

        {/* Inputs */}
        <section>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <Code className="h-3 w-3" /> Parâmetros de entrada
          </h4>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 text-xs">Campo</TableHead>
                  <TableHead className="h-8 text-xs w-[180px]">Tipo</TableHead>
                  <TableHead className="h-8 text-xs">Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ep.inputs.map((f) => (
                  <TableRow key={f.field}>
                    <TableCell className="font-mono text-xs py-1.5">{f.field}</TableCell>
                    <TableCell className="text-xs py-1.5 text-muted-foreground">{f.type}</TableCell>
                    <TableCell className="text-xs py-1.5">{f.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* Response schema */}
        <section>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <FileJson className="h-3 w-3" /> Schema de resposta ({ep.responseSchema.length} campos)
          </h4>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 text-xs">Campo</TableHead>
                  <TableHead className="h-8 text-xs w-[160px]">Tipo</TableHead>
                  <TableHead className="h-8 text-xs">Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ep.responseSchema.map((f) => (
                  <TableRow key={f.field}>
                    <TableCell className="font-mono text-xs py-1.5">{f.field}</TableCell>
                    <TableCell className="text-xs py-1.5 text-muted-foreground">{f.type}</TableCell>
                    <TableCell className="text-xs py-1.5">{f.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* Live example */}
        {ep.fetchLiveExample && (
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Exemplo ao vivo (dados reais da plataforma)
              </h4>
              <button
                onClick={() => refetch()}
                className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
                disabled={isFetching}
              >
                <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
              </button>
            </div>
            <ScrollArea className="h-[260px] border rounded-md bg-muted/30">
              <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all">
                {isFetching ? "Carregando..." : JSON.stringify(example, null, 2)}
              </pre>
            </ScrollArea>
          </section>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

export default function ApiReturnsView() {
  const [search, setSearch] = useState("");
  const [systemFilter, setSystemFilter] = useState("all");

  const systems = Array.from(new Set(ENDPOINT_RETURNS_CATALOG.map((e) => e.system)));
  const filtered = ENDPOINT_RETURNS_CATALOG.filter((e) => {
    const s = search.toLowerCase();
    const matchSearch =
      e.name.toLowerCase().includes(s) ||
      e.url.toLowerCase().includes(s) ||
      e.description.toLowerCase().includes(s);
    const matchSystem = systemFilter === "all" || e.system === systemFilter;
    return matchSearch && matchSystem;
  });

  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Buscar por nome, URL ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <Select value={systemFilter} onValueChange={setSystemFilter}>
            <SelectTrigger className="w-[180px] h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os sistemas</SelectItem>
              {systems.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center text-xs text-muted-foreground">
            {filtered.length} de {ENDPOINT_RETURNS_CATALOG.length} endpoints
          </div>
        </div>

        <Accordion type="multiple" className="space-y-2">
          {filtered.map((ep) => (
            <EndpointCard key={ep.name} ep={ep} />
          ))}
        </Accordion>

        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhum endpoint encontrado com esses filtros.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
