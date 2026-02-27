
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
import { Calendar, User, MapPin, Eye, EyeOff, Scan, Phone, Mail, FileText, Car, Settings, Clock, Package, CheckCircle, Camera, Copy, Wrench, ClipboardList, Truck, Hash, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cleanItemName, normalizeItemName } from "@/utils/itemNormalization";
import ProductionForm from "./production/ProductionForm";
import ProductionStatus from "./production/ProductionStatus";
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
  const [cameraExtras, setCameraExtras] = useState<Array<{ vehicleName: string; quantity: number; locations: string }>>([]);
  const [kickoffSalesData, setKickoffSalesData] = useState<{
    cameraExtraSale: { quantity: number; unitPrice: number; total: number } | null;
    accessoriesSale: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  }>({ cameraExtraSale: null, accessoriesSale: [] });

  // Production scanner hooks
  const {
    imei,
    serialNumber,
    productionLineCode,
    scannerActive,
    scannerError,
    setImei,
    setSerialNumber,
    setProductionLineCode,
    setScannerActive,
    handleScanResult,
    handleScanError,
    clearForm,
    handleKeyPress: handleScanKeyPress,
    registerForceCleanup,
  } = useProductionScannerModal(order, isOpen);

  const handleStatusChange = () => {
    onUpdate?.();
    onClose();
  };

  const {
    productionItems,
    isLoading: productionLoading,
    isScanning,
    handleScanItem,
    handleStartProduction,
    handleCompleteProduction,
  } = useProductionItems(order, isOpen, undefined, handleStatusChange, order?.company_name);

  const onScanItemClick = async () => {
    const success = await handleScanItem(imei, productionLineCode, serialNumber);
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

  // Helper: find the correct sale_summary_id with fallback strategy
  const findKickoffData = async (): Promise<{ saleSummaryId: number | null; kickoff: any | null }> => {
    if (!schedule?.customer_id) return { saleSummaryId: null, kickoff: null };

    // Attempt 1: customer's sale_summary_id
    const { data: customer } = await supabase
      .from('customers')
      .select('sale_summary_id')
      .eq('id', schedule.customer_id)
      .maybeSingle();

    if (customer?.sale_summary_id) {
      const { data: kickoff } = await supabase
        .from('kickoff_history')
        .select('camera_extra_sale, accessories_sale, sale_summary_id')
        .eq('sale_summary_id', customer.sale_summary_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (kickoff) return { saleSummaryId: customer.sale_summary_id, kickoff };
    }

    // Attempt 2: find sale_summary_id from incoming_vehicles matching the vehicle
    if (schedule.vehicle_brand && schedule.vehicle_model) {
      const firstToken = (schedule.vehicle_model || '').split(' ')[0]?.toUpperCase() || '';
      const { data: vehicle } = await supabase
        .from('incoming_vehicles')
        .select('sale_summary_id')
        .eq('brand', schedule.vehicle_brand)
        .ilike('vehicle', `%${firstToken}%`)
        .not('sale_summary_id', 'is', null)
        .order('received_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (vehicle?.sale_summary_id) {
        const { data: kickoff } = await supabase
          .from('kickoff_history')
          .select('camera_extra_sale, accessories_sale, sale_summary_id')
          .eq('sale_summary_id', vehicle.sale_summary_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (kickoff) return { saleSummaryId: vehicle.sale_summary_id, kickoff };
      }
    }

    // Attempt 3: search by company_name
    if (order?.company_name || schedule.customer_name) {
      const companyName = order?.company_name || schedule.customer_name;
      const { data: kickoff } = await supabase
        .from('kickoff_history')
        .select('camera_extra_sale, accessories_sale, sale_summary_id')
        .ilike('company_name', `%${companyName}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (kickoff) return { saleSummaryId: kickoff.sale_summary_id, kickoff };
    }

    return { saleSummaryId: null, kickoff: null };
  };

  // Fetch camera extras + kickoff sales data with fallback
  useEffect(() => {
    const fetchKickoffRelatedData = async () => {
      if (!isOpen || !schedule) return;
      try {
        const { saleSummaryId, kickoff } = await findKickoffData();

        // Fetch camera extras using resolved saleSummaryId
        if (saleSummaryId) {
          const { data: vehicles } = await supabase
            .from('incoming_vehicles')
            .select('brand, vehicle, camera_extra_quantity, camera_extra_locations')
            .eq('sale_summary_id', saleSummaryId)
            .not('camera_extra_quantity', 'is', null);

          if (vehicles && vehicles.length > 0) {
            setCameraExtras(vehicles
              .filter(v => v.camera_extra_quantity && v.camera_extra_quantity > 0)
              .map(v => ({
                vehicleName: `${v.brand} ${v.vehicle}`,
                quantity: v.camera_extra_quantity!,
                locations: v.camera_extra_locations || 'Não especificado',
              }))
            );
          } else {
            setCameraExtras([]);
          }
        } else {
          setCameraExtras([]);
        }

        // Process kickoff sales data
        if (kickoff) {
          const camSale = kickoff.camera_extra_sale as any;
          const accSale = kickoff.accessories_sale as any;
          setKickoffSalesData({
            cameraExtraSale: camSale && camSale.quantity ? {
              quantity: Number(camSale.quantity) || 0,
              unitPrice: Number(camSale.unitPrice) || 0,
              total: Number(camSale.total) || 0,
            } : null,
            accessoriesSale: Array.isArray(accSale) ? accSale.map((a: any) => ({
              description: a.description || '',
              quantity: Number(a.quantity) || 0,
              unitPrice: Number(a.unitPrice) || 0,
              total: Number(a.total) || 0,
            })) : [],
          });
        } else {
          setKickoffSalesData({ cameraExtraSale: null, accessoriesSale: [] });
        }
      } catch (error) {
        console.error('Error fetching kickoff related data:', error);
      }
    };

    fetchKickoffRelatedData();
  }, [isOpen, schedule]);

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

  const copyAddress = (sched: KitScheduleWithDetails) => {
    const parts = [
      sched.installation_address_street,
      sched.installation_address_number && `nº ${sched.installation_address_number}`,
      sched.installation_address_complement,
      sched.installation_address_neighborhood,
      sched.installation_address_city,
      sched.installation_address_state,
      sched.installation_address_postal_code && `CEP: ${sched.installation_address_postal_code}`,
    ].filter(Boolean);
    navigator.clipboard.writeText(parts.join(', '));
    toast.success('Endereço copiado!');
  };

  const SectionHeader = ({ icon: Icon, title, badge }: { icon: any; title: string; badge?: React.ReactNode }) => (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h3 className="font-semibold text-sm tracking-tight text-foreground">{title}</h3>
      {badge}
    </div>
  );

  const InfoField = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
    <div className="space-y-1">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <p className={`text-sm font-medium text-foreground ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] p-0 gap-0 overflow-hidden">
        {/* ── Fixed Header ── */}
        <div className="px-6 pt-5 pb-4 border-b bg-card">
          <DialogHeader className="space-y-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <DialogTitle className="text-lg font-bold tracking-tight">
                    Pedido de Instalação
                  </DialogTitle>
                  <Badge className={`${getStatusColor(order.status)} text-xs font-semibold px-2.5 py-0.5`}>
                    {getStatusLabel(order.status)}
                  </Badge>
                </div>
                <DialogDescription className="mt-1.5 flex items-center gap-4 flex-wrap text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {order.company_name}
                  </span>
                  {schedule?.technician?.name && (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      {schedule.technician.name}
                    </span>
                  )}
                  {order.number && (
                    <span className="flex items-center gap-1.5 text-muted-foreground font-mono text-xs">
                      <Hash className="h-3.5 w-3.5" />
                      {order.number}
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* ── Scrollable Body ── */}
        <ScrollArea className="flex-1 max-h-[calc(92vh-90px)]">
          <div className="px-6 py-5 space-y-5">

            {/* ═══════════════════════════════════════════ */}
            {/* Customer Info + Scheduling - details/novos  */}
            {/* ═══════════════════════════════════════════ */}
            {(viewMode === "details" || order.status === "novos") && (
              <>
                {/* ── Two-column: Cliente + Agendamento ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Client Card */}
                  <div className="bg-muted/20 p-4 rounded-xl border space-y-3">
                    <SectionHeader icon={Building2} title="Dados do Cliente" />
                    <div className="space-y-2.5">
                      <p className="font-semibold text-foreground">{order.company_name}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        {schedule?.customer_document_number && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{schedule.customer_document_number}</span>
                          </div>
                        )}
                        {schedule?.customer_phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{schedule.customer_phone}</span>
                          </div>
                        )}
                      </div>
                      {schedule?.customer_email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{schedule.customer_email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scheduling Card */}
                  <div className="bg-muted/20 p-4 rounded-xl border space-y-3">
                    <SectionHeader icon={Calendar} title="Agendamento" />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {schedule?.scheduled_date && (
                        <InfoField
                          label="Data Prevista"
                          value={`${formatDate(schedule.scheduled_date)}${schedule.installation_time ? ` às ${schedule.installation_time.slice(0, 5)}` : ''}`}
                        />
                      )}
                      {schedule?.technician?.name && (
                        <InfoField label="Técnico" value={schedule.technician.name} />
                      )}
                      {(schedule?.vehicle_brand || schedule?.vehicle_model) && (
                        <InfoField
                          label="Veículo"
                          value={`${schedule.vehicle_brand || ''} ${schedule.vehicle_model || ''}${schedule.vehicle_year ? ` (${schedule.vehicle_year})` : ''}`}
                        />
                      )}
                      {schedule?.vehicle_plate && schedule.vehicle_plate !== 'Placa pendente' && (
                        <InfoField label="Placa" value={schedule.vehicle_plate} mono />
                      )}
                      {(schedule as any)?.configuration && (
                        <div className="col-span-2">
                          <InfoField label="Configuração" value={(schedule as any).configuration} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Installation Address ── */}
                {schedule && (schedule.installation_address_street || schedule.installation_address_city) && (
                  <div className="bg-muted/20 p-4 rounded-xl border space-y-3">
                    <div className="flex items-center justify-between">
                      <SectionHeader icon={MapPin} title="Endereço de Instalação" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                        onClick={() => copyAddress(schedule)}
                      >
                        <Copy className="h-3 w-3" />
                        Copiar
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
                      <div className="col-span-2">
                        <InfoField label="Logradouro" value={schedule.installation_address_street || ''} />
                      </div>
                      <InfoField label="Número" value={schedule.installation_address_number || ''} />
                      <InfoField label="Complemento" value={schedule.installation_address_complement || ''} />
                      <InfoField label="Bairro" value={schedule.installation_address_neighborhood || ''} />
                      <InfoField label="Cidade" value={schedule.installation_address_city || ''} />
                      <InfoField label="UF" value={schedule.installation_address_state || ''} />
                      <InfoField label="CEP" value={schedule.installation_address_postal_code || ''} />
                    </div>
                    {/* Address completeness check */}
                    {(!schedule.installation_address_street || !schedule.installation_address_city || !schedule.installation_address_state) && (
                      <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-800">
                        <span>⚠</span>
                        <span>Endereço incompleto — verifique os campos obrigatórios</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Câmeras Extras (technical) ── */}
                {cameraExtras.length > 0 && (
                  <div className="bg-muted/20 p-4 rounded-xl border space-y-3">
                    <SectionHeader icon={Camera} title="Câmeras Extras" />
                    <p className="text-xs text-muted-foreground -mt-1">Quantidade e localização das câmeras extras por veículo.</p>
                    <div className="space-y-2">
                      {cameraExtras.map((cam, idx) => (
                        <div key={idx} className="bg-card border rounded-lg p-3">
                          <p className="font-medium text-sm text-foreground mb-2">{cam.vehicleName}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <InfoField label="Quantidade" value={String(cam.quantity)} />
                            <InfoField label="Localização" value={cam.locations} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Two-column: Venda Câmeras Extras + Venda Acessórios ── */}
                {(kickoffSalesData.cameraExtraSale || kickoffSalesData.accessoriesSale.length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Venda Câmeras Extras */}
                    {kickoffSalesData.cameraExtraSale && (
                      <div className="bg-muted/20 p-4 rounded-xl border space-y-3">
                        <SectionHeader icon={Camera} title="Venda Câmeras Extras" />
                        <InfoField label="Quantidade" value={String(kickoffSalesData.cameraExtraSale.quantity || 0)} />
                      </div>
                    )}

                    {/* Venda de Acessórios */}
                    {kickoffSalesData.accessoriesSale.length > 0 && (
                      <div className={`bg-muted/20 p-4 rounded-xl border space-y-3 ${!kickoffSalesData.cameraExtraSale ? 'lg:col-span-2' : ''}`}>
                        <SectionHeader icon={Package} title="Venda de Acessórios" />
                        <div className="space-y-1.5">
                          {kickoffSalesData.accessoriesSale.map((acc, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-card border rounded-lg">
                              <span className="font-medium text-sm text-foreground">{acc.description}</span>
                              <Badge variant="secondary" className="ml-2">{acc.quantity}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* Production / Shipment sections by status   */}
            {/* ═══════════════════════════════════════════ */}

            {/* "Pedidos" (novos): Start Production */}
            {order.status === "novos" && viewMode === "scanner" && (
              <div className="bg-muted/20 p-4 rounded-xl border">
                <ProductionStatus
                  orderNumber={order.number}
                  scannedCount={productionItems.length}
                  totalTrackers={order.trackers.reduce((sum, tracker) => sum + tracker.quantity, 0)}
                  isProductionComplete={false}
                  currentStatus={order.status}
                  onStartProduction={onStartProduction}
                  onCompleteProduction={onCompleteProduction}
                />
              </div>
            )}

            {/* "Em produção" (scanner): Scanner + Items */}
            {order.status === "producao" && viewMode === "scanner" && (
              <>
                <div className="bg-muted/20 p-4 rounded-xl border">
                  <ProductionForm
                    order={order}
                    productionItems={productionItems}
                    isScanning={isScanning}
                    imei={imei}
                    serialNumber={serialNumber}
                    productionLineCode={productionLineCode}
                    scannerActive={scannerActive}
                    scannerError={scannerError}
                    onImeiChange={setImei}
                    onSerialNumberChange={setSerialNumber}
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
                </div>
                <div className="bg-muted/20 p-4 rounded-xl border">
                  <ProductionItemsList
                    productionItems={productionItems}
                    totalTrackers={order.trackers.reduce((sum, tracker) => sum + tracker.quantity, 0)}
                    isLoading={productionLoading}
                  />
                </div>
                {(order.status === 'producao' || order.status === 'in_progress') && (
                  <div className="flex justify-end">
                    <Button onClick={onCompleteProduction} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Concluir Produção
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* "Aguardando envio": Shipment Form */}
            {order.status === "aguardando" && viewMode === "scanner" && (
              <div className="bg-muted/20 p-4 rounded-xl border space-y-3">
                <SectionHeader icon={Truck} title="Preparar Envio" />
                <ShipmentFormEmbedded order={order} onUpdate={onUpdate} onClose={onClose} schedule={schedule} />
              </div>
            )}

            {/* "Enviado": Shipped vehicles */}
            {order.status === "enviado" && viewMode === "scanner" && (
              <div className="space-y-4">
                <SectionHeader icon={Truck} title="Veículos Enviados" />
                {loading ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">Carregando veículos...</div>
                ) : (
                  (allSchedules.length > 0 ? allSchedules : schedule ? [schedule] : []).map((sched, idx) => {
                    const scheduleWithKits = sched as any;
                    const selectedKitNames = scheduleWithKits.selected_kit_ids && Array.isArray(scheduleWithKits.selected_kit_ids)
                      ? scheduleWithKits.selected_kit_ids.map((kitId: string) => kitNamesMap[kitId] || `Kit ${kitId}`).join(', ')
                      : sched.kit?.name || 'N/A';

                    return (
                      <div key={sched.id || idx} className="p-4 bg-card border-2 border-primary/20 rounded-xl space-y-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          {sched.vehicle_plate && (
                            <Badge variant="outline" className="text-base font-bold px-3 py-1 border-2 border-primary">
                              {sched.vehicle_plate}
                            </Badge>
                          )}
                          <span className="text-sm font-semibold text-foreground">
                            {[sched.vehicle_brand, sched.vehicle_model].filter(Boolean).join(' ')}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <InfoField label="Kit" value={selectedKitNames} />
                          {sched.technician?.name && <InfoField label="Técnico" value={sched.technician.name} />}
                        </div>

                        {/* Address grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <InfoField label="Logradouro" value={`${sched.installation_address_street || 'N/A'}, ${sched.installation_address_number || 'S/N'}`} />
                          </div>
                          <InfoField label="Bairro" value={sched.installation_address_neighborhood || 'N/A'} />
                          <InfoField label="Cidade" value={`${sched.installation_address_city || ''} - ${sched.installation_address_state || ''}`} />
                          <InfoField label="CEP" value={sched.installation_address_postal_code || 'N/A'} />
                          <InfoField label="Complemento" value={sched.installation_address_complement || '-'} />
                        </div>

                        {/* Tracking code */}
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Código de Rastreio</span>
                          <p className="font-mono font-bold text-emerald-800 dark:text-emerald-300 text-base mt-0.5">
                            {sched.tracking_code || 'N/A'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* Full detail sections (non-scanner modes)   */}
            {/* ═══════════════════════════════════════════ */}
            {!(order.status === "producao" && viewMode === "scanner") && 
             !(order.status === "aguardando" && viewMode === "scanner") &&
             !(order.status === "enviado" && viewMode === "scanner") && (
              <>
                {/* Scanned IMEIs */}
                {productionItems.length > 0 && (
                  <div className="bg-muted/20 p-4 rounded-xl border space-y-3">
                    <SectionHeader icon={Scan} title={`IMEIs Escaneados (${productionItems.length})`} />
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {productionItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm bg-card p-2.5 rounded-lg border">
                          <span className="font-mono text-foreground">{item.imei}</span>
                          <span className="text-muted-foreground text-xs">Linha: {item.production_line_code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Totais Consolidados ── */}
                {allSchedules.length > 0 && (
                  <div className="bg-muted/20 p-4 rounded-xl border space-y-3">
                    <SectionHeader icon={ClipboardList} title="Totais Consolidados" />
                    {(() => {
                      const totals: Record<string, number> = {};
                      allSchedules.forEach((sched) => {
                        (sched.kit?.equipment || []).forEach((item: any) => {
                          const key = cleanItemName(item.item_name);
                          totals[key] = (totals[key] || 0) + item.quantity;
                        });
                        if (Array.isArray(sched.accessories)) {
                          sched.accessories.forEach((accessoryStr: string) => {
                            const match = accessoryStr.match(/^(.+?)\s*\(qty:\s*(\d+)\)$/i);
                            const rawName = match ? match[1].trim() : accessoryStr.trim();
                            const quantity = match ? parseInt(match[2], 10) : 1;
                            const key = cleanItemName(rawName);
                            totals[key] = (totals[key] || 0) + quantity;
                          });
                        }
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

                      // Add camera extras quantity from kickoff sales
                      if (kickoffSalesData.cameraExtraSale && kickoffSalesData.cameraExtraSale.quantity > 0) {
                        const key = 'Câmeras Extras (Venda)';
                        totals[key] = (totals[key] || 0) + kickoffSalesData.cameraExtraSale.quantity;
                      }

                      // Add accessories from kickoff sales
                      kickoffSalesData.accessoriesSale.forEach((acc) => {
                        if (acc.description && acc.quantity > 0) {
                          const key = cleanItemName(acc.description);
                          totals[key] = (totals[key] || 0) + acc.quantity;
                        }
                      });

                      const sortedItems = Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));
                      return sortedItems.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {sortedItems.map(([itemName, quantity]) => (
                            <div key={itemName} className="flex items-center justify-between p-2.5 bg-card border rounded-lg">
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
                )}

                {/* ── Detalhamento por Técnico ── */}
                {allSchedules.length > 0 && (
                  <div className="space-y-3">
                    <SectionHeader icon={User} title="Detalhamento por Técnico" />
                    {(() => {
                      const byTechnician: Record<string, typeof allSchedules> = {};
                      allSchedules.forEach((sched) => {
                        const techName = sched.technician?.name || 'Sem técnico atribuído';
                        if (!byTechnician[techName]) byTechnician[techName] = [];
                        byTechnician[techName].push(sched);
                      });

                      return Object.entries(byTechnician).map(([techName, schedules]) => {
                        const techTotals: Record<string, number> = {};
                        schedules.forEach((sched) => {
                          (sched.kit?.equipment || []).forEach((item: any) => {
                            const normalizedName = normalizeItemName(item.item_name);
                            if (normalizedName === 'fmc150' || normalizedName === 'fmc 150') return;
                            const key = cleanItemName(item.item_name);
                            techTotals[key] = (techTotals[key] || 0) + item.quantity;
                          });
                          if (Array.isArray(sched.accessories)) {
                            sched.accessories.forEach((accessoryStr: string) => {
                              const match = accessoryStr.match(/^(.+?)\s*\(qty:\s*(\d+)\)$/i);
                              const rawName = match ? match[1].trim() : accessoryStr.trim();
                              const quantity = match ? parseInt(match[2], 10) : 1;
                              const key = cleanItemName(rawName);
                              techTotals[key] = (techTotals[key] || 0) + quantity;
                            });
                          }
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
                          <div key={techName} className="bg-muted/20 p-4 rounded-xl border space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                <span className="font-semibold text-sm text-foreground">{techName}</span>
                                <Badge variant="outline" className="text-xs">
                                  {schedules.length} {schedules.length === 1 ? 'placa' : 'placas'}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedTechnician({ name: techName, schedules })}
                                className="h-7 px-2 gap-1.5 text-xs"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Detalhes
                              </Button>
                            </div>
                            {sortedTechItems.length > 0 && (
                              <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
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
                )}

                {/* ── Veículos (plates) ── */}
                {allSchedules.length > 0 && (
                  <div className="space-y-3">
                    <SectionHeader
                      icon={Car}
                      title={`Veículos (${allSchedules.length} ${allSchedules.length === 1 ? 'placa' : 'placas'})`}
                    />
                    {loading ? (
                      <div className="text-center py-6 text-muted-foreground text-sm">Carregando placas...</div>
                    ) : (
                      allSchedules.map((sched, idx) => {
                        const equipment = sched.kit?.equipment || [];
                        
                        let accessoriesItems: Array<{ id: string; item_name: string; quantity: number }> = [];
                        const dbAccessories = scheduleAccessoriesMap[sched.id] || [];
                        if (dbAccessories.length > 0) {
                          accessoriesItems = dbAccessories.map((acc, i) => ({
                            id: `${sched.id}-acc-${i}`,
                            item_name: cleanItemName(acc.name),
                            quantity: acc.quantity
                          }));
                        } else if (Array.isArray(sched.accessories) && sched.accessories.length > 0) {
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

                        return (
                          <div key={sched.id || idx} className="p-4 bg-card border-2 border-primary/15 rounded-xl space-y-4">
                            {/* Vehicle Header */}
                            <div className="flex items-center gap-3 flex-wrap">
                              {sched.vehicle_plate && (
                                <Badge variant="outline" className="text-base font-bold px-3 py-1">
                                  {sched.vehicle_plate}
                                </Badge>
                              )}
                              {(sched.vehicle_brand || sched.vehicle_model) && (
                                <span className="text-sm text-muted-foreground">
                                  {[sched.vehicle_brand, sched.vehicle_model].filter(Boolean).join(' ')}
                                </span>
                              )}
                            </div>

                            {/* Schedule details row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <InfoField label="Data" value={formatDate(sched.scheduled_date)} />
                              {sched.technician && (
                                <div className="space-y-1">
                                  <InfoField label="Técnico" value={sched.technician.name} />
                                  {sched.tracking_code && (
                                    <div className="flex items-center gap-1.5">
                                      <Package className="h-3 w-3 text-emerald-600" />
                                      <span className="font-mono text-xs text-emerald-600 font-medium">{sched.tracking_code}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {sched.installation_address_city && (
                                <InfoField label="Local" value={`${sched.installation_address_city}, ${sched.installation_address_state}`} />
                              )}
                            </div>

                            {/* Configuration */}
                            {sched.configuration && (
                              <div className="p-2.5 bg-primary/5 border border-primary/15 rounded-lg">
                                <p className="text-sm font-medium text-primary">📋 {sched.configuration}</p>
                              </div>
                            )}

                            {/* Modules */}
                            {(() => {
                              const moduleAccessories = Array.isArray(sched.accessories) 
                                ? sched.accessories.filter((acc: string) => {
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
                                <div>
                                  <h4 className="font-semibold text-xs mb-1.5 text-primary uppercase tracking-wider">Módulos</h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {moduleAccessories.map((mod: string, modIdx: number) => {
                                      const match = mod.match(/^(.+?)\s*\(qty:\s*(\d+)\)$/i);
                                      const name = match ? match[1].trim() : mod.trim();
                                      return (
                                        <Badge key={modIdx} variant="secondary" className="text-xs bg-purple-50 text-purple-800 dark:bg-purple-950/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                          {cleanItemName(name)}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            <Separator />

                            {/* Kits */}
                            {(() => {
                              const scheduleWithKits = sched as any;
                              const hasSelectedKits = scheduleWithKits.selected_kit_ids && 
                                                     Array.isArray(scheduleWithKits.selected_kit_ids) && 
                                                     scheduleWithKits.selected_kit_ids.length > 0;
                              if (!hasSelectedKits && !sched.kit?.name) return null;
                              return (
                                <div>
                                  <h4 className="font-semibold text-xs mb-1.5 text-primary uppercase tracking-wider">Kits</h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {hasSelectedKits ? (
                                      scheduleWithKits.selected_kit_ids.map((kitId: string, kitIdx: number) => (
                                        <Badge key={kitIdx} variant="secondary" className="text-xs bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                          {kitNamesMap[kitId] || `Kit ${kitId}`}
                                        </Badge>
                                      ))
                                    ) : sched.kit?.name ? (
                                      <Badge variant="secondary" className="text-xs">{sched.kit.name}</Badge>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Equipment */}
                            {equipment.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-xs mb-1.5 text-primary uppercase tracking-wider">
                                  Rastreadores ({equipment.reduce((sum, eq) => sum + eq.quantity, 0)})
                                </h4>
                                <div className="space-y-1.5">
                                  {equipment.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center p-2 bg-muted/30 rounded-lg text-sm">
                                      <span className="font-medium text-foreground">{cleanItemName(item.item_name)}</span>
                                      <Badge variant="secondary" className="text-xs">{item.quantity}x</Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Supplies */}
                            {suppliesItems.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-xs mb-1.5 text-primary uppercase tracking-wider">
                                  Insumos ({suppliesItems.reduce((sum, s) => sum + (s.quantity || 0), 0)})
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {suppliesItems.map((item, index) => (
                                    <Badge key={item.id || index} variant="outline" className="text-xs gap-1">
                                      ✓ {cleanItemName(item.item_name)}
                                      {item.quantity > 1 && <span className="text-muted-foreground">{item.quantity}x</span>}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}

                    {/* Camera Extras from Kickoff (in non-scanner full details) */}
                    {cameraExtras.length > 0 && (
                      <div className="bg-muted/20 p-4 rounded-xl border space-y-3">
                        <SectionHeader icon={Camera} title="Câmeras Extras" />
                        <div className="space-y-2">
                          {cameraExtras.map((camera, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-card border rounded-lg">
                              <div className="space-y-0.5">
                                <p className="font-medium text-sm text-foreground">{camera.vehicleName}</p>
                                <p className="text-xs text-muted-foreground">Local: {camera.locations}</p>
                              </div>
                              <Badge variant="secondary">{camera.quantity}x</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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
            <AlertDialogTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              {selectedTechnician?.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Veículos atribuídos a este técnico
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedTechnician?.schedules.map((sched, idx) => (
                  <div key={sched.id || idx} className="p-3 bg-muted/20 rounded-xl border">
                    {sched.vehicle_plate && (
                      <Badge variant="outline" className="font-bold mb-1">{sched.vehicle_plate}</Badge>
                    )}
                    <p className="text-sm font-medium text-foreground">
                      {sched.vehicle_brand} {sched.vehicle_model}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setSelectedTechnician(null)}>Fechar</Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default OrderModal;
