
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Order } from "@/services/orderService";
import { KitScheduleWithDetails, getSchedulesByCustomer } from "@/services/kitScheduleService";
import { HomologationKit } from "@/types/homologationKit";
import { Calendar, User, MapPin, Eye, EyeOff, Scan, Phone, Mail, FileText, Car, Settings, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cleanItemName, normalizeItemName } from "@/utils/itemNormalization";
import ProductionForm from "./production/ProductionForm";
import ProductionItemsList from "./production/ProductionItemsList";
import { useProductionItems } from "@/hooks/useProductionItems";
import { useProductionScannerModal } from "@/hooks/useProductionScannerModal";
import { ShipmentFormEmbedded } from "./shipment";

interface OrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  schedule?: KitScheduleWithDetails;
  kit?: HomologationKit;
  viewMode?: "scanner" | "details";
  onOpenScanner?: () => void;
}

const OrderModal = ({ order, isOpen, onClose, onUpdate, schedule, kit, viewMode = "scanner", onOpenScanner }: OrderModalProps) => {
  const [allSchedules, setAllSchedules] = useState<KitScheduleWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<{
    name: string;
    schedules: KitScheduleWithDetails[];
  } | null>(null);
  const [contractAccessories, setContractAccessories] = useState<Array<{
    name: string;
    quantity: number;
  }>>([]);
  const [scheduleAccessoriesMap, setScheduleAccessoriesMap] = useState<Record<string, { name: string; quantity: number }[]>>({});
  const [kitNamesMap, setKitNamesMap] = useState<Record<string, string>>({});
  const [showVehiclesSection, setShowVehiclesSection] = useState(false);

  // Production scanner hooks
  const {
    imei,
    productionLineCode,
    scannerActive,
    scannerError,
    setImei,
    setProductionLineCode,
    setScannerActive,
    handleScanResult,
    handleScanError,
    clearForm,
    handleKeyPress: handleScanKeyPress,
    registerForceCleanup,
  } = useProductionScannerModal(order, isOpen);

  const {
    productionItems,
    isLoading: productionLoading,
    isScanning,
    handleScanItem,
    handleStartProduction,
    handleCompleteProduction,
  } = useProductionItems(order, isOpen);

  const onScanItemClick = async () => {
    const success = await handleScanItem(imei, productionLineCode);
    if (success) {
      clearForm();
    }
  };

  const onStartProduction = async () => {
    const success = await handleStartProduction();
    if (success && onUpdate) {
      onUpdate();
    }
  };

  const onCompleteProduction = async () => {
    const success = await handleCompleteProduction();
    if (success && onUpdate) {
      onUpdate();
      onClose();
    }
  };

  const onKeyPress = (e: React.KeyboardEvent) => {
    if (handleScanKeyPress(e) && !isScanning) {
      onScanItemClick();
    }
  };

  useEffect(() => {
    const fetchAllSchedules = async () => {
      if (!schedule || !isOpen) return;
      
      setLoading(true);
      try {
        const schedules = await getSchedulesByCustomer(
          schedule.customer_name,
          schedule.customer_id
        );
        // Filter schedules to only show those with the same status as the clicked schedule
        const filteredSchedules = schedules.filter(s => s.status === schedule.status);
        setAllSchedules(filteredSchedules);
      } catch (error) {
        console.error("Error fetching customer schedules:", error);
        setAllSchedules([schedule]); // Fallback to single schedule
      } finally {
        setLoading(false);
      }
    };

    fetchAllSchedules();
  }, [schedule, isOpen]);

  // Fetch accessories per vehicle (by customer -> incoming_vehicles -> accessories)
  useEffect(() => {
    const fetchAccessoriesPerVehicle = async () => {
      if (!isOpen || !schedule) return;
      try {
        // Get sale_summary_id from customer
        const { data: customer, error: custErr } = await supabase
          .from('customers')
          .select('sale_summary_id')
          .eq('id', schedule.customer_id)
          .maybeSingle();
        if (custErr) throw custErr;
        if (!customer?.sale_summary_id) return;

        // Fetch all incoming vehicles for this sale_summary_id once
        const { data: vehicles, error: vehErr } = await supabase
          .from('incoming_vehicles')
          .select('id, brand, vehicle, received_at')
          .eq('sale_summary_id', customer.sale_summary_id)
          .order('received_at', { ascending: false });
        if (vehErr) throw vehErr;

        const normalize = (s?: string | null) => (s || '').toUpperCase().trim();
        const firstToken = (s?: string | null) => (s || '').split(' ')[0]?.toUpperCase() || '';

        const resultsMap: Record<string, { name: string; quantity: number }[]> = {};

        await Promise.all((allSchedules.length ? allSchedules : [schedule]).map(async (sched) => {
          const matchingVehicleIds = (vehicles || [])
            .filter(v => (
              normalize(v.brand) === normalize(sched.vehicle_brand)
            ) && (
              normalize(v.vehicle) === normalize(sched.vehicle_model) ||
              normalize(v.vehicle).includes(firstToken(sched.vehicle_model)) ||
              normalize(sched.vehicle_model).includes(firstToken(v.vehicle))
            ))
            .slice(0, 5) // limit for performance
            .map(v => v.id);

          if (matchingVehicleIds.length === 0) {
            resultsMap[sched.id] = [];
            return;
          }

          const { data: acc, error: accErr } = await supabase
            .from('accessories')
            .select('name, quantity, vehicle_id, categories')
            .in('vehicle_id', matchingVehicleIds as string[]);
          if (accErr) throw accErr;

          // Filter out modules - only include real accessories
          const normalizeCategory = (cat?: string | null) => 
            (cat || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

          const realAccessories = (acc || []).filter(a => 
            normalizeCategory(a.categories) !== 'modulos'
          );

          resultsMap[sched.id] = realAccessories.map(a => ({ name: a.name, quantity: a.quantity }));
        }));

        setScheduleAccessoriesMap(resultsMap);
      } catch (error) {
        console.error('Error fetching vehicle accessories:', error);
      }
    };

    fetchAccessoriesPerVehicle();
  }, [isOpen, schedule, allSchedules]);

  // Fetch kit names from selected_kit_ids
  useEffect(() => {
    const fetchKitNames = async () => {
      if (!isOpen || allSchedules.length === 0) return;
      
      try {
        const allKitIds = new Set<string>();
        allSchedules.forEach((sched: any) => {
          if (sched.selected_kit_ids && Array.isArray(sched.selected_kit_ids)) {
            sched.selected_kit_ids.forEach((kitId: string) => allKitIds.add(kitId));
          }
        });

        if (allKitIds.size === 0) return;

        const { data: kits, error } = await supabase
          .from('homologation_kits')
          .select('id, name')
          .in('id', Array.from(allKitIds));
        
        if (error) throw error;

        const namesMap: Record<string, string> = {};
        (kits || []).forEach((kit) => {
          if (kit.id) namesMap[kit.id] = kit.name;
        });
        
        setKitNamesMap(namesMap);
      } catch (error) {
        console.error('Error fetching kit names:', error);
      }
    };

    fetchKitNames();
  }, [isOpen, allSchedules]);

  if (!order) return null;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "novos":
        return "Pedidos";
      case "producao":
        return "Em Produção";
      case "aguardando":
        return "Aguardando Envio";
      case "enviado":
        return "Enviado";
      case "standby":
        return "Em Stand-by";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "novos":
        return "bg-blue-100 text-blue-800";
      case "producao":
        return "bg-yellow-100 text-yellow-800";
      case "aguardando":
        return "bg-orange-100 text-orange-800";
      case "enviado":
        return "bg-green-100 text-green-800";
      case "standby":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div>
            <DialogTitle className="text-xl">
              Pedido de Instalação - {order.company_name}
            </DialogTitle>
            <DialogDescription>
              Detalhes completos do pedido
            </DialogDescription>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center space-x-3">
              <Badge className={getStatusColor(order.status)}>
                {getStatusLabel(order.status)}
              </Badge>
            </div>

            <Separator />

            {/* Customer Info - Always show */}
            <div className="bg-muted/30 p-4 rounded-lg border">
              <h3 className="font-semibold text-base mb-3 text-primary">Cliente</h3>
              <div className="space-y-2">
                <p className="font-medium text-foreground">{order.company_name}</p>
                
                {schedule?.customer_document_number && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span>{schedule.customer_document_number}</span>
                  </div>
                )}
                
                {schedule?.customer_phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{schedule.customer_phone}</span>
                  </div>
                )}
                
                {schedule?.customer_email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span>{schedule.customer_email}</span>
                  </div>
                )}
                
                {/* Installation Address */}
                {(schedule?.installation_address_street || schedule?.installation_address_city) && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2 pt-2 border-t border-border/50">
                    <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      {schedule?.installation_address_street && (
                        <p>
                          {schedule.installation_address_street}
                          {schedule.installation_address_number && `, ${schedule.installation_address_number}`}
                          {schedule.installation_address_complement && ` - ${schedule.installation_address_complement}`}
                        </p>
                      )}
                      {schedule?.installation_address_neighborhood && (
                        <p>{schedule.installation_address_neighborhood}</p>
                      )}
                      {(schedule?.installation_address_city || schedule?.installation_address_state) && (
                        <p>
                          {schedule.installation_address_city}
                          {schedule.installation_address_state && ` - ${schedule.installation_address_state}`}
                        </p>
                      )}
                      {schedule?.installation_address_postal_code && (
                        <p>CEP: {schedule.installation_address_postal_code}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Scheduling Info Section - Always show */}
            <div className="bg-muted/30 p-4 rounded-lg border">
              <h3 className="font-semibold text-base mb-3 text-primary">Informações do Agendamento</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Vehicle info */}
                {(schedule?.vehicle_brand || schedule?.vehicle_model) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Car className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>
                      {schedule.vehicle_brand} {schedule.vehicle_model}
                      {schedule.vehicle_year && ` (${schedule.vehicle_year})`}
                    </span>
                  </div>
                )}
                
                {/* Plate */}
                {schedule?.vehicle_plate && schedule.vehicle_plate !== 'Placa pendente' && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>Placa: <strong>{schedule.vehicle_plate}</strong></span>
                  </div>
                )}
                
                {/* Technician */}
                {schedule?.technician?.name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>Técnico: {schedule.technician.name}</span>
                  </div>
                )}
                
                {/* Scheduled Date/Time */}
                {schedule?.scheduled_date && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground font-medium">Data prevista de instalação</span>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>
                        {formatDate(schedule.scheduled_date)}
                        {schedule.installation_time && (
                          <span className="ml-1 text-muted-foreground">
                            às {schedule.installation_time.slice(0, 5)}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Configuration */}
                {(schedule as any)?.configuration && (
                  <div className="flex items-center gap-2 text-sm">
                    <Settings className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>Configuração: {(schedule as any).configuration}</span>
                  </div>
                )}
              </div>
            </div>

            {/* "Em produção" (scanner mode): Show Scanner + Processed Items */}
            {order.status === "producao" && viewMode === "scanner" && (
              <>
                <Separator />
                <ProductionForm
                  order={order}
                  productionItems={productionItems}
                  isScanning={isScanning}
                  imei={imei}
                  productionLineCode={productionLineCode}
                  scannerActive={scannerActive}
                  scannerError={scannerError}
                  onImeiChange={setImei}
                  onProductionLineCodeChange={setProductionLineCode}
                  onScannerToggle={() => setScannerActive(!scannerActive)}
                  onScanResult={handleScanResult}
                  onScanError={handleScanError}
                  onScanItem={onScanItemClick}
                  onKeyPress={onKeyPress}
                  onStartProduction={onStartProduction}
                  onCompleteProduction={onCompleteProduction}
                  onRegisterForceCleanup={registerForceCleanup}
                />
                <Separator />
                <ProductionItemsList
                  productionItems={productionItems}
                  totalTrackers={order.trackers.reduce((sum, tracker) => sum + tracker.quantity, 0)}
                  isLoading={productionLoading}
                />
              </>
            )}

            {/* "Aguardando envio" (scanner mode): Show Shipment Form embedded */}
            {order.status === "aguardando" && viewMode === "scanner" && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-primary">Preparar Envio</h3>
                  <ShipmentFormEmbedded order={order} onUpdate={onUpdate} />
                </div>
              </>
            )}

            {/* "Enviado" (scanner mode): Show Shipment Info as form */}
            {order.status === "enviado" && viewMode === "scanner" && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-primary">Informações de Envio</h3>
                  <div className="space-y-4">
                    {/* Row: Rua, Número */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm text-muted-foreground">Rua/Logradouro</Label>
                        <Input 
                          value={schedule?.installation_address_street || 'N/A'} 
                          disabled 
                          className="bg-muted/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Número</Label>
                        <Input 
                          value={schedule?.installation_address_number || 'N/A'} 
                          disabled 
                          className="bg-muted/50"
                        />
                      </div>
                    </div>
                    {/* Row: Bairro, Complemento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Bairro</Label>
                        <Input 
                          value={schedule?.installation_address_neighborhood || 'N/A'} 
                          disabled 
                          className="bg-muted/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Complemento</Label>
                        <Input 
                          value={schedule?.installation_address_complement || '-'} 
                          disabled 
                          className="bg-muted/50"
                        />
                      </div>
                    </div>
                    {/* Row: Cidade, UF, CEP */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Cidade</Label>
                        <Input 
                          value={schedule?.installation_address_city || 'N/A'} 
                          disabled 
                          className="bg-muted/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">UF</Label>
                        <Input 
                          value={schedule?.installation_address_state || 'N/A'} 
                          disabled 
                          className="bg-muted/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">CEP</Label>
                        <Input 
                          value={schedule?.installation_address_postal_code || 'N/A'} 
                          disabled 
                          className="bg-muted/50"
                        />
                      </div>
                    </div>
                    {/* Row: Código de Rastreio */}
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Código de Rastreio</Label>
                      <Input 
                        value={schedule?.tracking_code || 'N/A'} 
                        disabled 
                        className="bg-muted/50"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* For non-scanner modes or other statuses: show full detail sections */}
            {!(order.status === "producao" && viewMode === "scanner") && 
             !(order.status === "aguardando" && viewMode === "scanner") &&
             !(order.status === "enviado" && viewMode === "scanner") && (
              <>
                {/* Show scanned IMEIs in details view */}
                {productionItems.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg text-primary">
                        IMEIs Escaneados ({productionItems.length})
                      </h3>
                      <div className="bg-muted/30 rounded-lg border p-4">
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {productionItems.map((item) => (
                            <div key={item.id} className="flex justify-between items-center text-sm bg-background p-2 rounded">
                              <span className="font-mono">{item.imei}</span>
                              <span className="text-muted-foreground text-xs">
                                Linha: {item.production_line_code}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* 1. Consolidated Totals Section */}
                {allSchedules.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg text-primary">
                        Totais Consolidados
                      </h3>
                      <div className="bg-muted/30 p-4 rounded-lg border">
                        {(() => {
                          const totals: Record<string, number> = {};

                          allSchedules.forEach((sched) => {
                            // Equipment/Trackers
                            (sched.kit?.equipment || []).forEach((item: any) => {
                              const key = cleanItemName(item.item_name);
                              totals[key] = (totals[key] || 0) + item.quantity;
                            });

                            // Accessories - Parse "NAME (qty: X)" format
                            if (Array.isArray(sched.accessories)) {
                              sched.accessories.forEach((accessoryStr: string) => {
                                const match = accessoryStr.match(/^(.+?)\s*\(qty:\s*(\d+)\)$/i);
                                const rawName = match ? match[1].trim() : accessoryStr.trim();
                                const quantity = match ? parseInt(match[2], 10) : 1;
                                const key = cleanItemName(rawName);
                                totals[key] = (totals[key] || 0) + quantity;
                              });
                            }

                            // Supplies - Parse "NAME (qty: X)" format
                            if (Array.isArray(sched.supplies)) {
                              sched.supplies.forEach((supplyStr: string) => {
                                const match = supplyStr.match(/^(.+?)\s*\(qty:\s*(\d+)\)$/i);
                                const rawName = match ? match[1].trim() : supplyStr.trim();
                                const quantity = match ? parseInt(match[2], 10) : 1;
                                const key = cleanItemName(rawName);
                                totals[key] = (totals[key] || 0) + quantity;
                              });
                            }
                          });

                          const sortedItems = Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));

                          return sortedItems.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {sortedItems.map(([itemName, quantity]) => (
                                <div key={itemName} className="flex items-center justify-between p-3 bg-card border rounded-lg">
                                  <span className="font-medium text-sm text-foreground">{itemName}</span>
                                  <Badge variant="secondary" className="ml-2">{quantity}</Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
                          );
                        })()}
                      </div>
                    </div>
                  </>
                )}

                {/* 2. By Technician Section with Consolidated Items */}
                {allSchedules.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg text-primary">
                        Detalhamento por Técnico
                      </h3>
                      {(() => {
                        // Group schedules by technician
                        const byTechnician: Record<string, typeof allSchedules> = {};
                        
                        allSchedules.forEach((sched) => {
                          const techName = sched.technician?.name || 'Sem técnico atribuído';
                          if (!byTechnician[techName]) {
                            byTechnician[techName] = [];
                          }
                          byTechnician[techName].push(sched);
                        });

                        return Object.entries(byTechnician).map(([techName, schedules]) => {
                          // Calculate consolidated items for this technician
                          const techTotals: Record<string, number> = {};
                          
                          schedules.forEach((sched) => {
                            // Equipment/Trackers - Exclude FMC 150
                            (sched.kit?.equipment || []).forEach((item: any) => {
                              const normalizedName = normalizeItemName(item.item_name);
                              // Skip FMC 150 equipment
                              if (normalizedName === 'fmc150' || normalizedName === 'fmc 150') {
                                return;
                              }
                              const key = cleanItemName(item.item_name);
                              techTotals[key] = (techTotals[key] || 0) + item.quantity;
                            });

                            // Accessories - Parse "NAME (qty: X)" format
                            if (Array.isArray(sched.accessories)) {
                              sched.accessories.forEach((accessoryStr: string) => {
                                const match = accessoryStr.match(/^(.+?)\s*\(qty:\s*(\d+)\)$/i);
                                const rawName = match ? match[1].trim() : accessoryStr.trim();
                                const quantity = match ? parseInt(match[2], 10) : 1;
                                const key = cleanItemName(rawName);
                                techTotals[key] = (techTotals[key] || 0) + quantity;
                              });
                            }

                            // Supplies - Parse "NAME (qty: X)" format
                            if (Array.isArray(sched.supplies)) {
                              sched.supplies.forEach((supplyStr: string) => {
                                const match = supplyStr.match(/^(.+?)\s*\(qty:\s*(\d+)\)$/i);
                                const rawName = match ? match[1].trim() : supplyStr.trim();
                                const quantity = match ? parseInt(match[2], 10) : 1;
                                const key = cleanItemName(rawName);
                                techTotals[key] = (techTotals[key] || 0) + quantity;
                              });
                            }
                          });

                          const sortedTechItems = Object.entries(techTotals).sort(([a], [b]) => a.localeCompare(b));

                          return (
                            <div key={techName} className="bg-muted/30 p-4 rounded-lg border space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <User className="h-5 w-5 text-primary" />
                                  <h4 className="font-semibold text-base text-foreground">
                                    {techName}
                                  </h4>
                                  <Badge variant="outline">
                                    {schedules.length} {schedules.length === 1 ? 'placa' : 'placas'}
                                  </Badge>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedTechnician({ name: techName, schedules })}
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  Exibir detalhes
                                </Button>
                              </div>
                              
                              {/* Consolidated items list for this technician */}
                              {sortedTechItems.length > 0 && (
                                <div className="pl-7 space-y-1">
                                  {sortedTechItems.map(([itemName, quantity]) => (
                                    <div key={itemName} className="flex items-center gap-2 text-sm">
                                      <span className="text-muted-foreground">•</span>
                                      <span className="text-foreground">{cleanItemName(itemName)}</span>
                                      <Badge variant="secondary" className="text-xs">{quantity}x</Badge>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </>
                )}

                {/* 3. All Vehicles/Plates Section */}
                {allSchedules.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg text-primary">
                        Veículos ({allSchedules.length} {allSchedules.length === 1 ? 'placa' : 'placas'})
                      </h3>
                      {loading ? (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">Carregando placas...</p>
                        </div>
                      ) : (
                        allSchedules.map((sched, idx) => {
                          // Get equipment from kit
                          const equipment = sched.kit?.equipment || [];
                          
                          // Use ONLY ONE source for accessories to prevent duplication
                          let accessoriesItems: Array<{ id: string; item_name: string; quantity: number }> = [];
                          
                          // Priority 1: DB accessories (real data from database)
                          const dbAccessories = scheduleAccessoriesMap[sched.id] || [];
                          if (dbAccessories.length > 0) {
                            accessoriesItems = dbAccessories.map((acc, i) => ({
                              id: `${sched.id}-acc-${i}`,
                              item_name: cleanItemName(acc.name),
                              quantity: acc.quantity
                            }));
                          }
                          // Priority 2: Schedule accessories (only if no DB data)
                          else if (Array.isArray(sched.accessories) && sched.accessories.length > 0) {
                            // Create a map to aggregate quantities
                            const accessoryMap: Record<string, number> = {};

                            sched.accessories.forEach((accessoryStr: string) => {
                              const match = accessoryStr.match(/^(.+?)\s*\(qty:\s*(\d+)\)$/i);
                              const rawName = match ? match[1].trim() : accessoryStr.trim();
                              const quantity = match ? parseInt(match[2], 10) : 1;
                              const key = cleanItemName(rawName);

                              accessoryMap[key] = (accessoryMap[key] || 0) + quantity;
                            });

                            accessoriesItems = Object.entries(accessoryMap).map(([name, quantity], i) => ({
                              id: `${sched.id}-acc-${i}`,
                              item_name: name,
                              quantity
                            }));
                          }

                          const suppliesItems = Array.isArray(sched.supplies) && sched.supplies.length > 0
                            ? sched.supplies.map((name: string, i: number) => ({
                                id: `${sched.id}-sup-${i}`,
                                item_name: cleanItemName(name),
                                quantity: 1
                              }))
                            : [];
                          
                          const getStatusBadge = (status: string) => {
                            switch (status) {
                              case 'completed':
                                return <Badge className="bg-green-500 text-white">✓ Pronto</Badge>;
                              case 'in_progress':
                              case 'scheduled':
                                return <Badge variant="secondary">Agendado</Badge>;
                              case 'cancelled':
                                return <Badge variant="destructive">Cancelado</Badge>;
                              default:
                                return <Badge variant="outline">{status}</Badge>;
                            }
                          };
                          
                          return (
                            <div key={sched.id || idx} className="p-4 bg-card border-2 border-primary/20 rounded-lg space-y-4">
                              {/* Vehicle Header */}
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {sched.vehicle_plate && (
                                      <Badge variant="outline" className="text-base font-bold px-3 py-1">
                                        {sched.vehicle_plate}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Installation Details */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-primary" />
                                  <span className="text-muted-foreground">Data:</span>
                                  <span className="font-medium">{formatDate(sched.scheduled_date)}</span>
                                </div>
                                {sched.technician && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <User className="h-4 w-4 text-primary" />
                                    <span className="text-muted-foreground">Técnico:</span>
                                    <span className="font-medium">{sched.technician.name}</span>
                                  </div>
                                )}
                                {sched.installation_address_city && (
                                  <div className="flex items-center gap-2 text-sm md:col-span-2">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    <span className="text-muted-foreground">Local:</span>
                                    <span className="font-medium">
                                      {sched.installation_address_city}, {sched.installation_address_state}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Configuration Block */}
                              {sched.configuration && (
                                <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
                                  <p className="text-sm font-medium text-primary">
                                    📋 Configuração: {sched.configuration}
                                  </p>
                                </div>
                              )}

                              {/* Modules Section - from kickoff accessories with category "Módulos" */}
                              {(() => {
                                // Get modules from schedule accessories
                                const moduleAccessories = Array.isArray(sched.accessories) 
                                  ? sched.accessories.filter((acc: string) => {
                                      // Check if any contract accessory with category "Módulos" matches
                                      const accName = acc.replace(/\s*\(qty:\s*\d+\)$/i, '').trim().toLowerCase();
                                      return contractAccessories.some(ca => 
                                        ca.name.toLowerCase().includes('gestão') || 
                                        ca.name.toLowerCase().includes('telemetria') ||
                                        ca.name.toLowerCase().includes('módulo') ||
                                        ca.name.toLowerCase().includes('modulo')
                                      ) || accName.includes('gestão') || 
                                         accName.includes('telemetria') ||
                                         accName.includes('módulo') ||
                                         accName.includes('modulo');
                                    })
                                  : [];
                                
                                if (moduleAccessories.length === 0) return null;
                                
                                return (
                                  <div className="mb-3">
                                    <h4 className="font-semibold text-sm mb-2 text-primary">
                                      Módulos
                                    </h4>
                                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-md space-y-1">
                                      {moduleAccessories.map((mod: string, modIdx: number) => {
                                        const match = mod.match(/^(.+?)\s*\(qty:\s*(\d+)\)$/i);
                                        const name = match ? match[1].trim() : mod.trim();
                                        return (
                                          <div key={modIdx} className="text-sm text-purple-900 font-medium">
                                            • {cleanItemName(name)}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}

                              <Separator />

                              {/* Kits Section - Show selected kits */}
                              {(() => {
                                const scheduleWithKits = sched as any;
                                const hasSelectedKits = scheduleWithKits.selected_kit_ids && 
                                                       Array.isArray(scheduleWithKits.selected_kit_ids) && 
                                                       scheduleWithKits.selected_kit_ids.length > 0;
                                
                                if (!hasSelectedKits && !sched.kit?.name) return null;
                                
                                return (
                                  <div>
                                    <h4 className="font-semibold text-sm mb-2 text-primary">
                                      Kits
                                    </h4>
                                    <div className="space-y-2">
                                      {/* Selected kits from selected_kit_ids */}
                                      {hasSelectedKits && (
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md space-y-1">
                                          {scheduleWithKits.selected_kit_ids.map((kitId: string, kitIdx: number) => (
                                            <div key={kitIdx} className="text-sm text-blue-900 font-medium">
                                              • {kitNamesMap[kitId] || `Kit ${kitId}`}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {/* Legacy single kit (if exists and no selected_kit_ids) */}
                                      {!hasSelectedKits && sched.kit?.name && (
                                        <div className="p-2 bg-muted/30 rounded border text-sm">
                                          <p className="font-medium text-foreground">{sched.kit.name}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Equipment/Trackers */}
                              {equipment.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-sm mb-2 text-primary">
                                    Rastreadores ({equipment.reduce((sum, eq) => sum + eq.quantity, 0)} unidades)
                                  </h4>
                                  <div className="space-y-2">
                                    {equipment.map((item, index) => (
                                      <div key={index} className="p-2 bg-muted/30 rounded border text-sm">
                                        <div className="flex justify-between items-center">
                                          <div>
                                            <p className="font-medium text-foreground">{cleanItemName(item.item_name)}</p>
                                            {item.description && (
                                              <p className="text-xs text-muted-foreground">{item.description}</p>
                                            )}
                                          </div>
                                          <Badge variant="secondary" className="text-xs">
                                            {item.quantity}x
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}


                              {/* Supplies */}
                              {suppliesItems.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-sm mb-2 text-primary">
                                    Insumos ({suppliesItems.reduce((sum, s) => sum + (s.quantity || 0), 0)} unidades)
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {suppliesItems.map((item, index) => (
                                      <div key={item.id || index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 text-secondary-foreground rounded-md text-sm border border-secondary/20">
                                        <span className="font-medium">✓ {cleanItemName(item.item_name)}</span>
                                        {item.quantity > 1 && (
                                          <Badge variant="secondary" className="text-xs h-5">{item.quantity}x</Badge>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Technician Details Dialog */}
      <AlertDialog open={!!selectedTechnician} onOpenChange={() => setSelectedTechnician(null)}>
        <AlertDialogContent className="max-w-3xl max-h-[80vh]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <User className="h-6 w-6 text-primary" />
              {selectedTechnician?.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Veículos atribuídos a este técnico
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Vehicles List */}
              <div>
                <h4 className="font-semibold text-sm text-primary mb-3">
                  Veículos ({selectedTechnician?.schedules.length || 0})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedTechnician?.schedules.map((sched, idx) => (
                    <div key={sched.id || idx} className="p-3 bg-muted/30 rounded-lg border">
                      {sched.vehicle_plate && (
                        <Badge variant="outline" className="font-bold mb-1">
                          {sched.vehicle_plate}
                        </Badge>
                      )}
                      <p className="text-sm font-medium text-foreground">
                        {sched.vehicle_brand} {sched.vehicle_model}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </ScrollArea>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setSelectedTechnician(null)}>
              Fechar
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default OrderModal;
