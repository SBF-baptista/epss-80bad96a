import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Clock, User, Truck, Package, Cpu, DollarSign, FileText, Building, Check, X, Info, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cleanItemName } from '@/utils/itemNormalization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Technician } from '@/services/technicianService';
import { createHomologationKit, type HomologationKit } from '@/services/homologationKitService';
import type { Customer, VehicleInfo } from '@/services/customerService';
import { createKitSchedule, checkScheduleConflict } from '@/services/kitScheduleService';

import { checkItemHomologation, type HomologationStatus } from '@/services/kitHomologationService';
import { CustomerSelector } from '@/components/customers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAccessoriesByVehicleIds, aggregateAccessoriesWithoutModules, aggregateModulesOnly, isModuleCategory } from '@/services/vehicleAccessoryService';
import { getIncomingVehiclesBySaleSummary, resolveIncomingVehicleId } from '@/services/incomingVehiclesService';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { fetchKitItemOptions, type KitItemOption } from '@/services/kitItemOptionsService';
import { ScheduleFormModal, ScheduleFormData, PendingVehicleData } from './ScheduleFormModal';

// Send WhatsApp notification to technician using Twilio template
const sendTechnicianWhatsApp = async (
  technicianId: string,
  scheduleData: {
    date: string;
    time: string;
    customer: string;
    address: string;
    local_contact: string;
    phone?: string;
  }
): Promise<{ success: boolean; technicianName?: string; error?: string }> => {
  try {
    console.log('[WhatsApp Template] Starting notification for technician:', technicianId);
    
    const { data: technician, error: techError } = await supabase
      .from('technicians')
      .select('name, phone')
      .eq('id', technicianId)
      .single();

    if (techError || !technician) {
      console.error('[WhatsApp Template] Error fetching technician:', techError);
      return { success: false, error: 'Técnico não encontrado' };
    }

    if (!technician.phone) {
      return { success: false, error: 'Técnico sem telefone cadastrado' };
    }

    const formattedDate = format(new Date(scheduleData.date + 'T12:00:00'), "dd/MM/yyyy (EEEE)", { locale: ptBR });

    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        orderId: 'schedule-notification',
        orderNumber: `Agendamento - ${scheduleData.customer}`,
        recipientPhone: technician.phone,
        recipientName: technician.name,
        templateType: 'technician_schedule',
        templateVariables: {
          technicianName: technician.name,
          scheduledDate: formattedDate,
          scheduledTime: scheduleData.time,
          customerName: scheduleData.customer,
          address: scheduleData.address,
          contactPhone: scheduleData.phone || scheduleData.local_contact || 'Não informado'
        }
      }
    });

    if (error) {
      console.error('[WhatsApp Template] Error sending:', error);
      return { success: false, technicianName: technician.name, error: error.message || 'Erro ao enviar' };
    }
    
    return { success: true, technicianName: technician.name };
  } catch (error) {
    console.error('[WhatsApp Template] Exception:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
};

// Helper to normalize item names (remove quantity suffix, trim, uppercase, remove special chars)
const normalizeName = (name: string): string => {
  return name
    .replace(/\s*\(\d+x\)\s*$/i, '') // Remove quantity suffix like "(3x)"
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
    .trim()
    .toUpperCase();
};

// Helper to check if two accessory names are similar
const isSimilarAccessoryName = (vehicleAccessory: string, homologatedAccessory: string): boolean => {
  const normalizedVehicle = normalizeName(vehicleAccessory);
  const normalizedHomologated = normalizeName(homologatedAccessory);
  
  // Exact match
  if (normalizedVehicle === normalizedHomologated) return true;
  
  // One contains the other
  if (normalizedVehicle.includes(normalizedHomologated) || normalizedHomologated.includes(normalizedVehicle)) return true;
  
  // Common synonyms and variations
  const synonyms: Record<string, string[]> = {
    'SIRENE': ['SIRENE', 'SIREN'],
    'BLOQUEIO': ['BLOQUEIO', 'RELE', 'RELÉ', 'RELAY', 'RELE 12V', 'RELE 24V'],
    'IBUTTON': ['IBUTTON', 'ID IBUTTON', 'IDENTIFICADOR IBUTTON'],
    'RFID': ['RFID', 'LEITOR RFID', 'ID CONDUTOR RFID', 'ID RFID', 'IDENTIFICADOR RFID', 'LEITOR RFID KNOV', 'LEITOR RFID SGBRAS'],
    'BLUETOOTH': ['BLUETOOTH', 'ID BLUETOOTH', 'IDENTIFICADOR BLUETOOTH'],
    'CAMERA': ['CAMERA', 'CÂMERA', 'CAMERA EXTRA', 'CÂMERA EXTRA'],
  };
  
  for (const [key, variations] of Object.entries(synonyms)) {
    const vehicleMatches = variations.some(v => normalizedVehicle.includes(v));
    const homologatedMatches = variations.some(v => normalizedHomologated.includes(v));
    if (vehicleMatches && homologatedMatches) return true;
  }
  
  return false;
};

// Lista conhecida de módulos (não são acessórios físicos)
const KNOWN_MODULES = [
  'GESTÃO AGRÍCOLA',
  'GESTÃO DE ENTREGAS E SERVIÇOS - DMS',
  'GESTÃO DE PASSAGEIROS - FRETAMENTO',
  'GESTÃO DE VIAGENS',
  'RANKING DE CONDUTOR - GAMIFICAÇÃO'
];

// Helper para identificar se um item é um módulo
const isModule = (itemName: string): boolean => {
  const normalized = normalizeName(itemName);
  return KNOWN_MODULES.some(m => normalized.includes(normalizeName(m)));
};

// Helper to extract quantity from formatted name like "ITEM (3x)"
const extractQuantity = (formatted: string): number => {
  const match = formatted.match(/\((\d+)x\)$/i);
  return match ? parseInt(match[1], 10) : 1;
};

/**
 * Função para verificar similaridade entre itens (adaptado do kitMatchingService)
 */
const isSimilarItem = (item1: string, item2: string): boolean => {
  const norm1 = normalizeName(item1);
  const norm2 = normalizeName(item2);
  
  // 1. Exatamente iguais
  if (norm1 === norm2) return true;
  
  // 2. Um contém o outro
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // 3. Equivalências semânticas
  const equivalences = [
    ['RFID', 'LEITOR RFID', 'LEITORA RFID', 'ID CONDUTOR RFID', 'CONDUTOR RFID'],
    ['BLOQUEIO', 'RELE', 'RELÉ', 'BLOQUEIO MOTOR', 'BLOQUEIO COMBUSTIVEL', 'BLOQUEIO PARTIDA'],
    ['IBUTTON', 'ID IBUTTON', 'CONDUTOR IBUTTON'],
    ['SIRENE', 'SIRENE DUPLA', 'SIRENE PADRAO'],
    ['BLUETOOTH', 'ID BLUETOOTH', 'CONDUTOR BLUETOOTH'],
    ['SENSOR', 'SENSOR COMBUSTIVEL', 'SENSOR TEMPERATURA'],
  ];
  
  for (const group of equivalences) {
    const item1Match = group.some(term => norm1.includes(term));
    const item2Match = group.some(term => norm2.includes(term));
    
    if (item1Match && item2Match) {
      return true;
    }
  }
  
  return false;
};

/**
 * Calcula compatibilidade de um kit com os acessórios do veículo
 * Retorna número de itens compatíveis encontrados
 */
const calculateKitCompatibility = (vehicleAccessories: string[], kit: HomologationKit): number => {
  // Filtrar acessórios relevantes do kit (ignorar suprimentos genéricos)
  const relevantKitItems = kit.accessories
    .filter(a => {
      const itemLower = a.item_name.toLowerCase();
      return !itemLower.includes('fita') &&
             !itemLower.includes('abraçadeira') &&
             !itemLower.includes('abracadeira') &&
             !itemLower.includes('parafuso') &&
             !itemLower.includes('porca');
    })
    .map(a => a.item_name);

  let matchCount = 0;
  
  // Para cada acessório do veículo, verificar se existe no kit
  for (const vehicleAcc of vehicleAccessories) {
    const vehicleAccNormalized = normalizeName(vehicleAcc);
    
    for (const kitItem of relevantKitItems) {
      if (isSimilarItem(vehicleAccNormalized, kitItem)) {
        matchCount++;
        break;
      }
    }
  }
  
  return matchCount;
};

/**
 * Verifica se um kit é compatível com o tipo de uso do veículo
 * FMC150 = Telemetria (telemetria_gps, telemetria_can, copiloto_2_cameras, copiloto_4_cameras)
 * FMC130 = Rastreio (particular, comercial, frota)
 */
/**
 * Determina a categoria do kit baseado nos equipamentos
 * FMC150 = Telemetria
 * FMC130 = Rastreamento (inclui Copiloto)
 */
const getKitCategory = (kit: HomologationKit): 'telemetria' | 'rastreamento' | null => {
  const hasFMC150 = kit.equipment.some(e => {
    const name = e.item_name.toLowerCase();
    return name.includes('fmc150') || name.includes('fmc 150');
  });
  
  const hasFMC130 = kit.equipment.some(e => {
    const name = e.item_name.toLowerCase();
    return name.includes('fmc130') || name.includes('fmc 130');
  });
  
  if (hasFMC150) return 'telemetria';
  if (hasFMC130) return 'rastreamento';
  return null;
};

const isKitCompatibleWithUsageType = (kit: HomologationKit, usageType?: string | null): boolean => {
  if (!usageType) return true; // Se não tiver usage_type, mostra todos os kits
  
  const kitCategory = getKitCategory(kit);
  
  // Se o kit não tem FMC150 nem FMC130, mostra para todos
  if (!kitCategory) return true;
  
  // Tipos de uso que são APENAS telemetria (FMC150)
  const telemetryTypes = ['telemetria_gps', 'telemetria_can'];
  const isTelemetryUsage = telemetryTypes.includes(usageType);
  
  // Tipos de uso que são Rastreamento/Copiloto (FMC130)
  const trackingCopilotoTypes = ['particular', 'comercial', 'frota', 'copiloto_2_cameras', 'copiloto_4_cameras'];
  const isTrackingCopilotoUsage = trackingCopilotoTypes.includes(usageType);
  
  // Lógica de compatibilidade:
  // - Telemetria (telemetria_gps, telemetria_can): mostrar kits com FMC150
  // - Rastreamento/Copiloto (particular, comercial, frota, copiloto): mostrar kits com FMC130
  if (isTelemetryUsage) {
    return kitCategory === 'telemetria';
  }
  
  if (isTrackingCopilotoUsage) {
    return kitCategory === 'rastreamento';
  }
  
  // Para outros tipos de uso, mostrar todos
  return true;
};

/**
 * Sugere kits compatíveis para um veículo baseado em seus acessórios e tipo de uso
 * Retorna kits ordenados por compatibilidade (maior primeiro)
 */
const matchKitsToAccessories = (vehicleAccessories: string[], allKits: HomologationKit[], usageType?: string | null): HomologationKit[] => {
  if (vehicleAccessories.length === 0) return [];
  
  // Primeiro, filtrar kits compatíveis com o tipo de uso
  const compatibleKits = allKits.filter(kit => isKitCompatibleWithUsageType(kit, usageType));
  
  // Calcular compatibilidade para cada kit compatível
  const kitsWithScore = compatibleKits.map(kit => ({
    kit,
    matchCount: calculateKitCompatibility(vehicleAccessories, kit)
  }));
  
  // Filtrar apenas kits com pelo menos 1 match e ordenar por número de matches
  return kitsWithScore
    .filter(item => item.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .map(item => item.kit);
};

interface VehicleScheduleData {
  plate: string;
  brand: string;
  model: string;
  year: number;
  usage_type?: string | null;
  technician_ids: string[];
  scheduled_date: Date | null;
  installation_time: string;
  notes: string;
  accessories: string[];
  modules: string[];
  selected_kit_ids: string[]; // IDs dos kits selecionados para este veículo
}

const vehicleScheduleSchema = z.object({
  plate: z.string(),
  brand: z.string(),
  model: z.string(),
  year: z.number(),
  technician_ids: z.array(z.string()).min(1, 'Selecione pelo menos um técnico'),
  scheduled_date: z.date({ required_error: 'Selecione uma data' }),
  installation_time: z.string().optional(),
  notes: z.string().optional()
});

const formSchema = z.object({
  vehicles: z.array(vehicleScheduleSchema).min(1, 'Configure pelo menos um veículo')
});

type FormData = z.infer<typeof formSchema>;

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomer?: Customer | null;
  selectedVehicle?: VehicleInfo | null;
  kits: HomologationKit[];
  technicians: Technician[];
  homologationStatuses: Map<string, HomologationStatus>;
  existingSchedules?: any[];
  onSuccess: () => void;
}

export const ScheduleModal = ({
  isOpen,
  onClose,
  selectedCustomer: initialCustomer,
  selectedVehicle: initialVehicle,
  kits,
  technicians,
  homologationStatuses,
  existingSchedules = [],
  onSuccess
}: ScheduleModalProps) => {
  const { toast: toastHook } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialCustomer || null);
  const [vehicleSchedules, setVehicleSchedules] = useState<VehicleScheduleData[]>([]);
  const [homologationStatus, setHomologationStatus] = useState<Map<string, boolean>>(new Map());
  const [scheduleConflicts, setScheduleConflicts] = useState<Map<string, string>>(new Map());
  const [accessoriesByVehicleId, setAccessoriesByVehicleId] = useState<Map<string, string[]>>(new Map());
  const [modulesByVehicleId, setModulesByVehicleId] = useState<Map<string, string[]>>(new Map());
  const [usageTypeByVehicle, setUsageTypeByVehicle] = useState<Map<string, string>>(new Map());
  const [vehicleIdMap, setVehicleIdMap] = useState<Map<string, string>>(new Map());
  const [suggestedKitsByVehicle, setSuggestedKitsByVehicle] = useState<Map<string, HomologationKit[]>>(new Map());
  const [configurationsByVehicle, setConfigurationsByVehicle] = useState<Map<string, string>>(new Map());
  const [homologatedAccessories, setHomologatedAccessories] = useState<KitItemOption[]>([]);
  const [isLoadingAccessories, setIsLoadingAccessories] = useState(false);
  
  // State for the scheduling form modal
  const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false);
  const [pendingVehicleData, setPendingVehicleData] = useState<PendingVehicleData | null>(null);
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  // Fetch homologated accessories from kit_item_options (synced with homologation section)
  useEffect(() => {
    const loadHomologatedAccessories = async () => {
      try {
        const accessories = await fetchKitItemOptions('accessory');
        setHomologatedAccessories(accessories);
        console.log('Loaded homologated accessories:', accessories.length);
      } catch (error) {
        console.error('Error loading homologated accessories:', error);
      }
    };
    
    if (isOpen) {
      loadHomologatedAccessories();
    }
  }, [isOpen]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicles: []
    }
  });

  // Sync selectedCustomer when initialCustomer prop changes
  useEffect(() => {
    if (initialCustomer) {
      setSelectedCustomer(initialCustomer);
    }
  }, [initialCustomer]);

  // Initialize vehicle schedules when customer is selected
  useEffect(() => {
    console.log('Customer selected:', selectedCustomer);
    console.log('Customer vehicles:', selectedCustomer?.vehicles);

    if (!selectedCustomer) {
      setVehicleSchedules([]);
      setAccessoriesByVehicleId(new Map());
      setIsLoadingAccessories(false);
      form.reset({ vehicles: [] });
      return;
    }

    // Check if customer has vehicles
    if (!selectedCustomer.vehicles || selectedCustomer.vehicles.length === 0) {
      console.warn('Customer has no vehicles registered');
      toastHook({
        title: "Aviso",
        description: "Este cliente não possui veículos cadastrados. Por favor, adicione veículos ao cliente antes de agendar.",
        variant: "destructive"
      });
      setVehicleSchedules([]);
      form.reset({ vehicles: [] });
      return;
    }

    // Filter out vehicles that already have active schedules
    const scheduledPlates = existingSchedules
      .filter(s => s.customer_id === selectedCustomer.id && ['scheduled', 'in_progress'].includes(s.status))
      .map(s => s.vehicle_plate);
    
    const unscheduledVehicles = selectedCustomer.vehicles.filter(
      vehicle => !scheduledPlates.includes(vehicle.plate)
    );

    console.log('Scheduled plates:', scheduledPlates);
    console.log('Unscheduled vehicles:', unscheduledVehicles);

    if (unscheduledVehicles.length === 0) {
      toastHook({
        title: "Aviso",
        description: "Todos os veículos deste cliente já possuem agendamentos ativos.",
        variant: "default"
      });
      setVehicleSchedules([]);
      form.reset({ vehicles: [] });
      return;
    }

    // Initialize schedules with EMPTY dates - manual input required
    const initialSchedules = unscheduledVehicles.map((vehicle, index) => ({
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      technician_ids: [],
      scheduled_date: null,
      installation_time: '',
      notes: `Veículo: ${vehicle.brand} ${vehicle.model} (${vehicle.year}) - Placa: ${vehicle.plate}`,
      // Per-placa accessories from customer (módulos não são considerados)
      accessories: [...(selectedCustomer.accessories || [])],
      modules: [], // Módulos não são mais utilizados
      selected_kit_ids: [] // Nenhum kit selecionado inicialmente
    }));

    console.log('Initial schedules created:', initialSchedules);
    setVehicleSchedules(initialSchedules);
    form.reset({ vehicles: initialSchedules });

    // ID-first: Resolve incoming_vehicle_id for each vehicle and fetch accessories
    if (selectedCustomer) {
      setIsLoadingAccessories(true);
      (async () => {
        try {
          const vehicleIdMapping = new Map<string, string>();
          const resolvedIds: string[] = [];

          for (const v of unscheduledVehicles) {
            const vehicleId = await resolveIncomingVehicleId(
              selectedCustomer.company_name,
              selectedCustomer.sale_summary_id,
              {
                plate: v.plate,
                brand: v.brand,
                model: v.model,
                year: v.year
              }
            );

            if (vehicleId) {
              const key = `${v.brand}-${v.model}-${v.plate || 'pending'}`;
              vehicleIdMapping.set(key, vehicleId);
              resolvedIds.push(vehicleId);
            }
          }

          setVehicleIdMap(vehicleIdMapping);

          // Fetch accessories, modules, and configurations by resolved IDs
          if (resolvedIds.length > 0) {
            const accessoriesMap = await fetchAccessoriesByVehicleIds(resolvedIds);
            const formattedMap = new Map<string, string[]>();
            const modulesMap = new Map<string, string[]>();
            const configurationsMap = new Map<string, string>();
            const usageTypesMap = new Map<string, string>();

            // Extract modules for each vehicle
            accessoriesMap.forEach((accessories, vehicleId) => {
              modulesMap.set(vehicleId, aggregateModulesOnly(accessories));
            });
            setModulesByVehicleId(modulesMap);

            // Fetch configurations and usage_type for each vehicle
            for (const [key, vehicleId] of vehicleIdMapping.entries()) {
              const plate = key.split('-').pop()?.replace('pending', '') || '';
              
              // Fetch homologation configuration
              const { data: homologationData } = await supabase
                .from('homologation_cards')
                .select('configuration')
                .eq('incoming_vehicle_id', vehicleId)
                .eq('status', 'homologado')
                .single();
              
              if (homologationData?.configuration) {
                configurationsMap.set(plate, homologationData.configuration);
              }

              // Fetch usage_type from incoming_vehicles
              const { data: incomingVehicleData } = await supabase
                .from('incoming_vehicles')
                .select('usage_type')
                .eq('id', vehicleId)
                .single();
              
              if (incomingVehicleData?.usage_type) {
                usageTypesMap.set(plate, incomingVehicleData.usage_type);
              }
            }

            setConfigurationsByVehicle(configurationsMap);
            setUsageTypeByVehicle(usageTypesMap);

            accessoriesMap.forEach((accessories, vehicleId) => {
              formattedMap.set(vehicleId, aggregateAccessoriesWithoutModules(accessories));
            });

            setAccessoriesByVehicleId(formattedMap);

            // Update vehicle schedules with accessories and suggest kits
            setVehicleSchedules(prev => {
              const updated = prev.map(s => {
                const key = `${s.brand}-${s.model}-${s.plate || 'pending'}`;
                const vehicleId = vehicleIdMapping.get(key);
                if (vehicleId) {
                  const accessories = formattedMap.get(vehicleId) || [];
                  return { ...s, accessories };
                }
                return s;
              });
              form.setValue('vehicles', updated);
              return updated;
            });

            // Calcular kits sugeridos para cada veículo baseado nos acessórios e tipo de uso
            const suggestedKitsMap = new Map<string, HomologationKit[]>();
            for (const v of unscheduledVehicles) {
              const key = `${v.brand}-${v.model}-${v.plate || 'pending'}`;
              const vehicleId = vehicleIdMapping.get(key);
              if (vehicleId) {
                const vehicleAccessories = formattedMap.get(vehicleId) || [];
                const usageType = usageTypesMap.get(v.plate);
                const matchedKits = matchKitsToAccessories(vehicleAccessories, kits, usageType);
                suggestedKitsMap.set(v.plate, matchedKits);
              }
            }
            setSuggestedKitsByVehicle(suggestedKitsMap);
          }
        } catch (error) {
          console.error('Error loading accessories by vehicle IDs:', error);
        } finally {
          setIsLoadingAccessories(false);
        }
      })();
    }

    // 2) Fire-and-forget: check homologation in background and update icons
    (async () => {
      try {
        const statusMap = new Map<string, boolean>();
        
        // Check accessories from customer (módulos não são mais considerados)
        const allItems = [
          ...(selectedCustomer.accessories || []).map(name => ({ name, type: 'accessory' }))
        ];
        
        await Promise.all(
          allItems.map(async (item) => {
            const normalizedName = normalizeName(item.name);
            const ok = await checkItemHomologation(normalizedName, item.type);
            statusMap.set(`${normalizedName}:${item.type}`, ok);
          })
        );
        
        // Check overall homologation status for each unscheduled vehicle
        const scheduledPlates = existingSchedules
          .filter(s => s.customer_id === selectedCustomer.id && ['scheduled', 'in_progress'].includes(s.status))
          .map(s => s.vehicle_plate);
        
        const unscheduledVehicles = selectedCustomer.vehicles?.filter(
          vehicle => !scheduledPlates.includes(vehicle.plate)
        ) || [];
        
        // Check vehicle-specific accessories from the accessories table
        for (const vehicle of unscheduledVehicles) {
          // Resolve incoming_vehicle_id
          const vehicleId = await resolveIncomingVehicleId(
            selectedCustomer.company_name,
            selectedCustomer.sale_summary_id,
            {
              plate: vehicle.plate,
              brand: vehicle.brand,
              model: vehicle.model,
              year: vehicle.year
            }
          );

          // Fetch vehicle-specific accessories from accessories table (excluindo módulos)
          let vehicleSpecificAccessories: string[] = [];
          if (vehicleId) {
            const { data: vehicleAccessories } = await supabase
              .from('accessories')
              .select('name, categories')
              .eq('vehicle_id', vehicleId);

            // Filtrar módulos usando categories E nome conhecido
            vehicleSpecificAccessories = (vehicleAccessories || [])
              .filter(a => !isModuleCategory(a.categories) && !isModule(a.name))
              .map(a => a.name);

            // Check homologation for vehicle-specific accessories (normalized)
            await Promise.all(
              vehicleSpecificAccessories.map(async (accName) => {
                const normalizedName = normalizeName(accName);
                const ok = await checkItemHomologation(normalizedName, 'accessory');
                statusMap.set(`${normalizedName}:accessory`, ok);
              })
            );
          }

          // Combine customer and vehicle-specific accessories (normalized for checking)
          // Filtrar módulos dos acessórios do cliente
          const customerAccessoriesFiltered = (selectedCustomer.accessories || [])
            .filter(acc => !isModule(acc))
            .map(normalizeName);
          
          const vehicleAccessories = [
            ...customerAccessoriesFiltered, 
            ...vehicleSpecificAccessories.map(normalizeName)
          ];
          
          // Se não há acessórios, considera pronto
          // Acessórios selecionados da lista de homologados são automaticamente OK
          const allAccessoriesHomologated = vehicleAccessories.length === 0 ? true : 
            vehicleAccessories.every(acc => {
              const status = statusMap.get(`${acc}:accessory`);
              // Se ainda não foi verificado (undefined), considera não pronto
              return status === true;
            });
          
          console.log('🔍 Vehicle homologation check:', {
            plate: vehicle.plate,
            vehicleAccessories,
            statusMapEntries: Array.from(statusMap.entries()),
            allAccessoriesHomologated
          });
          
          // Veículo é considerado pronto se todos os acessórios estão homologados
          // OU se os acessórios selecionados vêm da lista de kit_item_options (já homologados)
          const vehicleReady = allAccessoriesHomologated;
          statusMap.set(`vehicle-ready:${vehicle.plate}`, vehicleReady);
        }
        
        setHomologationStatus(statusMap);
      } catch (e) {
        console.warn('Falha ao checar homologação de itens:', e);
      }
    })();
  }, [selectedCustomer, homologationStatuses, form, toast]);

  const updateVehicleSchedule = async (plate: string, field: keyof VehicleScheduleData, value: any) => {
    const updatedSchedules = vehicleSchedules.map(schedule => 
      schedule.plate === plate ? { ...schedule, [field]: value } : schedule
    );
    setVehicleSchedules(updatedSchedules);
    form.setValue('vehicles', updatedSchedules);

    // Check for conflicts when technician, date or time changes
    if (field === 'technician_ids' || field === 'scheduled_date' || field === 'installation_time') {
      const schedule = updatedSchedules.find(s => s.plate === plate);
      if (schedule && schedule.technician_ids.length > 0 && schedule.scheduled_date) {
        await checkVehicleConflicts(schedule);
      }
    }
    
    // Recalculate vehicle-ready status when accessories change
    if (field === 'accessories') {
      const newAccessories = value as string[];
      // Check if all selected accessories are from the homologated list
      const allHomologated = newAccessories.length === 0 ? true : newAccessories.every(acc => {
        const normalizedAcc = normalizeName(acc);
        return homologatedAccessories.some(ha => normalizeName(ha.item_name) === normalizedAcc);
      });
      
      setHomologationStatus(prev => {
        const newMap = new Map(prev);
        // Update individual accessory statuses
        newAccessories.forEach(acc => {
          const normalizedAcc = normalizeName(acc);
          const isHomologated = homologatedAccessories.some(ha => normalizeName(ha.item_name) === normalizedAcc);
          newMap.set(`${normalizedAcc}:accessory`, isHomologated);
        });
        // Update vehicle-ready status
        newMap.set(`vehicle-ready:${plate}`, allHomologated);
        return newMap;
      });
    }
  };

  // Função para buscar configuração baseada no modelo do veículo e modelo do rastreador
  const findConfigurationForVehicleAndTracker = async (
    vehicleBrand: string,
    vehicleModel: string,
    trackerModel: string
  ): Promise<string | null> => {
    try {
      console.log('🔍 Buscando configuração para:', { vehicleBrand, vehicleModel, trackerModel });
      
      // Normalizar a marca para busca mais flexível
      // Ex: "VW - VolksWagen" -> tentar "VW", "VOLKSWAGEN", etc.
      const brandNormalized = vehicleBrand.toUpperCase()
        .replace(/\s*-\s*/g, ' ')
        .replace(/[^\w\s]/g, '')
        .trim();
      
      // Extrair primeira palavra significativa do modelo para match parcial
      const modelFirstWord = vehicleModel.split(' ')[0].toUpperCase();
      
      // Tentar busca exata primeiro
      let { data, error } = await supabase
        .from('automation_rules_extended')
        .select('configuration, brand, model')
        .ilike('tracker_model', `%${trackerModel}%`)
        .limit(50);
      
      if (error) {
        console.error('Erro ao buscar configuração:', error);
        return null;
      }
      
      if (data && data.length > 0) {
        // Filtrar por marca (flexível) e modelo
        const brandKeywords = brandNormalized.split(' ').filter(w => w.length > 1);
        
        // Primeiro, tentar match exato de marca e modelo contém
        let match = data.find(rule => {
          const ruleBrand = rule.brand.toUpperCase();
          const ruleModel = rule.model.toUpperCase();
          const vehicleModelUpper = vehicleModel.toUpperCase();
          
          // Verificar se a marca bate (match parcial)
          const brandMatches = brandKeywords.some(keyword => 
            ruleBrand.includes(keyword) || keyword.includes(ruleBrand.split(' ')[0])
          );
          
          // Verificar se o modelo bate
          const modelMatches = ruleModel.includes(modelFirstWord) || 
                               vehicleModelUpper.includes(ruleModel.split(' ')[0]);
          
          return brandMatches && modelMatches;
        });
        
        // Se não encontrou, tentar match só pela primeira palavra do modelo
        if (!match) {
          match = data.find(rule => {
            const ruleModel = rule.model.toUpperCase();
            return ruleModel.includes(modelFirstWord);
          });
        }
        
        if (match?.configuration) {
          console.log('✅ Configuração encontrada:', match.configuration, 'para', match.brand, match.model);
          return match.configuration;
        }
      }
      
      console.log('⚠️ Nenhuma configuração encontrada para esta combinação');
      return null;
    } catch (error) {
      console.error('Erro ao buscar configuração:', error);
      return null;
    }
  };

  const toggleKitSelection = async (plate: string, kitId: string) => {
    const schedule = vehicleSchedules.find(s => s.plate === plate);
    if (!schedule) return;
    
    const currentSelection = schedule.selected_kit_ids || [];
    const isRemoving = currentSelection.includes(kitId);
    
    // Ao selecionar um kit, buscar configuração automaticamente
    if (!isRemoving) {
      const selectedKit = kits.find(k => k.id === kitId);
      // Pegar o modelo do rastreador do equipment do kit
      const trackerModel = selectedKit?.equipment?.[0]?.item_name;
      
      if (trackerModel) {
        const configuration = await findConfigurationForVehicleAndTracker(
          schedule.brand,
          schedule.model,
          trackerModel
        );
        
        if (configuration) {
          setConfigurationsByVehicle(prev => {
            const newMap = new Map(prev);
            newMap.set(plate, configuration);
            return newMap;
          });
          
          toastHook({
            title: "Configuração definida",
            description: `Configuração "${configuration}" aplicada para ${schedule.brand} ${schedule.model} com ${trackerModel}`,
          });
        }
      }
    }
    
    const updatedSchedules = vehicleSchedules.map(s => {
      if (s.plate === plate) {
        return {
          ...s,
          selected_kit_ids: isRemoving
            ? currentSelection.filter(id => id !== kitId)
            : [...currentSelection, kitId]
        };
      }
      return s;
    });
    
    setVehicleSchedules(updatedSchedules);
    form.setValue('vehicles', updatedSchedules);
  };

  const checkVehicleConflicts = async (schedule: VehicleScheduleData) => {
    const conflictKey = schedule.plate;
    
    if (schedule.technician_ids.length === 0 || !schedule.scheduled_date) {
      setScheduleConflicts(prev => {
        const newMap = new Map(prev);
        newMap.delete(conflictKey);
        return newMap;
      });
      return;
    }

    for (const technicianId of schedule.technician_ids) {
      const hasConflict = await checkScheduleConflict(
        technicianId,
        schedule.scheduled_date.toISOString().split('T')[0],
        schedule.installation_time || undefined
      );

      if (hasConflict) {
        const technician = technicians.find(t => t.id === technicianId);
        const conflictMsg = `⚠️ ${technician?.name || 'Este técnico'} já possui uma instalação agendada neste horário`;
        
        setScheduleConflicts(prev => {
          const newMap = new Map(prev);
          newMap.set(conflictKey, conflictMsg);
          return newMap;
        });
        return;
      }
    }

    // No conflicts found
    setScheduleConflicts(prev => {
      const newMap = new Map(prev);
      newMap.delete(conflictKey);
      return newMap;
    });
  };


  // Check if button should be enabled - requires kit selection for at least one vehicle
  const isButtonEnabled = () => {
    // Must have at least one vehicle with kit selected
    const hasVehicleWithKit = vehicleSchedules.some(vehicle => {
      const vehicleReady = homologationStatus.get(`vehicle-ready:${vehicle.plate}`);
      const hasKitSelected = vehicle.selected_kit_ids && vehicle.selected_kit_ids.length > 0;
      return vehicleReady && hasKitSelected;
    });
    
    return hasVehicleWithKit;
  };

  const onSubmit = async () => {
    if (!selectedCustomer) {
      toastHook({
        title: "Cliente obrigatório",
        description: "Selecione ou cadastre um cliente para continuar.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      let schedulesCreated = 0;
      let schedulesSkipped = 0;
      const skippedVehicles: string[] = [];

      // Process each vehicle schedule
      for (const vehicleSchedule of vehicleSchedules) {
        // Check if this vehicle is ready for scheduling (all items homologated) and has kit selected
        const vehicleReady = homologationStatus.get(`vehicle-ready:${vehicleSchedule.plate}`);
        const hasKitSelected = vehicleSchedule.selected_kit_ids && vehicleSchedule.selected_kit_ids.length > 0;
        
        // Skip vehicles that are not ready or don't have kit selected
        if (!vehicleReady || !hasKitSelected) {
          if (!vehicleReady) {
            schedulesSkipped++;
            skippedVehicles.push(vehicleSchedule.plate);
            console.log(`Skipping vehicle ${vehicleSchedule.plate} - not all items are homologated`);
          } else if (!hasKitSelected) {
            schedulesSkipped++;
            skippedVehicles.push(vehicleSchedule.plate);
            console.log(`Skipping vehicle ${vehicleSchedule.plate} - no kit selected`);
          }
          continue;
        }

        // Resolve incoming_vehicle_id for this vehicle
        const vehicleKey = `${vehicleSchedule.brand}-${vehicleSchedule.model}-${vehicleSchedule.plate || 'pending'}`;
        const incomingVehicleId = vehicleIdMap.get(vehicleKey);
        
        // Get configuration from homologation
        let vehicleConfiguration: string | undefined;
        if (incomingVehicleId) {
          const { data: homologationData } = await supabase
            .from('homologation_cards')
            .select('configuration')
            .eq('incoming_vehicle_id', incomingVehicleId)
            .eq('status', 'homologado')
            .single();
          
          if (homologationData?.configuration) {
            vehicleConfiguration = homologationData.configuration;
          }
        }

        // Get selected kit details to find tracker model
        let trackerModel = 'Ruptella Smart5'; // Default tracker
        if (vehicleSchedule.selected_kit_ids && vehicleSchedule.selected_kit_ids.length > 0) {
          const selectedKit = kits.find(k => vehicleSchedule.selected_kit_ids.includes(k.id!));
          if (selectedKit?.equipment && selectedKit.equipment.length > 0) {
            // Use first equipment as tracker
            trackerModel = selectedKit.equipment[0].item_name;
          }
        }

        // Create kit schedule with status 'scheduled' (appears in Kanban "Pedidos" column)
        await createKitSchedule({
          technician_id: vehicleSchedule.technician_ids[0] || technicians[0]?.id || '',
          scheduled_date: vehicleSchedule.scheduled_date 
            ? format(vehicleSchedule.scheduled_date, 'yyyy-MM-dd')
            : format(new Date(), 'yyyy-MM-dd'),
          installation_time: vehicleSchedule.installation_time || undefined,
          notes: vehicleSchedule.notes || '',
          configuration: vehicleConfiguration || configurationsByVehicle.get(vehicleSchedule.plate) || 'FMS250',
          selected_kit_ids: vehicleSchedule.selected_kit_ids,
          customer_id: selectedCustomer.id,
          customer_name: selectedCustomer.company_name || selectedCustomer.name,
          customer_document_number: selectedCustomer.document_number,
          customer_phone: selectedCustomer.phone,
          customer_email: selectedCustomer.email,
          installation_address_street: selectedCustomer.address_street,
          installation_address_number: selectedCustomer.address_number,
          installation_address_neighborhood: selectedCustomer.address_neighborhood,
          installation_address_city: selectedCustomer.address_city,
          installation_address_state: selectedCustomer.address_state,
          installation_address_postal_code: selectedCustomer.address_postal_code,
          installation_address_complement: selectedCustomer.address_complement || undefined,
          vehicle_plate: vehicleSchedule.plate,
          vehicle_brand: vehicleSchedule.brand,
          vehicle_model: vehicleSchedule.model,
          vehicle_year: vehicleSchedule.year,
          accessories: vehicleSchedule.accessories || [],
          incoming_vehicle_id: incomingVehicleId
        });
        
        schedulesCreated++;
      }

      // Show result toast
      if (schedulesCreated > 0 && schedulesSkipped > 0) {
        toastHook({
          title: "Enviado parcialmente para esteira",
          description: `${schedulesCreated} veículo(s) enviado(s) para a esteira de pedidos. ${schedulesSkipped} veículo(s) ignorado(s): ${skippedVehicles.join(', ')}.`,
          variant: "default"
        });
      } else if (schedulesCreated > 0) {
        toastHook({
          title: "Enviado para esteira de pedidos",
          description: `${schedulesCreated} veículo(s) de ${selectedCustomer.name} enviado(s) para a esteira de pedidos.`
        });
      } else if (schedulesSkipped > 0) {
        toastHook({
          title: "Nenhum veículo enviado",
          description: `Todos os ${schedulesSkipped} veículo(s) precisam ter kit selecionado ou estão aguardando homologação: ${skippedVehicles.join(', ')}.`,
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      if (schedulesCreated === 0) {
        toastHook({
          title: "Nenhum veículo enviado",
          description: "Selecione pelo menos um kit para os veículos prontos para enviar à esteira.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch (error) {
      console.error('Error sending to order pipeline:', error);
      toastHook({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao enviar para esteira de pedidos",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedCustomer(null);
    setVehicleSchedules([]);
    setHomologationStatus(new Map());
    setScheduleConflicts(new Map());
    onClose();
  };

  // Generate time slots
  const timeSlots = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="w-full max-w-[95vw] xl:max-w-[90vw] 2xl:max-w-[85vw] h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Novo Agendamento de Instalação</DialogTitle>
          <DialogDescription>
            Selecione o cliente, escolha os kits para cada veículo e envie para a esteira de pedidos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Customer Information */}
          {selectedCustomer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informações do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Customer Info */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nome</p>
                  <p className="font-semibold">{selectedCustomer.name}</p>
                </div>


                {/* Vehicles */}
                {selectedCustomer.vehicles && selectedCustomer.vehicles.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="w-4 h-4" />
                      <span className="text-sm font-medium text-muted-foreground">Veículos</span>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                        {selectedCustomer.vehicles.map((vehicle, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <p className="font-medium">{vehicle.brand} {vehicle.model}</p>
                             <p className="text-sm text-muted-foreground">
                               Ano: {vehicle.year} | Placa: {vehicle.plate}
                             </p>
                          </div>
                        ))}
                     </div>
                  </div>
                )}

                {/* Accessories */}
                {selectedCustomer.accessories && selectedCustomer.accessories.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4" />
                      <span className="text-sm font-medium text-muted-foreground">Acessórios</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedCustomer.accessories.map((accessory, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {accessory}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insumos */}
                {selectedCustomer.modules && selectedCustomer.modules.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4" />
                      <span className="text-sm font-medium text-muted-foreground">Insumos</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedCustomer.modules.map((module, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {module}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Customer Section - Show when no customer is selected */}
          {!selectedCustomer && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Cliente</h3>
              
              <CustomerSelector
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
              />
            </div>
          )}

          {/* Warning message when no vehicles */}
          {selectedCustomer && (!selectedCustomer.vehicles || selectedCustomer.vehicles.length === 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-semibold">Cliente sem veículos cadastrados</span>
              </div>
              <p className="text-sm text-yellow-700 mt-2">
                Este cliente não possui veículos cadastrados. Por favor, edite o cliente e adicione veículos antes de criar um agendamento.
              </p>
            </div>
          )}

          {/* Vehicle Schedules */}
          {selectedCustomer && selectedCustomer.vehicles && selectedCustomer.vehicles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Detalhes da Instalação por Veículo</h3>
              
              <div className="space-y-6">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Modelo</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Placa</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Ano</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Tipo</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Técnico</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Previsão de Instalação</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Configuração</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Produto</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Acessórios</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Kit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vehicleSchedules.map((vehicleSchedule, index) => {
                            const vehicleReady = homologationStatus.get(`vehicle-ready:${vehicleSchedule.plate}`);
                            const hasConflict = scheduleConflicts.has(vehicleSchedule.plate);
                            return (
                            <>
                            <tr key={vehicleSchedule.plate} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                              <td className="px-4 py-3">
                                {hasConflict ? (
                                  <Badge className="bg-red-100 text-red-800 border-red-300">
                                    <X className="w-3 h-3 mr-1" />
                                    Conflito
                                  </Badge>
                                ) : vehicleReady ? (
                                  <Badge className="bg-green-100 text-green-800 border-green-300">
                                    <Check className="w-3 h-3 mr-1" />
                                    Pronto
                                  </Badge>
                                ) : (
                                  <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                                    <X className="w-3 h-3 mr-1" />
                                    Pendente
                                  </Badge>
                                 )}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {vehicleSchedule.brand} {vehicleSchedule.model}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="secondary">{vehicleSchedule.plate}</Badge>
                              </td>
                              <td className="px-4 py-3 text-sm">{vehicleSchedule.year}</td>
                              <td className="px-4 py-3 text-sm">
                                {(() => {
                                  const usageType = usageTypeByVehicle.get(vehicleSchedule.plate);
                                  if (!usageType) return <span className="text-muted-foreground">-</span>;
                                  
                                  // Format usage type for display
                                  const formatUsageType = (type: string): { label: string; variant: 'default' | 'secondary' | 'outline' } => {
                                    switch (type) {
                                      case 'telemetria_gps':
                                        return { label: 'Telemetria GPS', variant: 'default' };
                                      case 'telemetria_can':
                                        return { label: 'Telemetria CAN', variant: 'default' };
                                      case 'copiloto_2_cameras':
                                        return { label: 'Copiloto 2 Câmeras', variant: 'secondary' };
                                      case 'copiloto_4_cameras':
                                        return { label: 'Copiloto 4 Câmeras', variant: 'secondary' };
                                      case 'particular':
                                        return { label: 'Particular', variant: 'outline' };
                                      case 'comercial':
                                        return { label: 'Comercial', variant: 'outline' };
                                      case 'frota':
                                        return { label: 'Frota', variant: 'outline' };
                                      default:
                                        return { label: type, variant: 'outline' };
                                    }
                                  };
                                  
                                  const { label, variant } = formatUsageType(usageType);
                                  return <Badge variant={variant}>{label}</Badge>;
                                })()}
                              </td>
                              <td className="px-4 py-3">
                                <Select
                                  value={vehicleSchedule.technician_ids?.[0] || ''}
                                  onValueChange={(value) => {
                                    setVehicleSchedules(prev => prev.map(vs =>
                                      vs.plate === vehicleSchedule.plate
                                        ? { ...vs, technician_ids: [value] }
                                        : vs
                                    ));
                                  }}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Selecionar técnico" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {technicians.map((tech) => (
                                      <SelectItem key={tech.id} value={tech.id}>
                                        {tech.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="date"
                                  value={vehicleSchedule.scheduled_date ? format(vehicleSchedule.scheduled_date, 'yyyy-MM-dd') : ''}
                                  onChange={(e) => {
                                    const dateValue = e.target.value ? new Date(e.target.value + 'T12:00:00') : null;
                                    setVehicleSchedules(prev => prev.map(vs =>
                                      vs.plate === vehicleSchedule.plate
                                        ? { ...vs, scheduled_date: dateValue }
                                        : vs
                                    ));
                                  }}
                                  className="w-[150px]"
                                />
                              </td>
                              <td className="px-4 py-3">
                                 {(() => {
                                   const vehicleConfiguration = configurationsByVehicle.get(vehicleSchedule.plate);
                                   if (vehicleConfiguration) {
                                     return (
                                       <div className="p-2 bg-purple-100 border border-purple-300 rounded-lg min-w-[150px]">
                                         <div className="flex items-center gap-2">
                                           <Cpu className="h-4 w-4 text-purple-700 flex-shrink-0" />
                                           <div className="flex flex-col">
                                             <span className="text-xs text-purple-600 font-medium">Configuração:</span>
                                             <span className="text-xs text-purple-900 font-semibold">{vehicleConfiguration}</span>
                                           </div>
                                         </div>
                                       </div>
                                     );
                                   } else {
                                     return <span className="text-xs text-muted-foreground">N/A</span>;
                                   }
                                 })()}
                              </td>
                              <td className="px-4 py-3">
                                {(() => {
                                  const key = `${vehicleSchedule.brand}-${vehicleSchedule.model}-${vehicleSchedule.plate || 'pending'}`;
                                  const vehicleId = vehicleIdMap.get(key);
                                  const modules = vehicleId ? modulesByVehicleId.get(vehicleId) || [] : [];
                                  
                                  if (modules.length === 0) {
                                    return (
                                      <span className="text-xs text-muted-foreground">Nenhum módulo</span>
                                    );
                                  }
                                  
                                  return (
                                    <div className="flex flex-col gap-1 min-w-[150px]">
                                      {modules.map((mod, idx) => (
                                        <div key={idx} className="p-1.5 bg-purple-50 border border-purple-200 rounded text-xs text-purple-900">
                                          {cleanItemName(mod)}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </td>
              <td className="px-4 py-3">
                                <div className="flex flex-col gap-2 max-w-[220px]">
                                  {(() => {
                                    const key = `${vehicleSchedule.brand}-${vehicleSchedule.model}-${vehicleSchedule.plate || 'pending'}`;
                                    const vehicleId = vehicleIdMap.get(key);
                                    const formattedAccessories = vehicleId ? accessoriesByVehicleId.get(vehicleId) || [] : [];
                                    const currentAccessories = vehicleSchedule.accessories || [];
                                    
                                    // Merge vehicle accessories with selected accessories
                                    const allAccessories = [...new Set([...formattedAccessories, ...currentAccessories])];
                                    
                                    return (
                                      <>
                                        {/* Current/Selected Accessories */}
                                        {allAccessories.length > 0 && (
                                          <div className="flex flex-col gap-1">
                                            {allAccessories.map((formatted, i) => {
                                              const normalizedName = normalizeName(formatted);
                                              const isHomologated = homologationStatus.get(`${normalizedName}:accessory`) ?? 
                                                homologatedAccessories.some(ha => isSimilarAccessoryName(formatted, ha.item_name));
                                              return (
                                                <div key={i} className="flex items-center gap-1">
                                                  {isHomologated ? (
                                                    <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                                                  ) : (
                                                    <X className="h-3 w-3 text-red-600 flex-shrink-0" />
                                                  )}
                                                  <span className={cn(
                                                    "text-xs",
                                                    isHomologated ? "text-green-700" : "text-red-700"
                                                  )}>
                                                    {formatted}
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                        
                                        {allAccessories.length === 0 && !isLoadingAccessories && (
                                          <span className="text-xs text-muted-foreground">Nenhum acessório</span>
                                        )}
                                        
                                        {isLoadingAccessories && (
                                          <span className="text-xs text-muted-foreground animate-pulse">Carregando...</span>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </td>
                                <td className="px-4 py-3">
                                  {(() => {
                                    const suggestedKits = suggestedKitsByVehicle.get(vehicleSchedule.plate) || [];
                                    const selectedKitIds = vehicleSchedule.selected_kit_ids || [];
                                    const selectedKits = kits.filter(k => selectedKitIds.includes(k.id!));
                                    
                                    if (suggestedKits.length === 0) {
                                      return <span className="text-xs text-muted-foreground">Nenhum kit compatível</span>;
                                    }
                                    
                                    return (
                                      <div className="flex flex-col gap-2">
                                        {/* Selected Kits Display */}
                                        {selectedKits.length > 0 && (
                                          <div className="space-y-2">
                                            {selectedKits.map((kit) => (
                                              <div key={kit.id} className="border border-blue-400 bg-blue-50 rounded-lg p-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                  <p className="font-semibold text-sm text-blue-900">{kit.name}</p>
                                                  <Badge className="bg-blue-600 text-white text-xs">Selecionado</Badge>
                                                </div>
                                                
                                                {/* Equipment */}
                                                {kit.equipment && kit.equipment.length > 0 && (
                                                  <div className="space-y-1">
                                                    <p className="text-xs font-medium text-gray-700">Equipamentos:</p>
                                                    <div className="flex flex-wrap gap-1">
                                                      {kit.equipment.map((item, idx) => (
                                                        <Badge key={idx} variant="outline" className="text-xs bg-white">
                                                          {cleanItemName(item.item_name)} ({item.quantity}x)
                                                        </Badge>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                                
                                                {/* Accessories */}
                                                {kit.accessories && kit.accessories.length > 0 && (
                                                  <div className="space-y-1">
                                                    <p className="text-xs font-medium text-gray-700">Acessórios:</p>
                                                    <div className="flex flex-wrap gap-1">
                                                      {kit.accessories.map((item, idx) => (
                                                        <Badge key={idx} variant="outline" className="text-xs bg-white">
                                                          {cleanItemName(item.item_name)} ({item.quantity}x)
                                                        </Badge>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                                
                                                {/* Supplies */}
                                                {kit.supplies && kit.supplies.length > 0 && (
                                                  <div className="space-y-1">
                                                    <p className="text-xs font-medium text-gray-700">Insumos:</p>
                                                    <div className="flex flex-wrap gap-1">
                                                      {kit.supplies.map((item, idx) => (
                                                        <Badge key={idx} variant="outline" className="text-xs bg-white">
                                                          {cleanItemName(item.item_name)} ({item.quantity}x)
                                                        </Badge>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {/* Select Kits Button */}
                                        <Popover>
                                         <PopoverTrigger asChild>
                                           <Button
                                             variant="outline"
                                             size="sm"
                                             className="h-auto py-2 px-3 flex items-center gap-2 w-full"
                                           >
                                             <Package className="h-4 w-4" />
                                             <div className="flex flex-col items-start flex-1">
                                               <span className="text-xs font-medium">
                                                 Selecionar Kits
                                               </span>
                                               {selectedKitIds.length > 0 && (
                                                 <span className="text-xs text-muted-foreground">
                                                   {selectedKitIds.length} selecionado{selectedKitIds.length > 1 ? 's' : ''}
                                                 </span>
                                               )}
                                             </div>
                                           </Button>
                                         </PopoverTrigger>
                                          <PopoverContent 
                                            className="w-[90vw] max-w-[500px] p-0 max-h-[80vh] flex flex-col z-50" 
                                            align="center" 
                                            side="left"
                                            sideOffset={10}
                                            avoidCollisions={true}
                                            collisionPadding={20}
                                          >
                                           <div className="flex flex-col min-h-0 flex-1">
                                             <div className="px-4 pt-4 pb-3 border-b">
                                               <h4 className="font-semibold flex items-center gap-2">
                                                 <Package className="h-4 w-4" />
                                                 Selecionar Kits
                                               </h4>
                                             </div>

                                             <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
                                             {suggestedKits.map((kit) => {
                                               const status = homologationStatuses.get(kit.id!);
                                               const isHomologated = status?.isHomologated ?? false;
                                               const isSelected = selectedKitIds.includes(kit.id!);
                                               const key = `${vehicleSchedule.brand}-${vehicleSchedule.model}-${vehicleSchedule.plate || 'pending'}`;
                                               const vehicleId = vehicleIdMap.get(key);
                                               const vehicleAccessories = vehicleId ? accessoriesByVehicleId.get(vehicleId) || [] : [];
                                               
                                               // Calcular itens compatíveis
                                               const relevantKitItems = kit.accessories
                                                 .filter(a => {
                                                   const itemLower = a.item_name.toLowerCase();
                                                   return !itemLower.includes('fita') &&
                                                          !itemLower.includes('abraçadeira') &&
                                                          !itemLower.includes('abracadeira') &&
                                                          !itemLower.includes('parafuso') &&
                                                          !itemLower.includes('porca');
                                                 })
                                                 .map(a => a.item_name);
                                               
                                               const matchedItems: string[] = [];
                                               const unmatchedItems: string[] = [];
                                               
                                               for (const kitItem of relevantKitItems) {
                                                 let found = false;
                                                 for (const vehicleAcc of vehicleAccessories) {
                                                   if (isSimilarItem(kitItem, normalizeName(vehicleAcc))) {
                                                     matchedItems.push(kitItem);
                                                     found = true;
                                                     break;
                                                   }
                                                 }
                                                 if (!found) {
                                                   unmatchedItems.push(kitItem);
                                                 }
                                               }
                                               
                                               return (
                                                 <div
                                                   key={kit.id}
                                                   className={cn(
                                                     "border rounded-lg p-3 space-y-2 cursor-pointer transition-all",
                                                     isSelected ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200' : 'bg-background hover:bg-muted/50'
                                                   )}
                                                   onClick={() => toggleKitSelection(vehicleSchedule.plate, kit.id!)}
                                                 >
                                                   <div className="flex items-start justify-between gap-2">
                                                     <div className="flex items-start gap-2 flex-1">
                                                       <input
                                                         type="checkbox"
                                                         checked={isSelected}
                                                         onChange={(e) => {
                                                           e.stopPropagation();
                                                           toggleKitSelection(vehicleSchedule.plate, kit.id!);
                                                         }}
                                                         className="mt-1 h-4 w-4 rounded border-gray-300"
                                                       />
                                                       <div className="flex-1">
                                                         <p className="font-medium text-sm">
                                                           {kit.name}
                                                         </p>
                                                       </div>
                                                     </div>
                                                     <div className="flex flex-col gap-1 items-end">
                                                       <Badge 
                                                         variant={isHomologated ? "default" : "destructive"}
                                                         className={cn(
                                                           "shrink-0 text-xs",
                                                           isHomologated ? "bg-green-600 text-white" : ""
                                                         )}
                                                       >
                                                         {isHomologated ? 'Homologado' : 'Pendente'}
                                                       </Badge>
                                                     </div>
                                                   </div>



                                                   {/* Itens não homologados */}
                                                   {status && !isHomologated && (
                                                     <>
                                                       {(() => {
                                                         const allPendingItems = [
                                                           ...status.pendingItems.equipment.map(i => i.item_name),
                                                           ...status.pendingItems.accessories.map(i => i.item_name),
                                                           ...status.pendingItems.supplies.map(i => i.item_name)
                                                         ];
                                                         
                                                         if (allPendingItems.length === 0) return null;
                                                         
                                                         return (
                                                           <div className="ml-6 space-y-1 pt-2 border-t">
                                                             <div className="flex items-center gap-1 text-xs text-red-600">
                                                               <X className="h-3 w-3" />
                                                               <span className="font-medium">
                                                                 Itens não homologados ({allPendingItems.length}):
                                                               </span>
                                                             </div>
                                                             <div className="flex gap-1 flex-wrap">
                                                               {allPendingItems.slice(0, 3).map((item, idx) => (
                                                                 <Badge key={idx} variant="outline" className="text-xs bg-red-100 text-red-700 border-red-300">
                                                                   {item}
                                                                 </Badge>
                                                               ))}
                                                               {allPendingItems.length > 3 && (
                                                                 <Badge variant="outline" className="text-xs">
                                                                   +{allPendingItems.length - 3}
                                                                 </Badge>
                                                               )}
                                                             </div>
                                                           </div>
                                                         );
                                                       })()}
                                                     </>
                                                    )}

                                                    {/* Conteúdo completo do kit: equipamentos, acessórios e insumos */}
                                                    <div className="ml-6 space-y-2 pt-2 border-t">
                                                      <div className="text-xs font-semibold text-gray-700">Conteúdo completo do kit:</div>
                                                      <div className="grid grid-cols-1 gap-2">
                                                        {kit.equipment && kit.equipment.length > 0 && (
                                                          <div>
                                                            <div className="text-xs text-gray-600 font-medium mb-1">Equipamentos ({kit.equipment.length})</div>
                                                            <div className="flex flex-wrap gap-1">
                                                              {kit.equipment.map((eq, idx) => (
                                                                <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                                                  {eq.item_name}{eq.quantity ? ` (${eq.quantity}x)` : ''}
                                                                </Badge>
                                                              ))}
                                                            </div>
                                                          </div>
                                                        )}
                                                        {kit.accessories && kit.accessories.length > 0 && (
                                                          <div>
                                                            <div className="text-xs text-gray-600 font-medium mb-1">Acessórios ({kit.accessories.length})</div>
                                                            <div className="flex flex-wrap gap-1">
                                                              {kit.accessories.map((acc, idx) => (
                                                                <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700">
                                                                  {acc.item_name}{acc.quantity ? ` (${acc.quantity}x)` : ''}
                                                                </Badge>
                                                              ))}
                                                            </div>
                                                          </div>
                                                        )}
                                                        {kit.supplies && kit.supplies.length > 0 && (
                                                          <div>
                                                            <div className="text-xs text-gray-600 font-medium mb-1">Insumos ({kit.supplies.length})</div>
                                                            <div className="flex flex-wrap gap-1">
                                                              {kit.supplies.map((sup, idx) => (
                                                                <Badge key={idx} variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                                                                  {sup.item_name}{sup.quantity ? ` (${sup.quantity}x)` : ''}
                                                                </Badge>
                                                              ))}
                                                            </div>
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                 </div>
                                               );
                                              })}
                                             </div>
                                           </div>
                                         </PopoverContent>
                                      </Popover>
                                    </div>
                                    );
                                  })()}
                               </td>
                             </tr>
                              {!vehicleReady && (
                                <tr>
                                  <td colSpan={9} className="px-4 py-2">
                                    {(() => {
                                      const vehicleKey = `${vehicleSchedule.brand}-${vehicleSchedule.model}-${vehicleSchedule.plate || 'pending'}`;
                                      const vehicleId = vehicleIdMap.get(vehicleKey);
                                      const vehicleAccessories = vehicleId ? accessoriesByVehicleId.get(vehicleId) || [] : [];
                                      
                                      // Use Map to aggregate quantities by normalized name
                                      const nonHomologatedMap = new Map<string, number>();

                                      // Process vehicle-specific accessories (from accessories table)
                                      vehicleAccessories.forEach(formatted => {
                                        const normalizedName = normalizeName(formatted);
                                        const quantity = extractQuantity(formatted);
                                        const isHomologated = homologationStatus.get(`${normalizedName}:accessory`) ?? 
                                          homologatedAccessories.some(ha => isSimilarAccessoryName(formatted, ha.item_name));
                                        
                                        if (!isHomologated) {
                                          const currentQty = nonHomologatedMap.get(normalizedName) || 0;
                                          nonHomologatedMap.set(normalizedName, currentQty + quantity);
                                        }
                                      });

                                      // Process customer accessories (only if not already in map from vehicle)
                                      (vehicleSchedule.accessories || []).forEach(acc => {
                                        const normalizedName = normalizeName(acc);
                                        const isHomologated = homologationStatus.get(`${normalizedName}:accessory`) ?? 
                                          homologatedAccessories.some(ha => isSimilarAccessoryName(acc, ha.item_name));
                                        
                                        if (!isHomologated && !nonHomologatedMap.has(normalizedName)) {
                                          nonHomologatedMap.set(normalizedName, 1);
                                        }
                                      });

                                      // Process modules (equipment)
                                      (vehicleSchedule.modules || []).forEach(mod => {
                                        const normalizedName = normalizeName(mod);
                                        const isHomologated = homologationStatus.get(`${normalizedName}:equipment`) ?? 
                                          homologatedAccessories.some(ha => isSimilarAccessoryName(mod, ha.item_name));
                                        
                                        if (!isHomologated && !nonHomologatedMap.has(normalizedName)) {
                                          nonHomologatedMap.set(normalizedName, 1);
                                        }
                                      });

                                      // Convert map to display array
                                      const nonHomologatedItems = Array.from(nonHomologatedMap.entries())
                                        .map(([name, qty]) => qty > 1 ? `${name} (${qty}x)` : name);

                                      if (nonHomologatedItems.length > 0) {
                                        return (
                                          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                            <p className="text-xs font-medium text-red-800 mb-2">
                                              ⚠️ Itens não homologados ({nonHomologatedItems.length}):
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                              {nonHomologatedItems.map(item => (
                                                <Badge key={item} variant="destructive" className="text-xs">
                                                  {item}
                                                </Badge>
                                              ))}
                                            </div>
                                            <p className="text-xs text-red-700 mt-2">
                                              Este veículo só poderá ser agendado após a homologação de todos os itens.
                                            </p>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </td>
                                </tr>
                               )}
                            </>
                            );
                          })}
                        </tbody>
                        </table>
                    </div>
                  </div>

                  <div className="sticky bottom-0 bg-background pt-4 border-t px-6 pb-6 -mx-6">
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={handleClose}>
                        Cancelar
                      </Button>
                      <Button 
                        type="button" 
                        onClick={onSubmit} 
                        disabled={isSubmitting || !isButtonEnabled()}
                        className="flex items-center gap-2 bg-[#1d7eb5] hover:bg-[#1a6fa0] text-white"
                      >
                        <Check className="w-4 h-4" />
                        {isSubmitting ? "Concluindo..." : "Concluir"}
                      </Button>
                    </DialogFooter>
                  </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Schedule Form Modal for individual vehicle scheduling */}
      <ScheduleFormModal
        open={isScheduleFormOpen}
        onOpenChange={(open) => {
          setIsScheduleFormOpen(open);
          if (!open) {
            setPendingVehicleData(null);
          }
        }}
        selectedDate={new Date()}
        selectedTime={null}
        onSubmit={async (formData) => {
          setIsSubmittingSchedule(true);
          try {
            // Resolve incoming_vehicle_id from pendingVehicleData
            let incomingVehicleId: string | undefined;
            if (pendingVehicleData) {
              const vehicleKey = `${pendingVehicleData.brand}-${pendingVehicleData.model}-${pendingVehicleData.plate || 'pending'}`;
              incomingVehicleId = vehicleIdMap.get(vehicleKey);
            }

            // Save to kit_schedules (correct table for Kanban)
            await createKitSchedule({
              technician_id: formData.technician_id,
              scheduled_date: format(formData.date, 'yyyy-MM-dd'),
              installation_time: formData.time,
              customer_name: formData.customer || 'Cliente não informado',
              customer_phone: formData.phone || '',
              customer_document_number: '',
              customer_email: '',
              customer_id: pendingVehicleData?.customerId,
              vehicle_brand: pendingVehicleData?.brand,
              vehicle_model: pendingVehicleData?.model || formData.vehicle_model,
              vehicle_plate: formData.plate,
              vehicle_year: pendingVehicleData?.year,
              installation_address_street: formData.address || '',
              installation_address_number: '',
              installation_address_neighborhood: '',
              installation_address_city: '',
              installation_address_state: '',
              installation_address_postal_code: '',
              notes: formData.observation,
              selected_kit_ids: pendingVehicleData?.selectedKitIds,
              incoming_vehicle_id: incomingVehicleId,
              configuration: pendingVehicleData?.configuration,
              accessories: pendingVehicleData?.accessories
            });

            // Send WhatsApp notification
            const whatsappResult = await sendTechnicianWhatsApp(
              formData.technician_id,
              {
                date: format(formData.date, 'yyyy-MM-dd'),
                time: formData.time,
                customer: formData.customer,
                address: formData.address,
                local_contact: formData.local_contact,
                phone: formData.phone
              }
            );

            if (whatsappResult.success) {
              toast.success(`Agendamento criado e notificação enviada para ${whatsappResult.technicianName}`);
            } else {
              toast.success('Agendamento criado com sucesso!');
              if (whatsappResult.error) {
                toast.warning(`Aviso: Notificação não enviada - ${whatsappResult.error}`);
              }
            }

            setIsScheduleFormOpen(false);
            setPendingVehicleData(null);
            onSuccess();
          } catch (error) {
            console.error('Error creating schedule:', error);
            toast.error(error instanceof Error ? error.message : 'Erro ao criar agendamento');
          } finally {
            setIsSubmittingSchedule(false);
          }
        }}
        isLoading={isSubmittingSchedule}
        initialVehicleData={pendingVehicleData}
      />
    </Dialog>
  );
};