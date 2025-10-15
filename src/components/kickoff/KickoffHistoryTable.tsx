import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { KickoffHistoryRecord } from "@/services/kickoffHistoryService";
import { KickoffHistoryDetailsModal } from "./KickoffHistoryDetailsModal";

interface KickoffHistoryTableProps {
  history: KickoffHistoryRecord[];
}

export const KickoffHistoryTable = ({ history }: KickoffHistoryTableProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRecord, setSelectedRecord] = useState<KickoffHistoryRecord | null>(null);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum kickoff aprovado ainda.
      </div>
    );
  }

  // Group history by company name
  const groupedHistory = history.reduce((acc, record) => {
    const key = record.company_name.trim().toUpperCase();
    if (!acc[key]) {
      acc[key] = {
        company_name: record.company_name,
        records: []
      };
    }
    acc[key].records.push(record);
    return acc;
  }, {} as Record<string, { company_name: string; records: KickoffHistoryRecord[] }>);

  const companies = Object.values(groupedHistory);

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Kickoffs Aprovados</TableHead>
              <TableHead>Total de Veículos</TableHead>
              <TableHead>Último Kickoff</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => {
              const totalVehicles = company.records.reduce((sum, r) => sum + r.total_vehicles, 0);
              const latestRecord = company.records.sort((a, b) => 
                new Date(b.approved_at).getTime() - new Date(a.approved_at).getTime()
              )[0];
              const isExpanded = expandedRows.has(company.company_name);
              
              return (
                <>
                  <TableRow key={company.company_name}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(company.company_name)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">
                      {company.company_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {company.records.length} {company.records.length === 1 ? 'kickoff' : 'kickoffs'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {totalVehicles} veículo(s)
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(latestRecord.approved_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                  </TableRow>
                  {isExpanded && company.records.map((record) => {
                    return (
                      <TableRow key={record.id} className="bg-muted/30">
                        <TableCell></TableCell>
                        <TableCell className="pl-8">
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(record.approved_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {record.total_vehicles} veículo(s)
                          </Badge>
                        </TableCell>
                        <TableCell colSpan={2}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRecord(record)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedRecord && (
        <KickoffHistoryDetailsModal
          open={!!selectedRecord}
          onOpenChange={(open) => !open && setSelectedRecord(null)}
          record={selectedRecord}
        />
      )}
    </>
  );
};
