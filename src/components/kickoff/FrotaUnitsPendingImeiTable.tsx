import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Link2, AlertTriangle, RadioTower } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FrotaUnitPending {
  id: string;
  incoming_vehicle_id: string | null;
  plate: string | null;
  brand: string | null;
  model: string | null;
  company_name: string | null;
  status: "aguardando_imei" | "concluido" | "erro_criacao";
  imei: string | null;
  frota_response: any;
  linked_by: string | null;
  linked_at: string | null;
  created_at: string;
}

const IMEI_REGEX = /^[A-Za-z0-9]{6,20}$/;

export const FrotaUnitsPendingImeiTable = () => {
  const [filter, setFilter] = useState<"aguardando_imei" | "erro_criacao" | "concluido">(
    "aguardando_imei",
  );
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["frota-units-pending-imei", filter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("frota_units_pending_imei")
        .select("*")
        .eq("status", filter)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FrotaUnitPending[];
    },
    staleTime: 30_000,
  });

  const [imeiInput, setImeiInput] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const linkImei = async (row: FrotaUnitPending) => {
    const value = (imeiInput[row.id] ?? "").trim();
    if (!IMEI_REGEX.test(value)) {
      toast.error("Informe um IMEI válido (6-20 caracteres alfanuméricos).");
      return;
    }
    setSavingId(row.id);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;
      const { error } = await supabase
        .from("frota_units_pending_imei")
        .update({
          imei: value,
          status: "concluido",
          linked_by: uid,
          linked_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (error) throw error;
      toast.success(`IMEI vinculado à placa ${row.plate ?? ""}`);
      setImeiInput((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["frota-units-pending-imei"] });
    } catch (err: any) {
      console.error("[FrotaUnitsPendingImei] link error", err);
      toast.error(err?.message || "Não foi possível vincular o IMEI.");
    } finally {
      setSavingId(null);
    }
  };

  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="aguardando_imei">
            <RadioTower className="h-4 w-4 mr-2" />
            Aguardando IMEI
          </TabsTrigger>
          <TabsTrigger value="erro_criacao">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Erros de criação
          </TabsTrigger>
          <TabsTrigger value="concluido">Concluídos</TabsTrigger>
        </TabsList>

        {(["aguardando_imei", "erro_criacao", "concluido"] as const).map((val) => (
          <TabsContent key={val} value={val} className="mt-4">
            {isLoading ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : rows.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  Nenhuma unidade neste filtro.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Placa</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Criado</TableHead>
                        {filter === "aguardando_imei" && <TableHead>Vincular IMEI</TableHead>}
                        {filter === "erro_criacao" && <TableHead>Erro</TableHead>}
                        {filter === "concluido" && <TableHead>IMEI</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">
                            {row.plate || "—"}
                          </TableCell>
                          <TableCell>
                            {[row.brand, row.model].filter(Boolean).join(" ") || "—"}
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate">
                            {row.company_name || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(row.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </TableCell>
                          {filter === "aguardando_imei" && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input
                                  value={imeiInput[row.id] ?? ""}
                                  onChange={(e) =>
                                    setImeiInput((prev) => ({
                                      ...prev,
                                      [row.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="IMEI do rastreador"
                                  className="h-9 w-52"
                                  disabled={savingId === row.id}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => linkImei(row)}
                                  disabled={savingId === row.id}
                                >
                                  {savingId === row.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Link2 className="h-4 w-4 mr-1" />
                                      Vincular
                                    </>
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          )}
                          {filter === "erro_criacao" && (
                            <TableCell className="max-w-[320px]">
                              <Badge variant="destructive" className="mb-1">
                                HTTP {row.frota_response?.http_status ?? "—"}
                              </Badge>
                              <div className="text-xs text-muted-foreground truncate">
                                {typeof row.frota_response?.response === "string"
                                  ? row.frota_response.response
                                  : JSON.stringify(row.frota_response?.response ?? {})}
                              </div>
                            </TableCell>
                          )}
                          {filter === "concluido" && (
                            <TableCell className="font-mono text-xs">
                              {row.imei || "—"}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Atualizar
        </Button>
      </div>
    </div>
  );
};
