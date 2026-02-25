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
import { User, Mail, Phone, MapPin, FileText, AlertCircle, Camera, Package } from "lucide-react";
import { cleanItemName } from "@/utils/itemNormalization";

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
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
            <div>
              <p className="text-sm text-muted-foreground">Locais de Instalação</p>
              <p className="font-medium">
                {Array.isArray(record.installation_locations) ? record.installation_locations.length : 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contatos</p>
              <p className="font-medium">
                {Array.isArray(record.contacts) ? record.contacts.length : 0}
              </p>
            </div>
          </div>

          {/* Vehicles Table */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Validação da Frota
            </h3>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Veículo</TableHead>
                    <TableHead className="min-w-[100px]">Placa</TableHead>
                    <TableHead className="min-w-[120px]">Produto</TableHead>
                    <TableHead className="min-w-[150px]">Módulos Selecionados</TableHead>
                    <TableHead className="min-w-[120px]">Bloqueio</TableHead>
                    <TableHead className="min-w-[80px]">Sirene</TableHead>
                    <TableHead className="min-w-[150px]">Acessórios</TableHead>
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
                        <Badge variant="secondary" className="text-xs">
                          {vehicle.usage_type ? 
                            vehicle.usage_type
                              .replace(/_/g, ' ')
                              .toLowerCase()
                              .split(' ')
                              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(' ')
                            : 'Não informado'}
                        </Badge>
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
                            <Badge variant="destructive" className="text-xs">
                              Sim ({vehicle.blocking_info.quantity || 1}x)
                            </Badge>
                            <div className="flex flex-wrap gap-1">
                              {vehicle.blocking_info.engineBlocking && (
                                <Badge variant="outline" className="text-xs">Partida</Badge>
                              )}
                              {vehicle.blocking_info.fuelBlocking && (
                                <Badge variant="outline" className="text-xs">Combustível</Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {vehicle.siren_info?.hasSiren ? (
                          <Badge variant="secondary" className="text-xs">
                            Sim ({vehicle.siren_info.quantity || 1}x)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {Array.isArray(vehicle.accessories) && vehicle.accessories.length > 0 ? (
                          <div className="flex gap-1 flex-wrap max-w-[200px]">
                            {vehicle.accessories.map((acc: any, aIdx: number) => (
                              <Badge key={aIdx} variant="outline" className="text-xs">
                                {cleanItemName(acc.name)} ({acc.quantity}x)
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
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Contatos
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {record.contacts.map((contact: any, idx: number) => (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{contact.type}</Badge>
                      <span className="font-medium">{contact.name}</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      {contact.role && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Função:</span>
                          <span>{contact.role}</span>
                        </div>
                      )}
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span>{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Installation Locations */}
          {Array.isArray(record.installation_locations) && record.installation_locations.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Locais de Instalação
              </h3>
              <div className="flex gap-2 flex-wrap">
                {record.installation_locations.map((loc: any, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-sm py-1 px-3">
                    {[loc.cep, loc.state, loc.city, loc.neighborhood, loc.street].filter(Boolean).join(', ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Venda Câmeras Extras */}
          {(record as any).camera_extra_sale && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Venda Câmeras Extras
              </h3>
              <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded-lg text-sm">
                <div>
                  <span className="text-muted-foreground">Quantidade:</span>{" "}
                  <span className="font-medium">{(record as any).camera_extra_sale.quantity}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor unitário:</span>{" "}
                  <span className="font-medium">{Number((record as any).camera_extra_sale.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>{" "}
                  <span className="font-medium">{Number((record as any).camera_extra_sale.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>
            </div>
          )}

          {/* Venda de Acessórios */}
          {Array.isArray((record as any).accessories_sale) && (record as any).accessories_sale.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Venda de Acessórios
              </h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Valor Unitário</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(record as any).accessories_sale.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{Number(item.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                        <TableCell>{Number(item.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Particularity */}
          {record.installation_particularity_details && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Particularidades da Instalação
              </h3>
              <p className="text-sm p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                {record.installation_particularity_details}
              </p>
            </div>
          )}

          {/* Notes */}
          {record.kickoff_notes && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Observações Gerais
              </h3>
              <p className="text-sm p-3 bg-muted rounded-lg whitespace-pre-wrap">
                {record.kickoff_notes}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};