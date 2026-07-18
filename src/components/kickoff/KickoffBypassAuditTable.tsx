import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FastForward, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BypassLogRow {
  id: string;
  incoming_vehicle_id: string;
  plate: string | null;
  brand: string | null;
  model: string | null;
  company_name: string | null;
  performed_by: string | null;
  performed_by_email: string | null;
  justification: string;
  resulting_customer_id: string | null;
  resulting_kit_schedule_id: string | null;
  created_at: string;
}

export const KickoffBypassAuditTable = () => {
  const { user } = useAuth();
  const { canViewModule } = useUserRole();
  const canView = canViewModule("kickoff_bypass");

  const { data, isLoading } = useQuery({
    queryKey: ["kickoff-bypass-log"],
    queryFn: async (): Promise<BypassLogRow[]> => {
      const { data, error } = await supabase
        .from("kickoff_bypass_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as BypassLogRow[]) || [];
    },
    enabled: !!user && canView,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 30,
  });

  if (!canView) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground mb-3" />
          <h3 className="font-medium text-foreground mb-1">Acesso restrito</h3>
          <p className="text-sm text-muted-foreground">
            Você não tem permissão para visualizar a auditoria de bypass.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FastForward className="h-8 w-8 text-muted-foreground mb-3" />
          <h3 className="font-medium text-foreground mb-1">
            Nenhum bypass registrado
          </h3>
          <p className="text-sm text-muted-foreground">
            Quando um Gestor pular etapas do Kickoff, o registro aparecerá aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by (created_at minute + performed_by + justification) so a single
  // bypass action with multiple vehicles renders as one row with a count.
  const grouped = new Map<string, BypassLogRow[]>();
  for (const row of data) {
    const bucket = `${row.performed_by ?? "?"}|${row.justification}|${row.created_at.slice(0, 16)}|${row.company_name ?? ""}`;
    const arr = grouped.get(bucket) ?? [];
    arr.push(row);
    grouped.set(bucket, arr);
  }
  const groups = Array.from(grouped.values()).sort(
    (a, b) =>
      new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime(),
  );

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Veículos</TableHead>
                <TableHead>Executado por</TableHead>
                <TableHead>Justificativa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((rows) => {
                const first = rows[0];
                return (
                  <TableRow key={rows.map((r) => r.id).join("-")}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(first.created_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {first.company_name || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">
                          {rows.length}{" "}
                          {rows.length === 1 ? "veículo" : "veículos"}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {rows
                            .map((r) => r.plate)
                            .filter(Boolean)
                            .slice(0, 5)
                            .join(", ")}
                          {rows.length > 5 ? "…" : ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {first.performed_by_email || first.performed_by || "—"}
                    </TableCell>
                    <TableCell className="text-sm max-w-md">
                      <span className="line-clamp-3 whitespace-pre-wrap">
                        {first.justification}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
