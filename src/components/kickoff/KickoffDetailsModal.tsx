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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Truck, Users, MapPin, Settings, FileText, Package, Camera } from "lucide-react";
import { processKickoffVehicles } from "@/services/kickoffProcessingService";
import type { KickoffVehicle } from "@/services/kickoffService";
import { fetchSegsaleProductsDirect } from "@/services/segsaleService";
import { KickoffVehiclesTable } from "./KickoffVehiclesTable";

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
}

interface Contact {
  type: "decisor" | "influenciador" | "operacoes" | "ponto_focal";
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
    { cep: "", state: "", city: "", neighborhood: "", street: "" },
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

  const [validatedPlates, setValidatedPlates] = useState<Set<string>>(new Set());

  // Camera extras sale state
  const [cameraExtraSale, setCameraExtraSale] = useState<{ quantity: number | ""; unitPrice: number | "" }>({
    quantity: "",
    unitPrice: "",
  });
  // Accessories sale state - supports multiple items
  interface AccessorySaleItem {
    description: string;
    quantity: number | "";
    unitPrice: number | "";
  }
  const [accessoriesSaleItems, setAccessoriesSaleItems] = useState<AccessorySaleItem[]>([
    { description: "", quantity: "", unitPrice: "" },
  ]);

  const addAccessorySaleItem = () => {
    setAccessoriesSaleItems((prev) => [...prev, { description: "", quantity: "", unitPrice: "" }]);
  };

  const removeAccessorySaleItem = (index: number) => {
    setAccessoriesSaleItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAccessorySaleItem = (index: number, field: keyof AccessorySaleItem, value: string | number | "") => {
    setAccessoriesSaleItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Helper to normalize text for accessory detection
  const normalizeForSearch = (text: string): string => {
    return (text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Identify vehicles with "camera extra" accessory
  const vehiclesWithCameraExtra = useMemo(() => {
    return vehicles.filter((vehicle) => {
      return vehicle.modules.some((m) => {
        const normalizedName = normalizeForSearch(m.name);
        return normalizedName.includes("camera extra") || normalizedName.includes("camara extra");
      });
    });
  }, [vehicles]);

  // Load existing customer data when modal opens
  useEffect(() => {
    if (open && saleSummaryId) {
      loadCustomerData();
      checkAndBackfillAccessories();
    }
  }, [open, saleSummaryId]);

  const checkAndBackfillAccessories = async () => {
    try {
      // 1. Get incoming_vehicles for this sale_summary_id
      const { data: incomingVehicles } = await supabase
        .from("incoming_vehicles")
        .select("id")
        .eq("sale_summary_id", saleSummaryId);

      if (!incomingVehicles || incomingVehicles.length === 0) {
        console.log(`No incoming vehicles found for sale_summary_id ${saleSummaryId}`);
        return;
      }

      // 2. Check if accessories already exist for these vehicles
      const { data: existingAccessories } = await supabase
        .from("accessories")
        .select("id")
        .in(
          "vehicle_id",
          incomingVehicles.map((v) => v.id),
        );

      // 3. If no accessories found, import from Segsale
      if (!existingAccessories || existingAccessories.length === 0) {
        console.log(`No accessories found for sale_summary_id ${saleSummaryId}, importing from Segsale...`);
        toast.info("Importando módulos e acessórios do Segsale...");

        try {
          await fetchSegsaleProductsDirect(saleSummaryId);
          toast.success("Módulos e acessórios importados com sucesso!");

          // Refetch kickoff data to update UI
          setTimeout(() => {
            onSuccess();
          }, 1000);
        } catch (error) {
          console.error("Error importing from Segsale:", error);
          toast.error("Erro ao importar dados do Segsale");
        }
      } else {
        console.log(`Found ${existingAccessories.length} accessories for sale_summary_id ${saleSummaryId}`);
      }
    } catch (error) {
      console.error("Error checking accessories:", error);
    }
  };

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
        setCustomerInfo({
          name: customerData.company_name || customerData.name || companyName || "Cliente não identificado",
          services: modules,
          city: customerData.address_city || "Não informado",
          state: customerData.address_state || "Não informado",
        });
      } else {
        // If no customer data, get from incoming_vehicles
        const { data: vehicleData } = await supabase
          .from("incoming_vehicles")
          .select("company_name, address_city, received_at")
          .eq("sale_summary_id", saleSummaryId)
          .order("received_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (vehicleData) {
          setKickoffCreatedAt(new Date(vehicleData.received_at));

          setCustomerInfo({
            name: vehicleData.company_name || companyName || "Cliente não identificado",
            services: [],
            city: vehicleData.address_city || "Não informado",
            state: "SP",
          });
        } else {
          // Final fallback
          setCustomerInfo({
            name: companyName || "Cliente não identificado",
            services: [],
            city: "Não informado",
            state: "Não informado",
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
      // Set basic info from props as fallback
      setCustomerInfo({
        name: companyName || "Cliente não identificado",
        services: [],
        city: "Não informado",
        state: "Não informado",
      });
    }
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
      { cep: "", state: "", city: "", neighborhood: "", street: "" },
    ]);
  };

  const removeLocation = (index: number) => {
    setInstallationLocations(installationLocations.filter((_, i) => i !== index));
  };

  const updateLocation = (index: number, field: keyof InstallationLocation, value: string) => {
    const updated = [...installationLocations];
    updated[index][field] = value;
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

  // Validation checks
  const hasValidLocations = installationLocations.some((loc) => loc.city.trim() !== "" && loc.state.trim() !== "");
  const hasAtLeastOneValidatedPlate = validatedPlates.size > 0;
  const isFormValid = hasAtLeastOneValidatedPlate && hasValidLocations;

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
      }

      // Get current user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Prepare sales data
      const cameraExtraSaleData =
        (Number(cameraExtraSale.quantity) || 0) > 0
          ? {
              quantity: Number(cameraExtraSale.quantity) || 0,
              unitPrice: Number(cameraExtraSale.unitPrice) || 0,
              total: (Number(cameraExtraSale.quantity) || 0) * (Number(cameraExtraSale.unitPrice) || 0),
            }
          : null;

      const accessoriesSaleData = accessoriesSaleItems
        .filter((item) => item.description.trim() !== "" && (Number(item.quantity) || 0) > 0)
        .map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          total: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        }));

      // Save to kickoff history
      const { error: historyError } = await supabase.from("kickoff_history").insert({
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
        camera_extra_sale: cameraExtraSaleData as any,
        accessories_sale: (accessoriesSaleData.length > 0 ? accessoriesSaleData : null) as any,
      });

      if (historyError) throw historyError;

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] xl:max-w-[90vw] 2xl:max-w-[85vw] h-[90vh] flex flex-col p-0"
        aria-describedby="kickoff-details-desc"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Detalhes do Kickoff - {companyName}</DialogTitle>
        </DialogHeader>
        <p id="kickoff-details-desc" className="sr-only">
          Preencha os detalhes do kickoff do cliente {companyName}.
        </p>

        <ScrollArea className="flex-1 px-6">
          <form id="kickoff-form" onSubmit={handleSubmit} className="space-y-6 py-4">
            {/* Vehicles Section */}
            <div className="space-y-4 border rounded-lg p-4 shadow-sm bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Validação de Frota</h3>
                </div>
                {kickoffCreatedAt && (
                  <div className="text-sm text-muted-foreground">
                    Kickoff em andamento há{" "}
                    <span className="font-semibold text-foreground">{calculateDaysSinceKickoff()}</span> dias
                  </div>
                )}
              </div>

              {/* Customer Info Card */}
              {customerInfo && (
                <div className="bg-muted/50 border rounded-lg p-3 mb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nome do Cliente</Label>
                      <p className="font-semibold mt-1">{customerInfo.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Cidade</Label>
                      <p className="font-semibold mt-1">{customerInfo.city}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Estado</Label>
                      <p className="font-semibold mt-1">{customerInfo.state}</p>
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

            {/* Venda Câmeras Extras */}
            <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">Câmeras Extras</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min={0}
                    value={cameraExtraSale.quantity === "" ? "" : cameraExtraSale.quantity}
                    onChange={(e) =>
                      setCameraExtraSale((prev) => ({
                        ...prev,
                        quantity: e.target.value === "" ? "" : parseInt(e.target.value) || 0,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Valor unitário (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={cameraExtraSale.unitPrice === "" ? "" : cameraExtraSale.unitPrice}
                    onChange={(e) =>
                      setCameraExtraSale((prev) => ({
                        ...prev,
                        unitPrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Total (R$)</Label>
                  <Input
                    type="text"
                    readOnly
                    value={(
                      (Number(cameraExtraSale.quantity) || 0) * (Number(cameraExtraSale.unitPrice) || 0)
                    ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    className="mt-1 bg-muted"
                  />
                </div>
              </div>
            </div>

            {/* Venda de Acessórios */}
            <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Venda de Acessórios</h3>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addAccessorySaleItem}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
              <div className="space-y-3">
                {accessoriesSaleItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_120px_120px_40px] gap-3 items-end">
                    <div>
                      <Label>Descrição</Label>
                      <Input
                        placeholder="Ex: Sensor de temperatura"
                        value={item.description}
                        onChange={(e) => updateAccessorySaleItem(idx, "description", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Qtd</Label>
                      <Input
                        type="number"
                        min={0}
                        value={item.quantity === "" ? "" : item.quantity}
                        onChange={(e) =>
                          updateAccessorySaleItem(
                            idx,
                            "quantity",
                            e.target.value === "" ? "" : parseInt(e.target.value) || 0,
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Valor unit. (R$)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitPrice === "" ? "" : item.unitPrice}
                        onChange={(e) =>
                          updateAccessorySaleItem(
                            idx,
                            "unitPrice",
                            e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Total (R$)</Label>
                      <Input
                        type="text"
                        readOnly
                        value={((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                        className="mt-1 bg-muted"
                      />
                    </div>
                    <div>
                      {accessoriesSaleItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAccessorySaleItem(idx)}
                          className="mt-1"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
            <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Locais de Instalação</h3>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addLocation}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Local
                </Button>
              </div>
              {installationLocations.map((location, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Local {index + 1}</span>
                    {installationLocations.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeLocation(index)}>
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
                            updateLocation(index, "cep", formatted);
                            // Auto-fetch when a valid CEP is typed
                            if (isValidCEP(formatted)) {
                              fetchAndFillCEP(index, formatted);
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
                        onChange={(e) => updateLocation(index, "state", e.target.value)}
                        placeholder="UF"
                        maxLength={2}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Cidade</Label>
                      <Input
                        value={location.city}
                        onChange={(e) => updateLocation(index, "city", e.target.value)}
                        placeholder="Cidade"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Bairro</Label>
                      <Input
                        value={location.neighborhood || ""}
                        onChange={(e) => updateLocation(index, "neighborhood", e.target.value)}
                        placeholder="Bairro"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Logradouro/Nome</Label>
                      <Input
                        value={location.street || ""}
                        onChange={(e) => updateLocation(index, "street", e.target.value)}
                        placeholder="Rua, Avenida..."
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Particularidade de Instalação */}
            <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">Particularidades da Instalação</h3>
              </div>
              <Textarea
                value={particularityDetails}
                onChange={(e) => setParticularityDetails(e.target.value)}
                placeholder="Descreva as particularidades de instalação..."
                rows={4}
              />
            </div>

            {/* Observações */}
            <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">Observações</h3>
              </div>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações gerais do kickoff..."
                rows={4}
              />
            </div>
          </form>
        </ScrollArea>

        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="kickoff-form" disabled={loading || !isFormValid}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Package className="h-4 w-4 mr-2" />
            Realizar Kickoff
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
