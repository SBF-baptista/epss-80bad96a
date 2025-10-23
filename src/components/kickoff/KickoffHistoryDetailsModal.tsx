import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { KickoffHistoryRecord } from "@/services/kickoffHistoryService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface KickoffHistoryDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: KickoffHistoryRecord;
}

export const KickoffHistoryDetailsModal = ({
  open,
  onOpenChange,
  record,
}: KickoffHistoryDetailsModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Kickoff - {record.company_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Data de Aprovação</p>
              <p className="font-medium">
                {format(new Date(record.approved_at), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Veículos</p>
              <p className="font-medium">{record.total_vehicles}</p>
            </div>
          </div>

          {/* Vehicles */}
          <div>
            <h3 className="font-semibold mb-3">Veículos</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Módulos Selecionados</TableHead>
                    <TableHead>Bloqueio</TableHead>
                    <TableHead>Sirene</TableHead>
                    <TableHead>Acessórios</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(record.vehicles_data) && record.vehicles_data.map((vehicle: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{vehicle.brand} {vehicle.model}</p>
                          <p className="text-xs text-muted-foreground">
                            Ano: {vehicle.year || 'N/A'} | Qtd: {vehicle.quantity}x
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {vehicle.plate || <span className="text-muted-foreground">Não informada</span>}
                      </TableCell>
                      <TableCell>
                        {Array.isArray(vehicle.selected_modules) && vehicle.selected_modules.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {vehicle.selected_modules.map((module: string, mIdx: number) => (
                              <Badge key={mIdx} variant="secondary" className="text-xs">
                                {module}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Nenhum</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {vehicle.blocking_info?.needsBlocking ? (
                          <div className="space-y-1">
                            <Badge variant="destructive" className="text-xs">Sim</Badge>
                            {vehicle.blocking_info.engineBlocking && (
                              <Badge variant="outline" className="text-xs ml-1">Partida</Badge>
                            )}
                            {vehicle.blocking_info.fuelBlocking && (
                              <Badge variant="outline" className="text-xs ml-1">Combustível</Badge>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {vehicle.has_siren ? (
                          <Badge variant="secondary" className="text-xs">Sim</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {Array.isArray(vehicle.accessories) && vehicle.accessories.length > 0 ? (
                          <div className="flex gap-1 flex-wrap max-w-[200px]">
                            {vehicle.accessories.map((acc: any, aIdx: number) => (
                              <Badge key={aIdx} variant="outline" className="text-xs">
                                {acc.name} ({acc.quantity}x)
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Nenhum</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Contacts */}
          {Array.isArray(record.contacts) && record.contacts.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Contatos</h3>
              <div className="space-y-2">
                {record.contacts.map((contact: any, idx: number) => (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{contact.type}</Badge>
                      <span className="font-medium">{contact.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Função: </span>
                        {contact.role}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email: </span>
                        {contact.email}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Telefone: </span>
                        {contact.phone}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Installation Locations */}
          {Array.isArray(record.installation_locations) && record.installation_locations.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Locais de Instalação</h3>
              <div className="flex gap-2 flex-wrap">
                {record.installation_locations.map((loc: any, idx: number) => (
                  <Badge key={idx} variant="outline">
                    {loc.city}/{loc.state}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Particularity */}
          {record.has_installation_particularity && record.installation_particularity_details && (
            <div>
              <h3 className="font-semibold mb-3">Particularidade de Instalação</h3>
              <p className="text-sm p-3 bg-muted rounded-lg">
                {record.installation_particularity_details}
              </p>
            </div>
          )}

          {/* Notes */}
          {record.kickoff_notes && (
            <div>
              <h3 className="font-semibold mb-3">Observações</h3>
              <p className="text-sm p-3 bg-muted rounded-lg">
                {record.kickoff_notes}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
