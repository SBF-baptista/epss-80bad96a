import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Eye, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TRACKERS = ["FMC150", "FMC130"];

interface Row {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  configuration: string | null;
  test_scheduled_date: string | null;
  test_technician: string | null;
  updated_at: string;
  photoCount: number;
  tracker: string | null;
}

const fetchRows = async (): Promise<Row[]> => {
  // Only photos that really exist and are not empty/black captures
  const { data: photos, error: pErr } = await (supabase.rpc as any)("get_valid_homologation_photo_ids", { p_card_ids: null });
  if (pErr) throw pErr;
  const counts = new Map<string, number>();
  for (const p of (photos ?? []) as { homologation_card_id: string | null }[]) {
    if (p.homologation_card_id) counts.set(p.homologation_card_id, (counts.get(p.homologation_card_id) ?? 0) + 1);
  }
  const ids = [...counts.keys()];
  if (!ids.length) return [];
  const { data: cards, error } = await supabase
    .from("homologation_cards")
    .select("id, brand, model, year, configuration, test_scheduled_date, test_technician, updated_at")
    .in("id", ids)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const configs = [...new Set((cards ?? []).map((c) => c.configuration).filter(Boolean))] as string[];
  const trackerByConfig = new Map<string, string>();
  if (configs.length) {
    const { data: rules } = await supabase
      .from("automation_rules_extended")
      .select("configuration, tracker_model")
      .in("configuration", configs);
    for (const r of rules ?? []) if (r.tracker_model && !trackerByConfig.has(r.configuration)) trackerByConfig.set(r.configuration, r.tracker_model);
  }
  return (cards ?? []).map((c) => ({
    ...c,
    photoCount: counts.get(c.id) ?? 0,
    tracker: c.configuration ? trackerByConfig.get(c.configuration) ?? null : null,
  }));
};

const HomologationPdfs = () => {
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState("");
  const [tracker, setTracker] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({ queryKey: ["homologation-pdfs"], queryFn: fetchRows, enabled: !!user, retry: false });

  const trackerOptions = useMemo(() => {
    const s = new Set(TRACKERS);
    data.forEach((r) => r.tracker && s.add(r.tracker));
    return [...s];
  }, [data]);

  const filtered = data.filter((r) => {
    const q = vehicle.trim().toLowerCase();
    if (q && !`${r.brand} ${r.model} ${r.year ?? ""}`.toLowerCase().includes(q)) return false;
    if (tracker !== "all" && !(r.tracker ?? "").toUpperCase().includes(tracker.toUpperCase())) return false;
    const d = (r.test_scheduled_date ?? r.updated_at).slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });

  const getPdf = async (r: Row, mode: "view" | "download") => {
    setBusy(r.id + mode);
    try {
      const { data: s } = await supabase.auth.getSession();
      const params = new URLSearchParams({ homologation_id: r.id });
      const t = tracker !== "all" ? tracker : r.tracker;
      if (t) params.set("rastreador", t);
      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/homologation-test-pdf?${params}`,
        { headers: { Authorization: `Bearer ${s.session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } },
      );
      if (!res.ok || !res.headers.get("Content-Type")?.includes("pdf")) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Não foi possível gerar o PDF");
      }
      const url = URL.createObjectURL(await res.blob());
      if (mode === "view") window.open(url, "_blank");
      else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `homologacao_${r.brand}_${r.model}_${r.year ?? ""}_${t ?? "padrao"}.pdf`.replace(/[^A-Za-z0-9_.-]+/g, "_");
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">PDFs de Homologação</h1>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Veículo (marca, modelo, ano)" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
          <Select value={tracker} onValueChange={setTracker}>
            <SelectTrigger><SelectValue placeholder="Rastreador" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os rastreadores</SelectItem>
              {trackerOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Data inicial" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Data final" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Configuração</TableHead>
                  <TableHead>Rastreador</TableHead>
                  <TableHead>Data do teste</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Fotos</TableHead>
                  <TableHead className="text-right">PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Nenhuma homologação com fotos encontrada.</TableCell></TableRow>
                )}
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.brand} {r.model} {r.year ?? ""}</TableCell>
                    <TableCell>{r.configuration ?? "-"}</TableCell>
                    <TableCell>{r.tracker ? <Badge variant="secondary">{r.tracker}</Badge> : <span className="text-muted-foreground">Padrão</span>}</TableCell>
                    <TableCell>{new Date(r.test_scheduled_date ?? r.updated_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{r.test_technician ?? "-"}</TableCell>
                    <TableCell>{r.photoCount}</TableCell>
                    <TableCell className="space-x-2 text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => getPdf(r, "view")}>
                        {busy === r.id + "view" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" disabled={!!busy} onClick={() => getPdf(r, "download")}>
                        {busy === r.id + "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        <span className="ml-1">Baixar</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HomologationPdfs;
