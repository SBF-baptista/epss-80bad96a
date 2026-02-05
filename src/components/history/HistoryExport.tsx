import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  FileJson,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AppLog } from "./HistoryTable";

interface HistoryExportProps {
  logs: AppLog[];
  filteredCount: number;
  totalCount: number;
}

const HistoryExport = ({ logs, filteredCount, totalCount }: HistoryExportProps) => {
  const [exporting, setExporting] = useState<string | null>(null);

  const exportToCSV = () => {
    setExporting("csv");
    try {
      const headers = ["ID", "Data/Hora", "Usuário", "Ação", "Módulo", "Detalhes", "IP"];
      const rows = logs.map((log) => [
        log.id,
        format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
        log.user_email || log.user_id || "Sistema",
        log.action,
        log.module,
        log.details?.replace(/"/g, '""') || "",
        log.ip_address || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `historico-sistema-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
      link.click();

      toast.success("Exportação CSV concluída!", {
        description: `${logs.length} registros exportados.`,
      });
    } catch (error) {
      toast.error("Erro ao exportar CSV");
    } finally {
      setExporting(null);
    }
  };

  const exportToJSON = () => {
    setExporting("json");
    try {
      const exportData = logs.map((log) => ({
        id: log.id,
        timestamp: log.created_at,
        user: {
          id: log.user_id,
          email: log.user_email,
        },
        action: log.action,
        module: log.module,
        details: log.details,
        ip_address: log.ip_address,
        metadata: {
          exported_at: new Date().toISOString(),
          total_records: logs.length,
        },
      }));

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `historico-sistema-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
      link.click();

      toast.success("Exportação JSON concluída!", {
        description: `${logs.length} registros exportados.`,
      });
    } catch (error) {
      toast.error("Erro ao exportar JSON");
    } finally {
      setExporting(null);
    }
  };

  const exportToExcel = () => {
    setExporting("excel");
    try {
      // Criar conteúdo HTML para Excel
      const headers = ["ID", "Data/Hora", "Usuário", "Email", "Ação", "Módulo", "Detalhes", "IP"];
      const rows = logs.map((log) => [
        log.id,
        format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
        log.user_id || "Sistema",
        log.user_email || "",
        log.action,
        log.module,
        log.details || "",
        log.ip_address || "",
      ]);

      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="utf-8"></head>
        <body>
          <table border="1">
            <thead>
              <tr>${headers.map((h) => `<th style="background:#f3f4f6;font-weight:bold">${h}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `historico-sistema-${format(new Date(), "yyyy-MM-dd-HHmm")}.xls`;
      link.click();

      toast.success("Exportação Excel concluída!", {
        description: `${logs.length} registros exportados.`,
      });
    } catch (error) {
      toast.error("Erro ao exportar Excel");
    } finally {
      setExporting(null);
    }
  };

  const isExporting = exporting !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isExporting || logs.length === 0}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {filteredCount === totalCount
            ? `Exportar ${totalCount} registros`
            : `Exportar ${filteredCount} de ${totalCount} registros (filtrado)`}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToCSV} disabled={isExporting}>
          <FileText className="h-4 w-4 mr-2" />
          Exportar como CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel} disabled={isExporting}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar como Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON} disabled={isExporting}>
          <FileJson className="h-4 w-4 mr-2" />
          Exportar como JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HistoryExport;
