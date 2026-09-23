import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Truck, Users, MapPin, Settings, FileText, Package, Camera, X, Info, History as HistoryIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PlateSelectionModal } from "./PlateSelectionModal";
import { processKickoffVehicles } from "@/services/kickoffProcessingService";
import type { KickoffVehicle } from "@/services/kickoffService";
import { KickoffVehiclesTable } from "./KickoffVehiclesTable";
import interiorTruckAsset from "@/assets/interior-caminhao.png.asset.json";
import exteriorTruckAsset from "@/assets/caminhao-frontal.png.asset.json";
import frontalTruckAsset from "@/assets/caminhao-frontal-3q.png.asset.json";
import traseiraTruckAsset from "@/assets/caminhao-traseira-3q.png.asset.json";
import busInteriorAsset from "@/assets/onibus-interior-superior.png.asset.json";
import busLateralAsset from "@/assets/onibus-lateral.png.asset.json";
import busFrontalAsset from "@/assets/onibus-frontal.png.asset.json";

import { logCreate } from "@/services/logService";
import { fetchAddressByCEP, isValidCEP, formatCEP } from "@/services/cepService";

interface KickoffDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleSummaryId: number;
  companyName: string;
  vehicles: KickoffVehicle[];
  onSuccess: () => void;
}

interface InstallationLocation {
  cep?: string;
  state: string;
  city: string;
  neighborhood?: string;
  street?: string;
  plates?: string[];
}

interface Contact {
  type: "decisor" | "influenciador" | "operacoes" | "ponto_focal";
  name: string;
  role: string;
  email: string;
  phone: string;
}

type VehicleBodyType = "truck" | "bus";
type CameraArea = "interior" | "exterior" | "frontal" | "traseira" | "bus_interior" | "bus_lateral" | "bus_frontal";

interface CameraPlacementPoint {
  id: string;
  area: CameraArea;
  x: number;
  y: number;
}

interface CameraLocalizationData {
  product: string | null;
  vehicle_type: VehicleBodyType;
  base_cameras: number;
  vehicle_quantity: number;
  cameras_per_vehicle: number;
  total_cameras: number;
  camera_extra_quantity: number;
  observation?: string;
  points: Array<CameraPlacementPoint & { order: number; area_label: string }>;
}

const CAMERA_AREA_LABELS: Record<CameraArea, string> = {
  interior: "Interior",
  exterior: "Exterior",
  frontal: "Frontal",
  traseira: "Traseira",
  bus_interior: "Interior",
  bus_lateral: "Lateral",
  bus_frontal: "Frontal",
};

const CAMERA_AREA_ASSET: Record<CameraArea, { url: string; alt: string }> = {
  interior: { url: interiorTruckAsset.url, alt: "Interior da cabine do caminhão" },
  exterior: { url: exteriorTruckAsset.url, alt: "Parte externa frontal do caminhão" },
  frontal: { url: frontalTruckAsset.url, alt: "Vista frontal do caminhão" },
  traseira: { url: traseiraTruckAsset.url, alt: "Vista traseira do caminhão" },
  bus_interior: { url: busInteriorAsset.url, alt: "Vista superior do interior do ônibus" },
  bus_lateral: { url: busLateralAsset.url, alt: "Vista lateral do ônibus" },
  bus_frontal: { url: busFrontalAsset.url, alt: "Vista frontal do ônibus" },
};

const CAMERA_AREAS_BY_VEHICLE: Record<VehicleBodyType, CameraArea[]> = {
  truck: ["interior", "exterior", "frontal", "traseira"],
  bus: ["bus_interior", "bus_lateral", "bus_frontal"],
};

const normalizeForSearch = (text: string): string => {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
};

const isCameraExtraModule = (name: string) => {
  const normalizedName = normalizeForSearch(name);
  return normalizedName.includes("camera extra") || normalizedName.includes("camara extra");
};

const isCopilotoProduct = (usageType: string | null | undefined): boolean => {
  const normalizedUsageType = normalizeForSearch(usageType || "").replace(/_/g, " ");
  return normalizedUsageType.includes("copiloto 2") || normalizedUsageType.includes("copiloto 4");
};

const getBaseCopilotoCameraCount = (usageType: string | null | undefined): number => {
  const normalizedUsageType = normalizeForSearch(usageType || "").replace(/_/g, " ");
  if (normalizedUsageType.includes("copiloto 4")) return 4;
  if (normalizedUsageType.includes("copiloto 2")) return 2;
  return 0;
};

const getVehicleCameraExtraModuleQuantity = (vehicle: KickoffVehicle): number => {
  return vehicle.modules.reduce((total, module) => {
    if (!isCameraExtraModule(module.name)) return total;
    return total + Math.max(1, Number(module.quantity) || 1);
  }, 0);
};

const getCopilotoCamerasPerVehicle = (vehicle: KickoffVehicle): number => {
  const vehicleQuantity = Math.max(1, Number(vehicle.quantity) || 1);
  const extraCameraQuantity = getVehicleCameraExtraModuleQuantity(vehicle);
  return getBaseCopilotoCameraCount(vehicle.usage_type) + Math.ceil(extraCameraQuantity / vehicleQuantity);
};

const getCopilotoTotalSoldCameras = (vehicle: KickoffVehicle): number => {
  const vehicleQuantity = Math.max(1, Number(vehicle.quantity) || 1);
  return getBaseCopilotoCameraCount(vehicle.usage_type) * vehicleQuantity + getVehicleCameraExtraModuleQuantity(vehicle);
};

const getCopilotoGroupKey = (vehicle: KickoffVehicle): string =>
  getBaseCopilotoCameraCount(vehicle.usage_type) === 4 ? "copiloto-4" : "copiloto-2";

interface CameraPlacementImageProps {
  area: CameraArea;
  points: CameraPlacementPoint[];
  canAdd: boolean;
  onAdd: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onRemove: (pointId: string) => void;
  getPointNumber: (pointId: string) => number;
}

const CameraPlacementImage = ({ area, points, canAdd, onAdd, onRemove, getPointNumber }: CameraPlacementImageProps) => {
  const imageAsset = CAMERA_AREA_ASSET[area];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-semibold">{CAMERA_AREA_LABELS[area]}</Label>
        <Badge variant="secondary" className="text-xs">
          {points.length}
        </Badge>
      </div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg border bg-muted/30 shadow-inner">
        <Button
          type="button"
          variant="ghost"
          aria-label={`Marcar câmera no ${CAMERA_AREA_LABELS[area]}`}
          disabled={!canAdd}
          onClick={onAdd}
          className="absolute inset-0 z-20 h-full w-full cursor-crosshair rounded-lg bg-transparent p-0 hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-100"
        />
        <img
          src={imageAsset.url}
          alt={imageAsset.alt}
          className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain"
        />
        {points.map((point) => {
          const pointNumber = getPointNumber(point.id);
          return (
            <Button
              key={point.id}
              type="button"
              variant="default"
              size="icon"
              aria-label={`Remover câmera ${pointNumber} do ${CAMERA_AREA_LABELS[area]}`}
              className="absolute z-30 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background p-0 text-xs font-bold shadow-md"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              onClick={() => onRemove(point.id)}
            >
              {pointNumber}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

// --- Installation Locations Section (refactored) ---
interface InstallationLocationsSectionProps {
  installationLocations: InstallationLocation[];
  allPlates: string[];
  onAddLocation: () => void;
  onRemoveLocation: (index: number) => void;
  onUpdateLocation: (index: number, field: keyof InstallationLocation, value: any) => void;
  onUpdateLocationMultiple: (index: number, fields: Partial<InstallationLocation>) => void;
  onSetPlatesForLocation: (locIndex: number, plates: string[]) => void;
  cepLoading: Map<number, boolean>;
  onFetchCEP: (index: number, cep: string) => void;
}

const InstallationLocationsSection = ({
  installationLocations,
  allPlates,
  onAddLocation,
  onRemoveLocation,
  onUpdateLocation,
  onUpdateLocationMultiple,
  onSetPlatesForLocation,
  cepLoading,
  onFetchCEP,
}: InstallationLocationsSectionProps) => {
  const [plateModalOpen, setPlateModalOpen] = useState(false);
  const [activeLocationIndex, setActiveLocationIndex] = useState(0);

  const plateAssignments = useMemo(() => {
    const map = new Map<string, number>();
    installationLocations.forEach((loc, idx) => {
      (loc.plates || []).forEach((plate) => {
        if (!map.has(plate)) map.set(plate, idx);
      });
    });
    return map;
  }, [installationLocations]);

  const getLocationAddress = (loc: InstallationLocation) => {
    const parts = [loc.street, loc.neighborhood, loc.city, loc.state].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "";
  };

  const removePlateFromLocation = (locIndex: number, plate: string) => {
    const currentPlates = installationLocations[locIndex].plates || [];
    onSetPlatesForLocation(locIndex, currentPlates.filter((p) => p !== plate));
  };

  const openPlateModal = (locIndex: number) => {
    setActiveLocationIndex(locIndex);
    setPlateModalOpen(true);
  };

  const handleConfirmPlates = (plates: string[]) => {
    onSetPlatesForLocation(activeLocationIndex, plates);
  };

  return (
    <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-lg">Locais de Instalação</h3>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAddLocation}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Local
        </Button>
      </div>

      {installationLocations.map((location, index) => {
        const selectedPlates = location.plates || [];
        return (
          <div key={index} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Local {index + 1}</span>
              </div>
              {installationLocations.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveLocation(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <Label className="text-sm">CEP</Label>
                <div className="relative">
                  <Input
                    value={location.cep || ""}
                    onChange={(e) => {
                      const formatted = formatCEP(e.target.value);
                      onUpdateLocation(index, "cep", formatted);
                      if (isValidCEP(formatted)) {
                        onFetchCEP(index, formatted);
                      }
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                    className="mt-1"
                  />
                  {cepLoading.get(index) && (
                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground mt-0.5" />
                  )}
                </div>
              </div>
              <div>
                <Label className="text-sm">UF (Estado)</Label>
                <Input
                  value={location.state}
                  onChange={(e) => onUpdateLocation(index, "state", e.target.value)}
                  placeholder="UF"
                  maxLength={2}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Cidade</Label>
                <Input
                  value={location.city}
                  onChange={(e) => onUpdateLocation(index, "city", e.target.value)}
                  placeholder="Cidade"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Bairro</Label>
                <Input
                  value={location.neighborhood || ""}
                  onChange={(e) => onUpdateLocation(index, "neighborhood", e.target.value)}
                  placeholder="Bairro"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Logradouro/Nome</Label>
                <Input
                  value={location.street || ""}
                  onChange={(e) => onUpdateLocation(index, "street", e.target.value)}
                  placeholder="Rua, Avenida..."
                  className="mt-1"
                />
              </div>
            </div>

            {allPlates.length > 0 && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">📌 Placas vinculadas:</span>
                    <Badge variant="secondary" className="font-mono">
                      {selectedPlates.length}
                    </Badge>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => openPlateModal(index)}>
                    Gerenciar placas
                  </Button>
                </div>

                {selectedPlates.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPlates.map((plate) => (
                      <Badge key={plate} variant="secondary" className="font-mono text-xs px-2 py-1 flex items-center gap-1">
                        {plate}
                        <button
                          type="button"
                          onClick={() => removePlateFromLocation(index, plate)}
                          className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Nenhuma placa vinculada. Clique em "Gerenciar placas" para selecionar.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      <PlateSelectionModal
        open={plateModalOpen}
        onOpenChange={setPlateModalOpen}
        locationIndex={activeLocationIndex}
        locationLabel={`Local ${activeLocationIndex + 1}`}
        locationAddress={getLocationAddress(installationLocations[activeLocationIndex] || ({ state: "", city: "" } as InstallationLocation))}
        allPlates={allPlates}
        selectedPlates={installationLocations[activeLocationIndex]?.plates || []}
        plateAssignments={plateAssignments}
        onConfirm={handleConfirmPlates}
      />
    </div>
  );
};

export const KickoffDetailsModal = ({
  open,
  onOpenChange,
  saleSummaryId,
  companyName,
  vehicles,
  onSuccess,
}: KickoffDetailsModalProps) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [hasParticularity, setHasParticularity] = useState(false);
  const [kickoffCreatedAt, setKickoffCreatedAt] = useState<Date | null>(null);
  const [customerInfo, setCustomerInfo] = useState<{
    name: string;
    services: string[];
    cnpj: string;
    phone: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
  } | null>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [installationLocations, setInstallationLocations] = useState<InstallationLocation[]>([
    { cep: "", state: "", city: "", neighborhood: "", street: "", plates: [] },
  ]);
  const [particularityDetails, setParticularityDetails] = useState("");
  const [notes, setNotes] = useState("");

  const [selectedModules, setSelectedModules] = useState<Map<string, Set<string>>>(
    new Map(
      vehicles.map((v) => {
        const normalize = (s: string) =>
          s
            ? s
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
            : "";
        const modulesList = v.modules.filter((m) => normalize(m.categories || "") === "modulos");
        return [v.id, new Set(modulesList.map((m) => m.name))];
      }),
    ),
  );

  const [vehicleBlocking, setVehicleBlocking] = useState<
    Map<
      string,
      {
        needsBlocking: boolean;
        engineBlocking: boolean;
        fuelBlocking: boolean;
        engineQuantity: number;
        fuelQuantity: number;
      }
    >
  >(
    new Map(
      vehicles.map((v) => [
        v.id,
        { needsBlocking: false, engineBlocking: false, fuelBlocking: false, engineQuantity: 1, fuelQuantity: 1 },
      ]),
    ),
  );

  const [vehicleSiren, setVehicleSiren] = useState<Map<string, { hasSiren: boolean; quantity: number }>>(
    new Map(vehicles.map((v) => [v.id, { hasSiren: false, quantity: 1 }])),
  );

  const [vehicleVideoMonitoring, setVehicleVideoMonitoring] = useState<Map<string, boolean | undefined>>(new Map());

  const [vehicleCameraExtra, setVehicleCameraExtra] = useState<Map<string, number>>(
    new Map(vehicles.map((v) => [v.id, 1])),
  );

  // Camera extra locations state - stores location text for each vehicle with camera extra
  const [cameraExtraLocations, setCameraExtraLocations] = useState<Map<string, string>>(new Map());
  const [copilotoCameraTotals, setCopilotoCameraTotals] = useState<Map<string, number>>(
    new Map(
      vehicles
        .filter((vehicle) => isCopilotoProduct(vehicle.usage_type))
        .map((vehicle) => [getCopilotoGroupKey(vehicle), getCopilotoCamerasPerVehicle(vehicle)]),
    ),
  );
  const [copilotoCameraPlacements, setCopilotoCameraPlacements] = useState<Map<string, CameraPlacementPoint[]>>(
    new Map(),
  );
  const [copilotoCameraObservations, setCopilotoCameraObservations] = useState<Map<string, string>>(new Map());
  const [copilotoVehicleTypes, setCopilotoVehicleTypes] = useState<Map<string, VehicleBodyType>>(new Map());

  const [validatedPlates, setValidatedPlates] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previousKickoff, setPreviousKickoff] = useState<any | null>(null);


  // Accessories sale state - supports multiple items
  interface AccessorySaleItem {
    description: string;
    quantity: number | "";
    unitPrice: number | "";
  }
  const [accessoriesSaleItems] = useState<AccessorySaleItem[]>([]);

  const copilotoVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => isCopilotoProduct(vehicle.usage_type));
  }, [vehicles]);

  // Identify vehicles with "camera extra" accessory (Copiloto usa o bloco de Localização)
  const vehiclesWithCameraExtra = useMemo(() => {
    return vehicles.filter((vehicle) => {
      if (isCopilotoProduct(vehicle.usage_type)) return false;
      return vehicle.modules.some((m) => isCameraExtraModule(m.name));
    });
  }, [vehicles]);

  useEffect(() => {
    if (!open) return;

    const copilotoGroupKeys = new Set(copilotoVehicles.map((vehicle) => getCopilotoGroupKey(vehicle)));

    setCopilotoCameraTotals((prev) => {
      const next = new Map(prev);
      let changed = false;

      copilotoVehicles.forEach((vehicle) => {
        const groupKey = getCopilotoGroupKey(vehicle);
        const baseCount = getBaseCopilotoCameraCount(vehicle.usage_type);
        const defaultTotal = getCopilotoCamerasPerVehicle(vehicle);
        const currentTotal = next.get(groupKey);

        if (!currentTotal || currentTotal < baseCount) {
          next.set(groupKey, defaultTotal);
          changed = true;
        }
      });

      Array.from(next.keys()).forEach((groupKey) => {
        if (!copilotoGroupKeys.has(groupKey)) {
          next.delete(groupKey);
          changed = true;
        }
      });

      return changed ? next : prev;
    });

    setCopilotoCameraPlacements((prev) => {
      const next = new Map(prev);
      let changed = false;

      Array.from(next.keys()).forEach((groupKey) => {
        if (!copilotoGroupKeys.has(groupKey)) {
          next.delete(groupKey);
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [open, copilotoVehicles]);

  // Load existing customer data when modal opens
  // Segsale import is manual-only to avoid unintended Edge Function executions.
  useEffect(() => {
    if (open && saleSummaryId) {
      loadCustomerData();
    }
  }, [open, saleSummaryId]);


  const loadCustomerData = async () => {
    try {
      // First try to get customer data from customers table
      const { data: customerData } = await supabase
        .from("customers")
        .select("*")
        .eq("sale_summary_id", saleSummaryId)
        .maybeSingle();

      if (customerData) {
        setHasParticularity(customerData.has_installation_particularity || false);
        setParticularityDetails(customerData.installation_particularity_details || "");
        setNotes(customerData.kickoff_notes || "");
        setContacts(Array.isArray(customerData.contacts) ? (customerData.contacts as unknown as Contact[]) : []);
        setInstallationLocations(
          Array.isArray(customerData.installation_locations) && customerData.installation_locations.length > 0
            ? (customerData.installation_locations as unknown as InstallationLocation[])
            : [{ city: "", state: "" }],
        );

        // Load customer info from customers table
        const modules = Array.isArray(customerData.modules) ? customerData.modules : [];
        
        // Try to get UF from CEP if state is missing
        let resolvedState = customerData.address_state || "";
        if (!resolvedState && customerData.address_postal_code) {
          try {
            const cepData = await fetchAddressByCEP(customerData.address_postal_code);
            if (cepData) resolvedState = cepData.uf;
          } catch (e) {
            console.warn("Could not resolve UF from CEP:", e);
          }
        }
        
        setCustomerInfo({
          name: customerData.company_name || customerData.name || companyName || "Cliente não identificado",
          services: modules,
          cnpj: customerData.document_number || "Não informado",
          phone: customerData.phone || "Não informado",
          street: customerData.address_street || "Não informado",
          number: customerData.address_number || "S/N",
          neighborhood: customerData.address_neighborhood || "Não informado",
          city: customerData.address_city || "Não informado",
          state: resolvedState || "Não informado",
          cep: customerData.address_postal_code || "Não informado",
        });
      } else {
        // If no customer data, get from incoming_vehicles
        const { data: vehicleData } = await supabase
          .from("incoming_vehicles")
          .select("company_name, cpf, phone, address_city, address_district, address_street, address_number, address_zip_code, received_at")
          .eq("sale_summary_id", saleSummaryId)
          .order("received_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (vehicleData) {
          setKickoffCreatedAt(new Date(vehicleData.received_at));

          // Resolve UF from CEP
          let resolvedState = "";
          if (vehicleData.address_zip_code) {
            try {
              const cepData = await fetchAddressByCEP(vehicleData.address_zip_code);
              if (cepData) resolvedState = cepData.uf;
            } catch (e) {
              console.warn("Could not resolve UF from CEP:", e);
            }
          }

          setCustomerInfo({
            name: vehicleData.company_name || companyName || "Cliente não identificado",
            services: [],
            cnpj: vehicleData.cpf || "Não informado",
            phone: vehicleData.phone || "Não informado",
            street: vehicleData.address_street || "Não informado",
            number: vehicleData.address_number || "S/N",
            neighborhood: vehicleData.address_district || "Não informado",
            city: vehicleData.address_city || "Não informado",
            state: resolvedState || "Não informado",
            cep: vehicleData.address_zip_code || "Não informado",
          });
        } else {
          // Final fallback
          setCustomerInfo({
            name: companyName || "Cliente não identificado",
            services: [],
            cnpj: "Não informado",
            phone: "Não informado",
            street: "Não informado",
            number: "S/N",
            neighborhood: "Não informado",
            city: "Não informado",
            state: "Não informado",
            cep: "Não informado",
          });
        }
      }

      // Load kickoff created date from first incoming vehicle if not set
      if (!kickoffCreatedAt) {
        const { data: vehicleData } = await supabase
          .from("incoming_vehicles")
          .select("received_at")
          .eq("sale_summary_id", saleSummaryId)
          .order("received_at", { ascending: true })
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
        cnpj: "Não informado",
        phone: "Não informado",
        street: "Não informado",
        number: "S/N",
        neighborhood: "Não informado",
        city: "Não informado",
        state: "Não informado",
        cep: "Não informado",
      });
    }
  };

  // Busca o kickoff anterior mais recente do mesmo cliente
  useEffect(() => {
    const loadPrevious = async () => {
      if (!open || !companyName) {
        setPreviousKickoff(null);
        return;
      }
      const { data } = await supabase
        .from("kickoff_history")
        .select("*")
        .ilike("company_name", companyName.trim())
        .neq("sale_summary_id", saleSummaryId)
        .order("approved_at", { ascending: false })
        .limit(1);

      setPreviousKickoff(data && data.length > 0 ? data[0] : null);
    };
    loadPrevious();
  }, [open, companyName, saleSummaryId]);

  const applyPreviousKickoff = () => {
    if (!previousKickoff) return;

    const prevContacts = Array.isArray(previousKickoff.contacts) ? (previousKickoff.contacts as Contact[]) : [];
    if (prevContacts.length > 0) setContacts(prevContacts.map((c) => ({ ...c })));

    const prevLocations = Array.isArray(previousKickoff.installation_locations)
      ? (previousKickoff.installation_locations as InstallationLocation[])
      : [];
    if (prevLocations.length > 0) {
      // Placas são específicas de cada venda: mantemos apenas os endereços
      setInstallationLocations(prevLocations.map((loc) => ({ ...loc, plates: [] })));
    }

    setHasParticularity(!!previousKickoff.has_installation_particularity);
    setParticularityDetails(previousKickoff.installation_particularity_details || "");
    setNotes(previousKickoff.kickoff_notes || "");

    // Reaproveita configurações por veículo (módulos, bloqueio, sirene) quando o modelo coincide
    const prevVehicles: any[] = Array.isArray(previousKickoff.vehicles_data) ? previousKickoff.vehicles_data : [];
    if (prevVehicles.length > 0) {
      const key = (brand?: string, model?: string) =>
        `${(brand || "").trim().toLowerCase()}|${(model || "").trim().toLowerCase()}`;
      const byModel = new Map<string, any>();
      prevVehicles.forEach((pv) => byModel.set(key(pv.brand, pv.model), pv));

      setSelectedModules((prev) => {
        const next = new Map(prev);
        vehicles.forEach((v) => {
          const match = byModel.get(key(v.brand, v.model));
          if (match && Array.isArray(match.selected_modules)) {
            next.set(v.id, new Set(match.selected_modules));
          }
        });
        return next;
      });

      setVehicleBlocking((prev) => {
        const next = new Map(prev);
        vehicles.forEach((v) => {
          const match = byModel.get(key(v.brand, v.model));
          if (match?.blocking_info) {
            next.set(v.id, {
              needsBlocking: !!match.blocking_info.needsBlocking,
              engineBlocking: !!match.blocking_info.engineBlocking,
              fuelBlocking: !!match.blocking_info.fuelBlocking,
              engineQuantity: Number(match.blocking_info.engineQuantity) || 1,
              fuelQuantity: Number(match.blocking_info.fuelQuantity) || 1,
            });
          }
        });
        return next;
      });

      setVehicleSiren((prev) => {
        const next = new Map(prev);
        vehicles.forEach((v) => {
          const match = byModel.get(key(v.brand, v.model));
          if (match?.siren_info) {
            next.set(v.id, {
              hasSiren: !!match.siren_info.hasSiren,
              quantity: Number(match.siren_info.quantity) || 1,
            });
          }
        });
        return next;
      });

      setCopilotoCameraTotals((prev) => {
        const next = new Map(prev);
        vehicles.forEach((v) => {
          const match = byModel.get(key(v.brand, v.model));
          const localization = match?.camera_localization;
          if (isCopilotoProduct(v.usage_type) && localization) {
            const baseCount = getBaseCopilotoCameraCount(v.usage_type);
            const restoredPatternCount = Number(localization.cameras_per_vehicle) || Number(localization.total_cameras);
            next.set(getCopilotoGroupKey(v), Math.max(baseCount, restoredPatternCount || baseCount));
          }
        });
        return next;
      });

      setCopilotoCameraObservations((prev) => {
        const next = new Map(prev);
        vehicles.forEach((v) => {
          const match = byModel.get(key(v.brand, v.model));
          const observation = match?.camera_localization?.observation;
          if (isCopilotoProduct(v.usage_type) && typeof observation === "string" && observation.trim() !== "") {
            next.set(getCopilotoGroupKey(v), observation);
          }
        });
        return next;
      });

      setCopilotoVehicleTypes((prev) => {
        const next = new Map(prev);
        vehicles.forEach((v) => {
          const match = byModel.get(key(v.brand, v.model));
          const vehicleType = match?.camera_localization?.vehicle_type;
          if (isCopilotoProduct(v.usage_type) && (vehicleType === "truck" || vehicleType === "bus")) {
            next.set(getCopilotoGroupKey(v), vehicleType);
          }
        });
        return next;
      });

      setCopilotoCameraPlacements((prev) => {
        const next = new Map(prev);
        vehicles.forEach((v) => {
          const match = byModel.get(key(v.brand, v.model));
          const localization = match?.camera_localization;
          const points = Array.isArray(localization?.points) ? localization.points : [];
          if (!isCopilotoProduct(v.usage_type) || points.length === 0) return;

          next.set(
            getCopilotoGroupKey(v),
            points
              .filter((point: any) =>
                ["interior", "exterior", "frontal", "traseira", "bus_interior", "bus_lateral", "bus_frontal", "cavalo", "bau"].includes(point?.area),
              )
              .map((point: any, index: number) => ({
                id: String(point.id || `${v.id}-${index}`),
                area: point.area === "cavalo" ? "interior" : point.area === "bau" ? "exterior" : point.area,
                x: Math.max(0, Math.min(100, Number(point.x) || 0)),
                y: Math.max(0, Math.min(100, Number(point.y) || 0)),
              })),
          );
        });
        return next;
      });
    }

    toast.success("Dados do kickoff anterior aplicados. Revise antes de concluir.");
  };



  const calculateDaysSinceKickoff = (): number => {
    if (!kickoffCreatedAt) return 0;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - kickoffCreatedAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleModuleToggle = (vehicleId: string, moduleName: string) => {
    setSelectedModules((prev) => {
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

  const handleBlockingToggle = (
    vehicleId: string,
    field: "needsBlocking" | "engineBlocking" | "fuelBlocking",
    value: boolean,
  ) => {
    setVehicleBlocking((prev) => {
      const newMap = new Map(prev);
      const vehicleBlock = {
        ...(newMap.get(vehicleId) || {
          needsBlocking: false,
          engineBlocking: false,
          fuelBlocking: false,
          engineQuantity: 1,
          fuelQuantity: 1,
        }),
      };

      vehicleBlock[field] = value;

      // If disabling needsBlocking, also disable sub-options
      if (field === "needsBlocking" && !value) {
        vehicleBlock.engineBlocking = false;
        vehicleBlock.fuelBlocking = false;
      }

      newMap.set(vehicleId, vehicleBlock);
      return newMap;
    });
  };

  const handleBlockingQuantityChange = (
    vehicleId: string,
    field: "engineQuantity" | "fuelQuantity",
    quantity: number,
  ) => {
    setVehicleBlocking((prev) => {
      const newMap = new Map(prev);
      const vehicleBlock = {
        ...(newMap.get(vehicleId) || {
          needsBlocking: false,
          engineBlocking: false,
          fuelBlocking: false,
          engineQuantity: 1,
          fuelQuantity: 1,
        }),
      };
      vehicleBlock[field] = Math.max(1, quantity);
      newMap.set(vehicleId, vehicleBlock);
      return newMap;
    });
  };

  const handleSirenToggle = (vehicleId: string, value: boolean) => {
    setVehicleSiren((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(vehicleId) || { hasSiren: false, quantity: 1 };
      newMap.set(vehicleId, { ...current, hasSiren: value });
      return newMap;
    });
  };

  const handleSirenQuantityChange = (vehicleId: string, quantity: number) => {
    setVehicleSiren((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(vehicleId) || { hasSiren: false, quantity: 1 };
      newMap.set(vehicleId, { ...current, quantity: Math.max(1, quantity) });
      return newMap;
    });
  };

  const addContact = () => {
    setContacts([...contacts, { type: "decisor", name: "", role: "", email: "", phone: "" }]);
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
    setInstallationLocations([
      ...installationLocations,
      { cep: "", state: "", city: "", neighborhood: "", street: "", plates: [] },
    ]);
  };

  // Get all plates from vehicles
  const allPlates: string[] = vehicles
    .map((v) => v.plate)
    .filter((p): p is string => !!p && p !== "Não informada");

  const togglePlateForLocation = (locationIndex: number, plate: string) => {
    setInstallationLocations((prev) => {
      const updated = [...prev];
      const currentPlates = updated[locationIndex].plates || [];
      updated[locationIndex] = {
        ...updated[locationIndex],
        plates: currentPlates.includes(plate)
          ? currentPlates.filter((p) => p !== plate)
          : [...currentPlates, plate],
      };
      return updated;
    });
  };

  const toggleAllPlatesForLocation = (locationIndex: number) => {
    setInstallationLocations((prev) => {
      const updated = [...prev];
      const currentPlates = updated[locationIndex].plates || [];
      updated[locationIndex] = {
        ...updated[locationIndex],
        plates: currentPlates.length === allPlates.length ? [] : [...allPlates],
      };
      return updated;
    });
  };

  const removeLocation = (index: number) => {
    // Clear plates from the removed location so they become available again
    const updated = installationLocations.map((loc, i) => {
      if (i === index) {
        return { ...loc, plates: [] };
      }
      return loc;
    });
    setInstallationLocations(updated.filter((_, i) => i !== index));
  };

  const updateLocation = (index: number, field: keyof InstallationLocation, value: any) => {
    const updated = [...installationLocations];
    updated[index] = { ...updated[index], [field]: value };
    setInstallationLocations(updated);
  };

  const updateLocationMultiple = (index: number, fields: Partial<InstallationLocation>) => {
    setInstallationLocations((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...fields };
      return updated;
    });
  };

  const [cepLoading, setCepLoading] = useState<Map<number, boolean>>(new Map());

  const fetchAndFillCEP = async (index: number, cep: string) => {
    if (!isValidCEP(cep)) return;
    setCepLoading((prev) => new Map(prev).set(index, true));
    try {
      const data = await fetchAddressByCEP(cep);
      if (data) {
        updateLocationMultiple(index, {
          state: data.uf,
          city: data.localidade,
          neighborhood: data.bairro || "",
          street: data.logradouro || "",
        });
      }
    } catch (err: any) {
      console.error("Erro ao buscar CEP:", err);
      toast.error(err?.message || "CEP não encontrado");
    } finally {
      setCepLoading((prev) => new Map(prev).set(index, false));
    }
  };

  // Total de câmeras do grupo = soma de todas as câmeras vendidas (base x veículos + câmeras extras)
  const getCopilotoCameraTotal = (vehicle: KickoffVehicle): number => {
    const groupKey = getCopilotoGroupKey(vehicle);
    const groupVehicles = copilotoVehicles.filter((item) => getCopilotoGroupKey(item) === groupKey);
    return groupVehicles.reduce((sum, item) => sum + getCopilotoTotalSoldCameras(item), 0);
  };

  const getCameraLocalizationForVehicle = (vehicle: KickoffVehicle): CameraLocalizationData | null => {
    if (!isCopilotoProduct(vehicle.usage_type)) return null;

    const totalCameras = getCopilotoCameraTotal(vehicle);
    const baseCameras = getBaseCopilotoCameraCount(vehicle.usage_type);
    const vehicleQuantity = Math.max(1, Number(vehicle.quantity) || 1);
    const totalSoldCameras = getCopilotoTotalSoldCameras(vehicle);
    const points = copilotoCameraPlacements.get(getCopilotoGroupKey(vehicle)) || [];

    return {
      product: vehicle.usage_type,
      vehicle_type: copilotoVehicleTypes.get(getCopilotoGroupKey(vehicle)) || "truck",
      base_cameras: baseCameras,
      vehicle_quantity: vehicleQuantity,
      cameras_per_vehicle: totalCameras,
      total_cameras: totalSoldCameras,
      camera_extra_quantity: getVehicleCameraExtraModuleQuantity(vehicle),
      observation: copilotoCameraObservations.get(getCopilotoGroupKey(vehicle)) || "",
      points: points.map((point, index) => ({
        ...point,
        order: index + 1,
        area_label: CAMERA_AREA_LABELS[point.area],
      })),
    };
  };

  const handleCameraPlacementAdd = (
    groupKey: string,
    area: CameraArea,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    const vehicle = copilotoVehicles.find((item) => getCopilotoGroupKey(item) === groupKey);
    if (!vehicle) return;

    const totalCameras = getCopilotoCameraTotal(vehicle);
    const currentPoints = copilotoCameraPlacements.get(groupKey) || [];
    if (currentPoints.length >= totalCameras) {
      toast.error("Todas as posições do padrão deste veículo já foram marcadas.");
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));

    setCopilotoCameraPlacements((prev) => {
      const next = new Map(prev);
      const nextPoints = [...(next.get(groupKey) || [])];
      nextPoints.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        area,
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
      });
      next.set(groupKey, nextPoints);
      return next;
    });
  };

  const handleCameraPlacementRemove = (groupKey: string, pointId: string) => {
    setCopilotoCameraPlacements((prev) => {
      const next = new Map(prev);
      next.set(
        groupKey,
        (next.get(groupKey) || []).filter((point) => point.id !== pointId),
      );
      return next;
    });
  };

  const handleVehicleTypeChange = (groupKey: string, nextType: VehicleBodyType) => {
    const currentType = copilotoVehicleTypes.get(groupKey) || "truck";
    if (currentType === nextType) return;

    const currentPoints = copilotoCameraPlacements.get(groupKey) || [];
    if (currentPoints.length > 0 && !window.confirm("Ao trocar o tipo de veículo, as marcações atuais serão apagadas. Deseja continuar?")) {
      return;
    }

    setCopilotoVehicleTypes((prev) => new Map(prev).set(groupKey, nextType));
    if (currentPoints.length > 0) {
      setCopilotoCameraPlacements((prev) => new Map(prev).set(groupKey, []));
    }
  };

  // Validation checks
  const hasValidLocations = installationLocations.some((loc) => loc.city.trim() !== "" && loc.state.trim() !== "");
  const hasAtLeastOneValidatedPlate = validatedPlates.size > 0;
  const hasValidCopilotoCameraLocations = copilotoVehicles.every((vehicle) => {
    if (!validatedPlates.has(vehicle.id)) return true;
    const totalCameras = getCopilotoCameraTotal(vehicle);
    const points = copilotoCameraPlacements.get(getCopilotoGroupKey(vehicle)) || [];
    return totalCameras > 0 && points.length === totalCameras;
  });
  const isFormValid = hasAtLeastOneValidatedPlate && hasValidLocations && notes.trim() !== "" && hasValidCopilotoCameraLocations;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar se pelo menos um veículo foi validado
    if (!hasAtLeastOneValidatedPlate) {
      toast.error("Por favor, valide pelo menos um veículo na coluna 'Validação' antes de concluir o kickoff.");
      return;
    }

    // Verificar se há pelo menos um local de instalação preenchido
    if (!hasValidLocations) {
      toast.error("Por favor, preencha pelo menos um local de instalação (cidade e estado).");
      return;
    }

    if (!hasValidCopilotoCameraLocations) {
      toast.error("Marque a localização de todas as câmeras dos veículos Copiloto validados.");
      return;
    }

    setLoading(true);

    try {
      // Filtrar apenas os veículos validados
      const validatedVehicles = vehicles.filter((v) => validatedPlates.has(v.id));
      // Save customer kickoff details
      const { error: customerError } = await supabase
        .from("customers")
        .update({
          contacts: contacts.filter((c) => c.name) as any,
          installation_locations: installationLocations.filter((loc) => loc.city) as any,
          has_installation_particularity: !!particularityDetails,
          installation_particularity_details: particularityDetails || null,
          kickoff_notes: notes || null,
        })
        .eq("sale_summary_id", saleSummaryId);

      if (customerError) throw customerError;

      // Prepare vehicles data for history (apenas veículos validados)
      const vehiclesData = validatedVehicles.map((vehicle) => {
        const modules = Array.from(selectedModules.get(vehicle.id) || []);
        const blocking = vehicleBlocking.get(vehicle.id) || {
          needsBlocking: false,
          engineBlocking: false,
          fuelBlocking: false,
          quantity: 1,
        };
        const sirenData = vehicleSiren.get(vehicle.id) || { hasSiren: false, quantity: 1 };
        const videoMonitoring = vehicleVideoMonitoring.get(vehicle.id);
        const cameraLocalization = getCameraLocalizationForVehicle(vehicle);
        const isCopiloto = isCopilotoProduct(vehicle.usage_type);
        const hasCameraExtraModule = vehicle.modules.some((m) => isCameraExtraModule(m.name));

        return {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          plate: vehicle.plate,
          quantity: vehicle.quantity,
          usage_type: (vehicle as any).usage_type,
          validated: true,
          selected_modules: modules,
          blocking_info: blocking,
          siren_info: sirenData,
          has_video_monitoring: videoMonitoring,
          camera_localization: cameraLocalization,
          camera_extra_quantity:
            !isCopiloto && hasCameraExtraModule ? vehicleCameraExtra.get(vehicle.id) || 1 : 0,
          camera_extra_locations:
            !isCopiloto && hasCameraExtraModule ? cameraExtraLocations.get(vehicle.id) || null : null,
          accessories: vehicle.modules.filter((m) => {
            const normalize = (s: string) =>
              s
                ? s
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                : "";
            return normalize(m.categories || "") !== "modulos";
          }),
        };
      });

      // Store selected modules info and accessories (sirene, bloqueio) with quantities (apenas veículos validados)
      for (const vehicle of validatedVehicles) {
        const modules = Array.from(selectedModules.get(vehicle.id) || []);
        const sirenData = vehicleSiren.get(vehicle.id) || { hasSiren: false, quantity: 1 };
        const blockingData = vehicleBlocking.get(vehicle.id) || {
          needsBlocking: false,
          engineBlocking: false,
          fuelBlocking: false,
          quantity: 1,
        };

        if (modules.length > 0) {
          const { error: vehicleError } = await supabase
            .from("incoming_vehicles")
            .update({
              processing_notes: `Módulos selecionados: ${modules.join(", ")}`,
            })
            .eq("id", vehicle.id);

          if (vehicleError) {
            console.error(`Error updating vehicle ${vehicle.id} modules:`, vehicleError);
          }
        }

        // Add sirene as accessory with quantity
        if (sirenData.hasSiren) {
          const { error: sirenError } = await supabase.from("accessories").upsert(
            {
              vehicle_id: vehicle.id,
              company_name: companyName,
              usage_type: (vehicle as any).usage_type || "outros",
              name: "Sirene",
              categories: "Acessórios",
              quantity: sirenData.quantity,
              received_at: new Date().toISOString(),
            },
            {
              onConflict: "vehicle_id,name,categories",
              ignoreDuplicates: false,
            },
          );

          if (sirenError) {
            console.error(`Error adding sirene for vehicle ${vehicle.id}:`, sirenError);
          } else {
            console.log(`Successfully added ${sirenData.quantity} sirene(s) for vehicle ${vehicle.id}`);
          }
        }

        // Add bloqueio as accessory with quantity per type
        if (blockingData.needsBlocking) {
          // Bloqueio de Partida
          if (blockingData.engineBlocking && blockingData.engineQuantity > 0) {
            const { error: engineBlockingError } = await supabase.from("accessories").upsert(
              {
                vehicle_id: vehicle.id,
                company_name: companyName,
                usage_type: (vehicle as any).usage_type || "outros",
                name: "Bloqueio de Partida",
                categories: "Acessórios",
                quantity: blockingData.engineQuantity,
                received_at: new Date().toISOString(),
              },
              {
                onConflict: "vehicle_id,name,categories",
                ignoreDuplicates: false,
              },
            );

            if (engineBlockingError) {
              console.error(`Error adding bloqueio de partida for vehicle ${vehicle.id}:`, engineBlockingError);
            } else {
              console.log(
                `Successfully added ${blockingData.engineQuantity} bloqueio(s) de partida for vehicle ${vehicle.id}`,
              );
            }
          }

          // Bloqueio de Combustível
          if (blockingData.fuelBlocking && blockingData.fuelQuantity > 0) {
            const { error: fuelBlockingError } = await supabase.from("accessories").upsert(
              {
                vehicle_id: vehicle.id,
                company_name: companyName,
                usage_type: (vehicle as any).usage_type || "outros",
                name: "Bloqueio de Combustível",
                categories: "Acessórios",
                quantity: blockingData.fuelQuantity,
                received_at: new Date().toISOString(),
              },
              {
                onConflict: "vehicle_id,name,categories",
                ignoreDuplicates: false,
              },
            );

            if (fuelBlockingError) {
              console.error(`Error adding bloqueio de combustível for vehicle ${vehicle.id}:`, fuelBlockingError);
            } else {
              console.log(
                `Successfully added ${blockingData.fuelQuantity} bloqueio(s) de combustível for vehicle ${vehicle.id}`,
              );
            }
          }
        }

        // Save camera extra info to incoming_vehicles
        const hasCameraExtra = vehicle.modules.some((m) => {
          return isCameraExtraModule(m.name);
        });

        if (hasCameraExtra && !isCopilotoProduct(vehicle.usage_type)) {
          const cameraQuantity = vehicleCameraExtra.get(vehicle.id) || 1;
          const cameraLocation = cameraExtraLocations.get(vehicle.id) || null;

          const { error: cameraExtraError } = await supabase
            .from("incoming_vehicles")
            .update({
              camera_extra_quantity: cameraQuantity,
              camera_extra_locations: cameraLocation,
            })
            .eq("id", vehicle.id);

          if (cameraExtraError) {
            console.error(`Error saving camera extra info for vehicle ${vehicle.id}:`, cameraExtraError);
          } else {
            console.log(
              `Successfully saved camera extra info for vehicle ${vehicle.id}: ${cameraQuantity}x at ${cameraLocation}`,
            );
          }
        }

        const cameraLocalization = getCameraLocalizationForVehicle(vehicle);
        if (cameraLocalization) {
          const { error: cameraLocalizationError } = await supabase
            .from("incoming_vehicles")
            .update({
              camera_extra_quantity: cameraLocalization.camera_extra_quantity,
              camera_extra_locations: JSON.stringify(cameraLocalization),
            })
            .eq("id", vehicle.id);

          if (cameraLocalizationError) {
            console.error(`Error saving camera localization for vehicle ${vehicle.id}:`, cameraLocalizationError);
          }
        }
      }

      // Get current user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Prepare sales data
      const cameraExtraSaleData = null;

      const accessoriesSaleData: any[] = [];

      // Save to kickoff history
      const { error: historyError } = await supabase
        .from("kickoff_history")
        .upsert(
          {
            sale_summary_id: saleSummaryId,
            company_name: companyName,
            total_vehicles: validatedVehicles.length,
            contacts: contacts.filter((c) => c.name) as any,
            installation_locations: installationLocations.filter((loc) => loc.city) as any,
            has_installation_particularity: !!particularityDetails,
            installation_particularity_details: particularityDetails || null,
            kickoff_notes: notes || null,
            vehicles_data: vehiclesData as any,
            approved_by: user?.id || null,
            approved_by_email: user?.email || null,
            camera_extra_sale: cameraExtraSaleData as any,
            accessories_sale: (accessoriesSaleData.length > 0 ? accessoriesSaleData : null) as any,
          },
          { onConflict: "sale_summary_id", ignoreDuplicates: false },
        );

      if (historyError) throw historyError;

      // Invalidar cache imediatamente para evitar exibição de dados parciais/stale
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["kickoff-history"] }),
        queryClient.invalidateQueries({ queryKey: ["kickoff-data"] }),
        queryClient.invalidateQueries({ queryKey: ["kickoff-integrity"] }),
        queryClient.invalidateQueries({ queryKey: ["kickoff-dates"] }),
      ]);



      // Process vehicles for homologation after kickoff completion (apenas veículos validados)
      console.log("Processing kickoff vehicles for homologation...");
      const validatedVehicleIds = Array.from(validatedPlates);
      const processingResult = await processKickoffVehicles(saleSummaryId, validatedVehicleIds);

      // Registrar log do kickoff aprovado
      await logCreate("Kickoff", "kickoff", saleSummaryId.toString());

      if (!processingResult.success) {
        console.error("Errors during vehicle processing:", processingResult.errors);
        toast.error(`Kickoff salvo, mas houve erros ao processar veículos: ${processingResult.errors.join(", ")}`);
      } else {
        const messages = [];
        if (processingResult.homologations_created > 0) {
          messages.push(`${processingResult.homologations_created} homologação(ões) criada(s)`);
        }
        if (processingResult.already_homologated_count > 0) {
          messages.push(`${processingResult.already_homologated_count} veículo(s) já homologado(s)`);
        }

        toast.success(`Kickoff finalizado com sucesso! ${messages.join(", ")}`);
      }

      // Refetch final após processamento dos veículos
      await queryClient.invalidateQueries({ queryKey: ["kickoff-history"] });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving kickoff details:", error);
      toast.error("Erro ao salvar detalhes do kickoff");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] xl:max-w-[90vw] 2xl:max-w-[85vw] h-[90vh] flex flex-col p-0"
        aria-describedby="kickoff-details-desc"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pr-8">
            <DialogTitle className="text-base sm:text-lg">Detalhes do Kickoff - {companyName}</DialogTitle>
            {previousKickoff && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 w-full sm:w-auto"
                onClick={applyPreviousKickoff}
              >
                <HistoryIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">Utilizar kickoff anterior</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  ({new Date(previousKickoff.approved_at).toLocaleDateString("pt-BR")})
                </span>
              </Button>
            )}
          </div>
        </DialogHeader>

        <p id="kickoff-details-desc" className="sr-only">
          Preencha os detalhes do kickoff do cliente {companyName}.
        </p>

        <ScrollArea className="flex-1 px-6">
          <form id="kickoff-form" onSubmit={handleSubmit} className="space-y-6 py-4">
            {/* Vehicles Section */}
            <div className="space-y-4 border rounded-lg p-4 shadow-sm bg-card">
              <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Validação de Frota</h3>
              </div>

              {/* Customer Info Card - Executive Summary */}
              {customerInfo && (
                <div className="rounded-xl border bg-card shadow-sm mb-4 overflow-hidden">
                  {/* Header: Client name + Status badge */}
                  <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Cliente</p>
                      <h4 className="text-lg font-bold text-foreground leading-tight truncate">{customerInfo.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{customerInfo.cnpj !== "Não informado" ? `CNPJ/CPF: ${customerInfo.cnpj}` : ""}</p>
                    </div>
                    {kickoffCreatedAt && (
                      <Badge variant="outline" className="shrink-0 text-xs font-medium border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                        Em andamento há {calculateDaysSinceKickoff()} dias
                      </Badge>
                    )}
                  </div>

                  {/* Content: Two grouped sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-0 border-t">
                    {/* Contact Section */}
                    <div className="px-5 py-4 md:border-r">
                      <div className="flex items-center gap-1.5 mb-3">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contato</p>
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 group">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-xs text-muted-foreground w-20 shrink-0">Telefone</span>
                            <span className="text-sm font-medium text-foreground truncate">{customerInfo.phone}</span>
                          </div>
                          {customerInfo.phone !== "Não informado" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              onClick={() => {
                                navigator.clipboard.writeText(customerInfo.phone);
                                toast.success("Telefone copiado!");
                              }}
                            >
                              <FileText className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-20 shrink-0">CNPJ/CPF</span>
                          <span className="text-sm font-medium text-foreground truncate">{customerInfo.cnpj}</span>
                        </div>
                      </div>
                    </div>

                    {/* Address Section */}
                    <div className="px-5 py-4 border-t md:border-t-0">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endereço</p>
                        </div>
                        {customerInfo.street !== "Não informado" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              const fullAddress = `${customerInfo.street}, ${customerInfo.number} - ${customerInfo.neighborhood}, ${customerInfo.city}/${customerInfo.state} - CEP ${customerInfo.cep}`;
                              navigator.clipboard.writeText(fullAddress);
                              toast.success("Endereço copiado!");
                            }}
                          >
                            Copiar endereço
                          </Button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-foreground">
                          {customerInfo.street}{customerInfo.number !== "S/N" ? `, ${customerInfo.number}` : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {customerInfo.neighborhood}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {customerInfo.city}{customerInfo.state !== "Não informado" ? ` / ${customerInfo.state}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          CEP: {customerInfo.cep}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                  setVehicleVideoMonitoring((prev) => {
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
                  setValidatedPlates((prev) => {
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
                  setVehicleCameraExtra((prev) => {
                    const newMap = new Map(prev);
                    newMap.set(vehicleId, quantity);
                    return newMap;
                  });
                }}
                onValidateAll={(validated) => {
                  setValidatedPlates((prev) => {
                    if (validated) {
                      return new Set(vehicles.map((v) => v.id));
                    } else {
                      return new Set();
                    }
                  });
                }}
              />
            </div>

            {copilotoVehicles.length > 0 && (
              <div className="space-y-4 border rounded-lg p-4 shadow-sm bg-card">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Localização</h3>
                </div>

                {Array.from(
                  copilotoVehicles.reduce((groups, vehicle) => {
                    const groupKey = getCopilotoGroupKey(vehicle);
                    const group = groups.get(groupKey) || [];
                    group.push(vehicle);
                    groups.set(groupKey, group);
                    return groups;
                  }, new Map<string, KickoffVehicle[]>()),
                ).map(([groupKey, groupVehicles]) => {
                  const vehicle = groupVehicles[0];
                  if (!vehicle) return null;
                  const baseCameras = getBaseCopilotoCameraCount(vehicle.usage_type);
                  const camerasPerVehicle = getCopilotoCameraTotal(vehicle);
                  const vehicleQuantity = groupVehicles.reduce(
                    (sum, item) => sum + Math.max(1, Number(item.quantity) || 1),
                    0,
                  );
                  const totalSoldCameras = groupVehicles.reduce(
                    (sum, item) => sum + getCopilotoTotalSoldCameras(item),
                    0,
                  );
                  const points = copilotoCameraPlacements.get(groupKey) || [];
                  const vehicleType = copilotoVehicleTypes.get(groupKey) || "truck";
                  const isComplete = points.length === camerasPerVehicle;
                  const getPointNumber = (pointId: string) => points.findIndex((point) => point.id === pointId) + 1;

                  return (
                    <div key={groupKey} className="space-y-4 rounded-lg border p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">
                              Copiloto {baseCameras} Câmeras
                            </span>
                            <Badge variant="outline">{vehicleQuantity} veículo(s)</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Marque todas as câmeras do grupo (soma de todos os veículos, incluindo câmeras extras).
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
                            <div className="rounded-md border bg-muted/40 px-3 py-2 text-center">
                              <p className="text-xs text-muted-foreground">Veículos</p>
                              <p className="font-semibold">{vehicleQuantity}</p>
                            </div>
                            <div className="rounded-md border bg-muted/40 px-3 py-2 text-center">
                              <p className="text-xs text-muted-foreground">Total de câmeras</p>
                              <p className="font-semibold">{totalSoldCameras}</p>
                            </div>
                          </div>
                          <Badge variant={isComplete ? "default" : "outline"} className="h-10 justify-center px-3">
                            {points.length}/{camerasPerVehicle} marcadas
                          </Badge>
                        </div>
                      </div>

                      <Tabs
                        value={vehicleType}
                        onValueChange={(value) => handleVehicleTypeChange(groupKey, value as VehicleBodyType)}
                      >
                        <TabsList className="grid w-full max-w-sm grid-cols-2">
                          <TabsTrigger value="truck">Caminhão</TabsTrigger>
                          <TabsTrigger value="bus">Ônibus</TabsTrigger>
                        </TabsList>
                        {(["truck", "bus"] as const).map((type) => (
                          <TabsContent key={type} value={type} className="mt-4">
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                              {CAMERA_AREAS_BY_VEHICLE[type].map((area) => (
                                <CameraPlacementImage
                                  key={area}
                                  area={area}
                                  points={points.filter((point) => point.area === area)}
                                  canAdd={points.length < camerasPerVehicle}
                                  onAdd={(event) => handleCameraPlacementAdd(groupKey, area, event)}
                                  onRemove={(pointId) => handleCameraPlacementRemove(groupKey, pointId)}
                                  getPointNumber={getPointNumber}
                                />
                              ))}
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>

                      <div>
                        <Label className="text-sm">Observação das câmeras (opcional)</Label>
                        <Textarea
                          value={copilotoCameraObservations.get(groupKey) || ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setCopilotoCameraObservations((prev) => {
                              const next = new Map(prev);
                              next.set(groupKey, value);
                              return next;
                            });
                          }}
                          placeholder="Ex.: câmera 3 com ângulo voltado para a lateral direita, câmera extra no baú..."
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Câmeras Extras Section - Only show if any vehicle has camera extra */}
            {vehiclesWithCameraExtra.length > 0 && (
              <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Camera className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Câmeras Extras</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure a quantidade e localização das câmeras extras para cada veículo.
                </p>
                {vehiclesWithCameraExtra.map((vehicle) => {
                  const cameraAccessory = vehicle.modules.find((m) => {
                    const normalizedName = normalizeForSearch(m.name);
                    return normalizedName.includes("camera extra") || normalizedName.includes("camara extra");
                  });
                  return (
                    <div key={vehicle.id} className="border rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold">
                            {vehicle.brand} {vehicle.model}
                          </span>
                          {vehicle.plate && (
                            <Badge variant="secondary" className="ml-2">
                              {vehicle.plate}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm">Quantidade de câmeras extras</Label>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={vehicleCameraExtra.get(vehicle.id) || 1}
                            onChange={(e) => {
                              const quantity = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
                              setVehicleCameraExtra((prev) => {
                                const newMap = new Map(prev);
                                newMap.set(vehicle.id, quantity);
                                return newMap;
                              });
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Local onde ficarão as câmeras extras</Label>
                          <Input
                            value={cameraExtraLocations.get(vehicle.id) || ""}
                            onChange={(e) => {
                              setCameraExtraLocations((prev) => {
                                const newMap = new Map(prev);
                                newMap.set(vehicle.id, e.target.value);
                                return newMap;
                              });
                            }}
                            placeholder="Ex: Cabine, Baú, Lateral direita..."
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}


            {/* Contatos */}
            <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Contatos</h3>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addContact}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Contato
                </Button>
              </div>
              {contacts.map((contact, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <Select value={contact.type} onValueChange={(value) => updateContact(index, "type", value)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="decisor">Decisor</SelectItem>
                        <SelectItem value="influenciador">Influenciador</SelectItem>
                        <SelectItem value="operacoes">Operações</SelectItem>
                        <SelectItem value="ponto_focal">Ponto focal da implantação</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeContact(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label>Nome</Label>
                      <Input value={contact.name} onChange={(e) => updateContact(index, "name", e.target.value)} />
                    </div>
                    <div>
                      <Label>Função</Label>
                      <Input value={contact.role} onChange={(e) => updateContact(index, "role", e.target.value)} />
                    </div>
                    <div>
                      <Label>E-mail</Label>
                      <Input
                        type="email"
                        value={contact.email}
                        onChange={(e) => updateContact(index, "email", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input value={contact.phone} onChange={(e) => updateContact(index, "phone", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Locais de Instalação */}
            <InstallationLocationsSection
              installationLocations={installationLocations}
              allPlates={allPlates}
              onAddLocation={addLocation}
              onRemoveLocation={removeLocation}
              onUpdateLocation={updateLocation}
              onUpdateLocationMultiple={updateLocationMultiple}
              onSetPlatesForLocation={(locIndex, plates) => {
                setInstallationLocations((prev) => {
                  const updated = [...prev];
                  updated[locIndex] = { ...updated[locIndex], plates };
                  return updated;
                });
              }}
              cepLoading={cepLoading}
              onFetchCEP={fetchAndFillCEP}
            />

            {/* Particularidade de Instalação */}
            <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="flex items-center gap-2 mb-3 cursor-help">
                      <Settings className="h-5 w-5 text-primary" />
                      <h3 className="font-bold text-lg">Particularidades da Instalação</h3>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm text-sm p-3">
                    <p>São condições específicas definidas pelo cliente que influenciam como e quando a instalação será realizada. Podem envolver aspectos operacionais, como horário preferido, liberação parcial da frota ou tempo máximo de parada.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Textarea
                value={particularityDetails}
                onChange={(e) => setParticularityDetails(e.target.value)}
                placeholder="Descreva as particularidades de instalação..."
                rows={4}
              />
            </div>

            {/* Objetivo principal do cliente */}
            <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">
                  Objetivo principal do cliente <span className="text-destructive">*</span>
                </h3>
              </div>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Descreva o objetivo principal do cliente..."
                rows={4}
                required
              />
            </div>
          </form>
        </ScrollArea>

        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={loading || !isFormValid}
            onClick={() => {
              if (!isFormValid) return;
              setConfirmOpen(true);
            }}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Package className="h-4 w-4 mr-2" />
            Realizar Kickoff
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar conclusão do Kickoff</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a finalizar o Kickoff de <strong>{companyName}</strong> com{" "}
            <strong>{validatedPlates.size}</strong> veículo(s) validado(s).
            <br />
            Após a confirmação, os veículos sairão da tela de Kickoff Pendente e serão enviados
            para homologação. Deseja continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              setConfirmOpen(false);
              setTimeout(() => {
                handleSubmit({ preventDefault: () => {} } as React.FormEvent);
              }, 0);
            }}
          >
            Sim, concluir Kickoff
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

