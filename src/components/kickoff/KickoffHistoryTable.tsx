import { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, Eye, Search, Calendar } from "lucide-react";
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
  const [searchName, setSearchName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Filter and sort history
  const filteredHistory = useMemo(() => {
    let filtered = [...history];

    // Filter by name
    if (searchName.trim()) {
      const searchLower = searchName.toLowerCase();
      filtered = filtered.filter(record => 
        record.company_name.toLowerCase().includes(searchLower)
      );
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(record => 
        new Date(record.approved_at) >= new Date(startDate)
      );
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999); // Include the entire end date
      filtered = filtered.filter(record => 
        new Date(record.approved_at) <= endDateTime
      );
    }

    // Sort by most recent first
    filtered.sort((a, b) => 
      new Date(b.approved_at).getTime() - new Date(a.approved_at).getTime()
    );

    return filtered;
  }, [history, searchName, startDate, endDate]);

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum kickoff aprovado ainda.
      </div>
    );
  }

  // Group history by company name
  const groupedHistory = filteredHistory.reduce((acc, record) => {
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
      <div className="space-y-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search-name" className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4" />
              Buscar por nome
            </Label>
            <Input
              id="search-name"
              placeholder="Digite o nome do cliente..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start-date" className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data inicial
            </Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date" className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data final
            </Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        {(searchName || startDate || endDate) && (
          <div className="text-sm text-muted-foreground">
            Exibindo {Object.keys(groupedHistory).length} cliente(s) encontrado(s)
          </div>
        )}
      </div>

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
