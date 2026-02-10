import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, Plus, Trash2, Truck, Users, MapPin, Settings, FileText,
  Package, Camera, Clock, Car, AlertTriangle, CheckCircle2, Shield, Info
} from "lucide-react";
import { processKickoffVehicles } from "@/services/kickoffProcessingService";
import type { KickoffVehicle } from "@/services/kickoffService";
import { fetchSegsaleProductsDirect } from "@/services/segsaleService";
import { KickoffVehiclesTable } from "./KickoffVehiclesTable";
import { LocationSelector } from "@/components/shipment";
import { logCreate } from "@/services/logService";

interface KickoffDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleSummaryId: number;
  companyName: string;
  vehicles: KickoffVehicle[];
  onSuccess: () => void;
}

interface InstallationLocation {
  city: string;
  state: string;
}

interface Contact {
  type: 'decisor' | 'influenciador' | 'operacoes';
  name: string;
  role: string;
  email: string;
  phone: string;
}

export const KickoffDetailsModal = ({
  open,
  onOpenChange,
  saleSummaryId,
  companyName,
  vehicles,
  onSuccess,
}: KickoffDetailsModalProps) => {
  const [loading, setLoading] = useState(false);
  const [hasParticularity, setHasParticularity] = useState(false);
  const [kickoffCreatedAt, setKickoffCreatedAt] = useState<Date | null>(null);
  const [customerInfo, setCustomerInfo] = useState<{
    name: string;
    services: string[];
    city: string;
    state: string;
  } | null>(null);
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [installationLocations, setInstallationLocations] = useState<InstallationLocation[]>([
    { city: "", state: "" }
  ]);
  const [particularityDetails, setParticularityDetails] = useState("");
  const [notes, setNotes] = useState("");
  
  const [selectedModules, setSelectedModules] = useState<Map<string, Set<string>>>(
    new Map(vehicles.map(v => {
      const normalize = (s: string) => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
      const modulesList = v.modules.filter(m => normalize(m.categories || '') === 'modulos');
      return [v.id, new Set(modulesList.map(m => m.name))];
    }))
  );
  
  const [vehicleBlocking, setVehicleBlocking] = useState<Map<string, { needsBlocking: boolean; engineBlocking: boolean; fuelBlocking: boolean; engineQuantity: number; fuelQuantity: number }>>(
    new Map(vehicles.map(v => [v.id, { needsBlocking: false, engineBlocking: false, fuelBlocking: false, engineQuantity: 1, fuelQuantity: 1 }]))
  );

  const [vehicleSiren, setVehicleSiren] = useState<Map<string, { hasSiren: boolean; quantity: number }>>(
    new Map(vehicles.map(v => [v.id, { hasSiren: false, quantity: 1 }]))
  );

  const [vehicleVideoMonitoring, setVehicleVideoMonitoring] = useState<Map<string, boolean | undefined>>(
    new Map()
  );

  const [vehicleCameraExtra, setVehicleCameraExtra] = useState<Map<string, number>>(
    new Map(vehicles.map(v => [v.id, 1]))
  );

  const [cameraExtraLocations, setCameraExtraLocations] = useState<Map<string, string>>(new Map());

  const [validatedPlates, setValidatedPlates] = useState<Set<string>>(new Set());

  const normalizeForSearch = (text: string): string => {
    return (text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const vehiclesWithCameraExtra = useMemo(() => {
    return vehicles.filter(vehicle => {
      return vehicle.modules.some(m => {
        const normalizedName = normalizeForSearch(m.name);
        return normalizedName.includes("camera extra") || normalizedName.includes("camara extra");
      });
    });
  }, [vehicles]);

  useEffect(() => {
    if (open && saleSummaryId) {
      loadCustomerData();
      checkAndBackfillAccessories();
    }
  }, [open, saleSummaryId]);

  const checkAndBackfillAccessories = async () => {
    try {
      const { data: incomingVehicles } = await supabase
        .from('incoming_vehicles')
        .select('id')
        .eq('sale_summary_id', saleSummaryId);

      if (!incomingVehicles || incomingVehicles.length === 0) return;

      const { data: existingAccessories } = await supabase
        .from('accessories')
        .select('id')
        .in('vehicle_id', incomingVehicles.map(v => v.id));

      if (!existingAccessories || existingAccessories.length === 0) {
        toast.info('Importando módulos e acessórios do Segsale...');
        try {
          await fetchSegsaleProductsDirect(saleSummaryId);
          toast.success('Módulos e acessórios importados com sucesso!');
          setTimeout(() => { onSuccess(); }, 1000);
        } catch (error) {
          console.error('Error importing from Segsale:', error);
          toast.error('Erro ao importar dados do Segsale');
        }
      }
    } catch (error) {
      console.error('Error checking accessories:', error);
    }
  };

  const loadCustomerData = async () => {
    try {
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('sale_summary_id', saleSummaryId)
        .maybeSingle();

      if (customerData) {
        setHasParticularity(customerData.has_installation_particularity || false);
        setParticularityDetails(customerData.installation_particularity_details || "");
        setNotes(customerData.kickoff_notes || "");
        setContacts(Array.isArray(customerData.contacts) ? (customerData.contacts as unknown as Contact[]) : []);
        setInstallationLocations(
          Array.isArray(customerData.installation_locations) && customerData.installation_locations.length > 0
            ? (customerData.installation_locations as unknown as InstallationLocation[])
            : [{ city: "", state: "" }]
        );
        const modules = Array.isArray(customerData.modules) ? customerData.modules : [];
        setCustomerInfo({
          name: customerData.company_name || customerData.name || companyName || "Cliente não identificado",
          services: modules,
          city: customerData.address_city || "Não informado",
          state: customerData.address_state || "Não informado"
        });
      } else {
        const { data: vehicleData } = await supabase
          .from('incoming_vehicles')
          .select('company_name, address_city, received_at')
          .eq('sale_summary_id', saleSummaryId)
          .order('received_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (vehicleData) {
          setKickoffCreatedAt(new Date(vehicleData.received_at));
          setCustomerInfo({
            name: vehicleData.company_name || companyName || "Cliente não identificado",
            services: [],
            city: vehicleData.address_city || "Não informado",
            state: "SP"
          });
        } else {
          setCustomerInfo({
            name: companyName || "Cliente não identificado",
            services: [],
            city: "Não informado",
            state: "Não informado"
          });
        }
      }
      
      if (!kickoffCreatedAt) {
        const { data: vehicleData } = await supabase
          .from('incoming_vehicles')
          .select('received_at')
          .eq('sale_summary_id', saleSummaryId)
          .order('received_at', { ascending: true })
          .limit(1)
          .maybeSingle();
          
        if (vehicleData) {
          setKickoffCreatedAt(new Date(vehicleData.received_at));
        }
      }
    } catch (error) {
      console.error("Error loading customer data:", error);
      setCustomerInfo({
        name: companyName || "Cliente não identificado",
        services: [],
        city: "Não informado",
        state: "Não informado"
      });
    }
  };

  const calculateDaysSinceKickoff = (): number => {
    if (!kickoffCreatedAt) return 0;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - kickoffCreatedAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleModuleToggle = (vehicleId: string, moduleName: string) => {
    setSelectedModules(prev => {
      const newMap = new Map(prev);
      const vehicleModules = new Set(newMap.get(vehicleId) || []);
      if (vehicleModules.has(moduleName)) {
        vehicleModules.delete(moduleName);
      } else {
        vehicleModules.add(moduleName);
      }
      newMap.set(vehicleId, vehicleModules);
      return newMap;
    });
  };

  const handleBlockingToggle = (vehicleId: string, field: 'needsBlocking' | 'engineBlocking' | 'fuelBlocking', value: boolean) => {
    setVehicleBlocking(prev => {
      const newMap = new Map(prev);
      const vehicleBlock = { ...(newMap.get(vehicleId) || { needsBlocking: false, engineBlocking: false, fuelBlocking: false, engineQuantity: 1, fuelQuantity: 1 }) };
      vehicleBlock[field] = value;
      if (field === 'needsBlocking' && !value) {
        vehicleBlock.engineBlocking = false;
        vehicleBlock.fuelBlocking = false;
      }
      newMap.set(vehicleId, vehicleBlock);
      return newMap;
    });
  };

  const handleBlockingQuantityChange = (vehicleId: string, field: 'engineQuantity' | 'fuelQuantity', quantity: number) => {
    setVehicleBlocking(prev => {
      const newMap = new Map(prev);
      const vehicleBlock = { ...(newMap.get(vehicleId) || { needsBlocking: false, engineBlocking: false, fuelBlocking: false, engineQuantity: 1, fuelQuantity: 1 }) };
      vehicleBlock[field] = Math.max(1, quantity);
      newMap.set(vehicleId, vehicleBlock);
      return newMap;
    });
  };

  const handleSirenToggle = (vehicleId: string, value: boolean) => {
    setVehicleSiren(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(vehicleId) || { hasSiren: false, quantity: 1 };
      newMap.set(vehicleId, { ...current, hasSiren: value });
      return newMap;
    });
  };

  const handleSirenQuantityChange = (vehicleId: string, quantity: number) => {
    setVehicleSiren(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(vehicleId) || { hasSiren: false, quantity: 1 };
      newMap.set(vehicleId, { ...current, quantity: Math.max(1, quantity) });
      return newMap;
    });
  };

  const addContact = () => {
    setContacts([...contacts, { type: 'decisor', name: "", role: "", email: "", phone: "" }]);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    const updated = [...contacts];
    updated[index][field] = value as any;
    setContacts(updated);
  };

  const addLocation = () => {
    setInstallationLocations([...installationLocations, { city: "", state: "" }]);
  };

  const removeLocation = (index: number) => {
    setInstallationLocations(installationLocations.filter((_, i) => i !== index));
  };

  const updateLocation = (index: number, field: keyof InstallationLocation, value: string) => {
    const updated = [...installationLocations];
    updated[index][field] = value;
    setInstallationLocations(updated);
  };

  // Validation checks
  const hasValidLocations = installationLocations.some(loc => loc.city.trim() !== "" && loc.state.trim() !== "");
  const hasAtLeastOneValidatedPlate = validatedPlates.size > 0;
  const isFormValid = hasAtLeastOneValidatedPlate && hasValidLocations;

  // Pending issues count
  const pendingIssues = useMemo(() => {
    const issues: string[] = [];
    if (!hasAtLeastOneValidatedPlate) issues.push("Nenhum veículo validado");
    if (!hasValidLocations) issues.push("Nenhum local de instalação");
    return issues;
  }, [hasAtLeastOneValidatedPlate, hasValidLocations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasAtLeastOneValidatedPlate) {
      toast.error("Por favor, valide pelo menos um veículo na coluna 'Validação' antes de concluir o kickoff.");
      return;
    }
    
    if (!hasValidLocations) {
      toast.error("Por favor, preencha pelo menos um local de instalação (cidade e estado).");
      return;
    }
    
    setLoading(true);

    try {
      const validatedVehicles = vehicles.filter(v => validatedPlates.has(v.id));
      const { error: customerError } = await supabase
        .from("customers")
        .update({
          contacts: contacts.filter(c => c.name) as any,
          installation_locations: installationLocations.filter(loc => loc.city) as any,
          has_installation_particularity: !!particularityDetails,
          installation_particularity_details: particularityDetails || null,
          kickoff_notes: notes || null,
        })
        .eq("sale_summary_id", saleSummaryId);

      if (customerError) throw customerError;

      const vehiclesData = validatedVehicles.map(vehicle => {
        const modules = Array.from(selectedModules.get(vehicle.id) || []);
        const blocking = vehicleBlocking.get(vehicle.id) || { needsBlocking: false, engineBlocking: false, fuelBlocking: false, quantity: 1 };
        const sirenData = vehicleSiren.get(vehicle.id) || { hasSiren: false, quantity: 1 };
        const videoMonitoring = vehicleVideoMonitoring.get(vehicle.id);
        
        return {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          plate: vehicle.plate,
          quantity: vehicle.quantity,
          usage_type: (vehicle as any).usage_type,
          selected_modules: modules,
          blocking_info: blocking,
          siren_info: sirenData,
          has_video_monitoring: videoMonitoring,
          accessories: vehicle.modules.filter(m => {
            const normalize = (s: string) => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
            return normalize(m.categories || '') !== 'modulos';
          })
        };
      });

      for (const vehicle of validatedVehicles) {
        const modules = Array.from(selectedModules.get(vehicle.id) || []);
        const sirenData = vehicleSiren.get(vehicle.id) || { hasSiren: false, quantity: 1 };
        const blockingData = vehicleBlocking.get(vehicle.id) || { needsBlocking: false, engineBlocking: false, fuelBlocking: false, quantity: 1 };
        
        if (modules.length > 0) {
          const { error: vehicleError } = await supabase
            .from("incoming_vehicles")
            .update({
              processing_notes: `Módulos selecionados: ${modules.join(', ')}`,
            })
            .eq("id", vehicle.id);

          if (vehicleError) {
            console.error(`Error updating vehicle ${vehicle.id} modules:`, vehicleError);
          }
        }

        if (sirenData.hasSiren) {
          const { error: sirenError } = await supabase
            .from("accessories")
            .upsert({
              vehicle_id: vehicle.id,
              company_name: companyName,
              usage_type: (vehicle as any).usage_type || 'outros',
              name: 'Sirene',
              categories: 'Acessórios',
              quantity: sirenData.quantity,
              received_at: new Date().toISOString()
            }, {
              onConflict: 'vehicle_id,name,categories',
              ignoreDuplicates: false
            });

          if (sirenError) {
            console.error(`Error adding sirene for vehicle ${vehicle.id}:`, sirenError);
          }
        }

        if (blockingData.needsBlocking) {
          if (blockingData.engineBlocking && blockingData.engineQuantity > 0) {
            const { error: engineBlockingError } = await supabase
              .from("accessories")
              .upsert({
                vehicle_id: vehicle.id,
                company_name: companyName,
                usage_type: (vehicle as any).usage_type || 'outros',
                name: 'Bloqueio de Partida',
                categories: 'Acessórios',
                quantity: blockingData.engineQuantity,
                received_at: new Date().toISOString()
              }, {
                onConflict: 'vehicle_id,name,categories',
                ignoreDuplicates: false
              });

            if (engineBlockingError) {
              console.error(`Error adding bloqueio de partida for vehicle ${vehicle.id}:`, engineBlockingError);
            }
          }

          if (blockingData.fuelBlocking && blockingData.fuelQuantity > 0) {
            const { error: fuelBlockingError } = await supabase
              .from("accessories")
              .upsert({
                vehicle_id: vehicle.id,
                company_name: companyName,
                usage_type: (vehicle as any).usage_type || 'outros',
                name: 'Bloqueio de Combustível',
                categories: 'Acessórios',
                quantity: blockingData.fuelQuantity,
                received_at: new Date().toISOString()
              }, {
                onConflict: 'vehicle_id,name,categories',
                ignoreDuplicates: false
              });

            if (fuelBlockingError) {
              console.error(`Error adding bloqueio de combustível for vehicle ${vehicle.id}:`, fuelBlockingError);
            }
          }
        }

        const hasCameraExtra = vehicle.modules.some(m => {
          const normalizedName = normalizeForSearch(m.name);
          return normalizedName.includes("camera extra") || normalizedName.includes("camara extra");
        });
        
        if (hasCameraExtra) {
          const cameraQuantity = vehicleCameraExtra.get(vehicle.id) || 1;
          const cameraLocation = cameraExtraLocations.get(vehicle.id) || null;
          
          const { error: cameraExtraError } = await supabase
            .from("incoming_vehicles")
            .update({
              camera_extra_quantity: cameraQuantity,
              camera_extra_locations: cameraLocation
            })
            .eq("id", vehicle.id);

          if (cameraExtraError) {
            console.error(`Error saving camera extra info for vehicle ${vehicle.id}:`, cameraExtraError);
          }
        }
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error: historyError } = await supabase
        .from("kickoff_history")
        .insert({
          sale_summary_id: saleSummaryId,
          company_name: companyName,
          total_vehicles: validatedVehicles.length,
          contacts: contacts.filter(c => c.name) as any,
          installation_locations: installationLocations.filter(loc => loc.city) as any,
          has_installation_particularity: !!particularityDetails,
          installation_particularity_details: particularityDetails || null,
          kickoff_notes: notes || null,
          vehicles_data: vehiclesData as any,
          approved_by: user?.id || null,
        });

      if (historyError) throw historyError;

      const validatedVehicleIds = Array.from(validatedPlates);
      const processingResult = await processKickoffVehicles(saleSummaryId, validatedVehicleIds);
      
      await logCreate("Kickoff", "kickoff", saleSummaryId.toString());
      
      if (!processingResult.success) {
        toast.error(`Kickoff salvo, mas houve erros ao processar veículos: ${processingResult.errors.join(', ')}`);
      } else {
        const messages = [];
        if (processingResult.homologations_created > 0) {
          messages.push(`${processingResult.homologations_created} homologação(ões) criada(s)`);
        }
        if (processingResult.already_homologated_count > 0) {
          messages.push(`${processingResult.already_homologated_count} veículo(s) já homologado(s)`);
        }
        toast.success(`Kickoff finalizado com sucesso! ${messages.join(', ')}`);
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving kickoff details:", error);
      toast.error("Erro ao salvar detalhes do kickoff");
    } finally {
      setLoading(false);
    }
  };

  const daysSinceKickoff = calculateDaysSinceKickoff();
  const getDaysColor = () => {
    if (daysSinceKickoff > 10) return "text-red-600 dark:text-red-400";
    if (daysSinceKickoff > 5) return "text-amber-600 dark:text-amber-400";
    return "text-muted-foreground";
  };

  const getStatusLabel = () => {
    if (validatedPlates.size === vehicles.length && hasValidLocations) return { label: "Pronto para concluir", color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800" };
    if (validatedPlates.size > 0 || contacts.length > 0) return { label: "Em andamento", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800" };
    return { label: "Pendente", color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800" };
  };

  const status = getStatusLabel();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] xl:max-w-[90vw] 2xl:max-w-[85vw] h-[90vh] flex flex-col p-0 rounded-xl" aria-describedby="kickoff-details-desc">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold tracking-tight">{companyName}</DialogTitle>
              <p className="text-sm text-muted-foreground">Detalhes do Kickoff • ID Venda #{saleSummaryId}</p>
            </div>
            <Badge variant="outline" className={`text-xs font-semibold px-3 py-1 shrink-0 ${status.color}`}>
              {status.label}
            </Badge>
          </div>
        </DialogHeader>
        <p id="kickoff-details-desc" className="sr-only">Preencha os detalhes do kickoff do cliente {companyName}.</p>

        {/* Summary Strip */}
        <div className="px-6 py-3 border-y bg-muted/30 shrink-0">
          <div className="flex items-center gap-6 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Veículos:</span>
              <span className="font-semibold">{vehicles.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-muted-foreground">Validados:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{validatedPlates.size}/{vehicles.length}</span>
            </div>
            {pendingIssues.length > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-muted-foreground">Pendências:</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{pendingIssues.length}</span>
              </div>
            )}
            {kickoffCreatedAt && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Tempo:</span>
                <span className={`font-semibold ${getDaysColor()}`}>{daysSinceKickoff} {daysSinceKickoff === 1 ? 'dia' : 'dias'}</span>
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 px-6">
          <form id="kickoff-form" onSubmit={handleSubmit} className="py-4">
            <Accordion type="multiple" defaultValue={["fleet", "contacts", "locations", "cameras", "particularities", "observations"]} className="space-y-3">
              
              {/* Section 1: Customer Data */}
              {customerInfo && (
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden mb-3">
                  <div className="px-5 py-4 bg-muted/30 border-b">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="font-semibold text-base">Dados do Cliente</h3>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nome do Cliente</Label>
                        <p className="font-semibold text-sm">{customerInfo.name}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Cidade</Label>
                        <p className="font-semibold text-sm">{customerInfo.city}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Estado</Label>
                        <p className="font-semibold text-sm">{customerInfo.state}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 2: Fleet Validation */}
              <AccordionItem value="fleet" className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <AccordionTrigger className="px-5 py-4 bg-muted/30 border-b hover:no-underline [&[data-state=open]]:border-b [&[data-state=closed]]:border-b-0">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                      <Truck className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-base">Validação de Frota</h3>
                    <Badge variant="outline" className="ml-2 text-xs">{validatedPlates.size}/{vehicles.length} validados</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-5 pt-4">
                  <KickoffVehiclesTable
                    vehicles={vehicles}
                    selectedModules={selectedModules}
                    onModuleToggle={handleModuleToggle}
                    vehicleBlocking={vehicleBlocking}
                    onBlockingToggle={handleBlockingToggle}
                    onBlockingQuantityChange={handleBlockingQuantityChange}
                    vehicleSiren={vehicleSiren}
                    onSirenToggle={handleSirenToggle}
                    onSirenQuantityChange={handleSirenQuantityChange}
                    vehicleVideoMonitoring={vehicleVideoMonitoring}
                    onVideoMonitoringChange={(vehicleId, value) => {
                      setVehicleVideoMonitoring(prev => {
                        const newMap = new Map(prev);
                        if (value === undefined) {
                          newMap.delete(vehicleId);
                        } else {
                          newMap.set(vehicleId, value);
                        }
                        return newMap;
                      });
                    }}
                    saleSummaryId={saleSummaryId}
                    onVehicleUpdate={onSuccess}
                    validatedPlates={validatedPlates}
                    onPlateValidationChange={(vehicleId, validated) => {
                      setValidatedPlates(prev => {
                        const newSet = new Set(prev);
                        if (validated) {
                          newSet.add(vehicleId);
                        } else {
                          newSet.delete(vehicleId);
                        }
                        return newSet;
                      });
                    }}
                    vehicleCameraExtra={vehicleCameraExtra}
                    onCameraExtraQuantityChange={(vehicleId, quantity) => {
                      setVehicleCameraExtra(prev => {
                        const newMap = new Map(prev);
                        newMap.set(vehicleId, quantity);
                        return newMap;
                      });
                    }}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Section 3: Contacts */}
              <AccordionItem value="contacts" className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <AccordionTrigger className="px-5 py-4 bg-muted/30 border-b hover:no-underline [&[data-state=open]]:border-b [&[data-state=closed]]:border-b-0">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-base">Contatos</h3>
                    {contacts.length > 0 && (
                      <Badge variant="outline" className="ml-2 text-xs">{contacts.length} contato{contacts.length > 1 ? 's' : ''}</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-5 pt-4 space-y-3">
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={addContact} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar Contato
                    </Button>
                  </div>
                  {contacts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      Nenhum contato adicionado
                    </div>
                  )}
                  {contacts.map((contact, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/20">
                      <div className="flex justify-between items-center">
                        <Select
                          value={contact.type}
                          onValueChange={(value) => updateContact(index, "type", value)}
                        >
                          <SelectTrigger className="w-[180px] h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="decisor">Decisor</SelectItem>
                            <SelectItem value="influenciador">Influenciador</SelectItem>
                            <SelectItem value="operacoes">Operações</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeContact(index)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Nome</Label>
                          <Input value={contact.name} onChange={(e) => updateContact(index, "name", e.target.value)} className="h-9" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Função</Label>
                          <Input value={contact.role} onChange={(e) => updateContact(index, "role", e.target.value)} className="h-9" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">E-mail</Label>
                          <Input type="email" value={contact.email} onChange={(e) => updateContact(index, "email", e.target.value)} className="h-9" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Telefone</Label>
                          <Input value={contact.phone} onChange={(e) => updateContact(index, "phone", e.target.value)} className="h-9" />
                        </div>
                      </div>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>

              {/* Section 4: Installation Locations */}
              <AccordionItem value="locations" className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <AccordionTrigger className="px-5 py-4 bg-muted/30 border-b hover:no-underline [&[data-state=open]]:border-b [&[data-state=closed]]:border-b-0">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-base">Locais de Instalação</h3>
                    {!hasValidLocations && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="h-4 w-4 text-amber-500 ml-1" />
                        </TooltipTrigger>
                        <TooltipContent><p>Obrigatório: preencha ao menos um local</p></TooltipContent>
                      </Tooltip>
                    )}
                    {hasValidLocations && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-1" />
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-5 pt-4 space-y-3">
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={addLocation} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar Local
                    </Button>
                  </div>
                  {installationLocations.map((location, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/20">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Local {index + 1}</span>
                        {installationLocations.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeLocation(index)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <LocationSelector
                        selectedUF={location.state}
                        selectedCity={location.city}
                        onUFChange={(value) => updateLocation(index, "state", value)}
                        onCityChange={(value) => updateLocation(index, "city", value)}
                        disabled={loading}
                      />
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>

              {/* Section 5: Camera Extras */}
              {vehiclesWithCameraExtra.length > 0 && (
                <AccordionItem value="cameras" className="rounded-xl border bg-card shadow-sm overflow-hidden">
                  <AccordionTrigger className="px-5 py-4 bg-muted/30 border-b hover:no-underline [&[data-state=open]]:border-b [&[data-state=closed]]:border-b-0">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                        <Camera className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="font-semibold text-base">Câmeras Extras</h3>
                      <Badge variant="outline" className="ml-2 text-xs">{vehiclesWithCameraExtra.length} veículo{vehiclesWithCameraExtra.length > 1 ? 's' : ''}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-5 pt-4 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Configure a quantidade e localização das câmeras extras para cada veículo.
                    </p>
                    {vehiclesWithCameraExtra.map((vehicle) => (
                      <div key={vehicle.id} className="border rounded-lg p-4 space-y-3 bg-muted/20">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{vehicle.brand} {vehicle.model}</span>
                          {vehicle.plate && (
                            <Badge variant="secondary" className="text-xs">{vehicle.plate}</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Quantidade de câmeras extras</Label>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={vehicleCameraExtra.get(vehicle.id) || 1}
                              onChange={(e) => {
                                const quantity = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
                                setVehicleCameraExtra(prev => {
                                  const newMap = new Map(prev);
                                  newMap.set(vehicle.id, quantity);
                                  return newMap;
                                });
                              }}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Local onde ficarão as câmeras extras</Label>
                            <Input
                              value={cameraExtraLocations.get(vehicle.id) || ""}
                              onChange={(e) => {
                                setCameraExtraLocations(prev => {
                                  const newMap = new Map(prev);
                                  newMap.set(vehicle.id, e.target.value);
                                  return newMap;
                                });
                              }}
                              placeholder="Ex: Cabine, Baú, Lateral direita..."
                              className="h-9"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Section 6: Installation Particularities */}
              <AccordionItem value="particularities" className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <AccordionTrigger className="px-5 py-4 bg-muted/30 border-b hover:no-underline [&[data-state=open]]:border-b [&[data-state=closed]]:border-b-0">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                      <Settings className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-base">Particularidades da Instalação</h3>
                    {particularityDetails.length > 0 && (
                      <Badge variant="outline" className="ml-2 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800">Preenchido</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-5 pt-4">
                  <div className="space-y-2">
                    <Textarea
                      value={particularityDetails}
                      onChange={(e) => setParticularityDetails(e.target.value)}
                      placeholder="Descreva as particularidades de instalação, como restrições de horário, acesso ao local, tipo de piso, necessidade de elevador..."
                      rows={4}
                      maxLength={1000}
                      className="resize-none"
                    />
                    <div className="flex justify-end">
                      <span className="text-xs text-muted-foreground">{particularityDetails.length}/1000</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Section 7: Observations */}
              <AccordionItem value="observations" className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <AccordionTrigger className="px-5 py-4 bg-muted/30 border-b hover:no-underline [&[data-state=open]]:border-b [&[data-state=closed]]:border-b-0">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-base">Observações Gerais</h3>
                    {notes.length > 0 && (
                      <Badge variant="outline" className="ml-2 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800">Preenchido</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-5 pt-4">
                  <div className="space-y-2">
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observações gerais do kickoff, como informações relevantes sobre o cliente, particularidades do contrato..."
                      rows={4}
                      maxLength={2000}
                      className="resize-none"
                    />
                    <div className="flex justify-end">
                      <span className="text-xs text-muted-foreground">{notes.length}/2000</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </form>
        </ScrollArea>

        {/* Footer CTA */}
        <TooltipProvider>
          <div className="px-6 py-4 border-t bg-muted/20 shrink-0">
            <div className="flex items-center justify-between gap-4">
              {/* Validation feedback */}
              <div className="flex-1 min-w-0">
                {pendingIssues.length > 0 ? (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {pendingIssues.map((issue, i) => (
                        <p key={i}>{issue}</p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Todas as validações foram atendidas</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button type="submit" form="kickoff-form" disabled={loading || !isFormValid} className="gap-2">
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        <Package className="h-4 w-4" />
                        Realizar Kickoff
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!isFormValid && (
                    <TooltipContent side="top">
                      <p>Resolva as pendências para habilitar</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
};
