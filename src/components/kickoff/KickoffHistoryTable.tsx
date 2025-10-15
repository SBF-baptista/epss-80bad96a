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

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Veículos</TableHead>
              <TableHead>Data de Aprovação</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((record) => {
              const isExpanded = expandedRows.has(record.id);
              return (
                <>
                  <TableRow key={record.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(record.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.company_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {record.total_vehicles} veículo(s)
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(record.approved_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRecord(record)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted/50">
                        <div className="p-4 space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">Contatos:</h4>
                            {Array.isArray(record.contacts) && record.contacts.length > 0 ? (
                              <div className="space-y-2">
                                {record.contacts.map((contact: any, idx: number) => (
                                  <div key={idx} className="text-sm">
                                    <Badge variant="secondary" className="mr-2">
                                      {contact.type}
                                    </Badge>
                                    {contact.name} - {contact.role}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Nenhum contato registrado
                              </span>
                            )}
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Locais de Instalação:</h4>
                            {Array.isArray(record.installation_locations) && record.installation_locations.length > 0 ? (
                              <div className="flex gap-2 flex-wrap">
                                {record.installation_locations.map((loc: any, idx: number) => (
                                  <Badge key={idx} variant="outline">
                                    {loc.city}/{loc.state}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Nenhum local registrado
                              </span>
                            )}
                          </div>

                          {record.kickoff_notes && (
                            <div>
                              <h4 className="font-semibold mb-2">Observações:</h4>
                              <p className="text-sm">{record.kickoff_notes}</p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
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
