import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { CustomerTrackingFilters } from "@/components/customer-tracking/CustomerTrackingFilters";
import { CustomerCard } from "@/components/customer-tracking/CustomerCard";
import { getCustomers, Customer } from "@/services/customerService";
import { getKitSchedules, KitScheduleWithDetails } from "@/services/kitScheduleService";
import { fetchHomologationKits, HomologationKit } from "@/services/homologationKitService";
import { checkMultipleKitsHomologation } from "@/services/kitHomologationService";
import { fetchAccessoriesByVehicleIds, aggregateAccessoriesWithoutModulesToObjects, VehicleAccessory } from "@/services/vehicleAccessoryService";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users } from "lucide-react";

export interface CustomerKitData {
  id: string;
  kit_id: string;
  technician_id: string;
  scheduled_date: string;
  installation_time?: string;
  status: string;
  notes?: string;
  customer_name: string;
  technician_name?: string;
  kit?: any;
  homologationStatus?: any;
  // Vehicle data
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  vehicle_year?: number;
  incoming_vehicle_id?: string;
  // Accessories and supplies
  accessories?: { name: string; quantity: number }[];
  supplies?: string[];
  // Selected kits (multiple)
  selected_kit_ids?: string[];
  selected_kit_names?: string[];
  configuration?: string;
  // Tracking and updated_at for timeline
  tracking_code?: string;
  updated_at?: string;
  created_at?: string;
  // TomTicket protocol
  tomticket_protocol?: string;
}

const CustomerTracking = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [kitSchedules, setKitSchedules] = useState<KitScheduleWithDetails[]>([]);
  const [homologationKits, setHomologationKits] = useState<HomologationKit[]>([]);
  const [kitHomologationStatus, setKitHomologationStatus] = useState<Map<string, any>>(new Map());
  const [accessoriesByVehicle, setAccessoriesByVehicle] = useState<Map<string, VehicleAccessory[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [customersData, schedulesData, kitsData] = await Promise.all([
        getCustomers(),
        getKitSchedules(),
        fetchHomologationKits()
      ]);

      // Add safety checks for undefined data
      const safeCustomersData = customersData || [];
      const safeSchedulesData = schedulesData || [];
      const safeKitsData = kitsData || [];

      setCustomers(safeCustomersData);
      setFilteredCustomers(safeCustomersData);
      setKitSchedules(safeSchedulesData);
      setHomologationKits(safeKitsData);

      if (safeKitsData.length > 0) {
        const homologationMap = await checkMultipleKitsHomologation(safeKitsData);
        setKitHomologationStatus(homologationMap);
      }

      // Fetch accessories for all vehicles in schedules
      const vehicleIds = safeSchedulesData
        .map(s => s.incoming_vehicle_id)
        .filter((id): id is string => !!id);
      
      if (vehicleIds.length > 0) {
        const accessoriesMap = await fetchAccessoriesByVehicleIds(vehicleIds);
        setAccessoriesByVehicle(accessoriesMap);
      }
    } catch (error) {
      console.error('Error loading customer tracking data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do acompanhamento de clientes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(term.toLowerCase()) ||
      customer.document_number.includes(term)
    );
    setFilteredCustomers(filtered);
  };

  const getCustomerSchedules = (customerId: string) => {
    return kitSchedules.filter(schedule => schedule.customer_id === customerId);
  };

  const getCustomerKits = (customerId: string): CustomerKitData[] => {
    const customerSchedules = getCustomerSchedules(customerId);
    return customerSchedules.map(schedule => {
      const kit = homologationKits.find(k => k.id === schedule.kit_id);
      const homologationStatus = kit ? kitHomologationStatus.get(kit.id) : null;
      
      // Get accessories for this vehicle
      let vehicleAccessories: { name: string; quantity: number }[] = [];
      if (schedule.incoming_vehicle_id) {
        const rawAccessories = accessoriesByVehicle.get(schedule.incoming_vehicle_id) || [];
        vehicleAccessories = aggregateAccessoriesWithoutModulesToObjects(rawAccessories);
      }

      // Get selected kit names
      const scheduleWithIds = schedule as any;
      let selectedKitNames: string[] = [];
      if (scheduleWithIds.selected_kit_ids && Array.isArray(scheduleWithIds.selected_kit_ids)) {
        selectedKitNames = scheduleWithIds.selected_kit_ids
          .map((kitId: string) => homologationKits.find(k => k.id === kitId)?.name || 'Kit desconhecido')
          .filter((name: string) => name !== 'Kit desconhecido');
      }

      return {
        id: schedule.id || "",
        kit_id: schedule.kit_id,
        technician_id: schedule.technician_id,
        scheduled_date: schedule.scheduled_date,
        installation_time: schedule.installation_time,
        status: schedule.status,
        notes: schedule.notes,
        customer_name: schedule.customer_name || "",
        technician_name: schedule.technician?.name,
        kit,
        homologationStatus,
        // Vehicle data
        vehicle_brand: schedule.vehicle_brand,
        vehicle_model: schedule.vehicle_model,
        vehicle_plate: schedule.vehicle_plate,
        vehicle_year: schedule.vehicle_year,
        incoming_vehicle_id: schedule.incoming_vehicle_id,
        // Accessories and supplies
        accessories: vehicleAccessories,
        supplies: schedule.supplies || [],
        // Selected kits
        selected_kit_ids: scheduleWithIds.selected_kit_ids,
        selected_kit_names: selectedKitNames,
        configuration: scheduleWithIds.configuration,
        // Tracking and timeline data
        tracking_code: scheduleWithIds.tracking_code,
        updated_at: scheduleWithIds.updated_at,
        created_at: scheduleWithIds.created_at
      };
    });
  };

  const customersWithKits = filteredCustomers.filter(customer => getCustomerKits(customer.id!).length > 0);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-[1600px]">
        <div className="flex flex-col gap-4 bg-muted/20 rounded-xl p-4 sm:p-6 border border-border/50 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Acompanhamento de Clientes
          </h1>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando dados...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col gap-4 bg-muted/20 rounded-xl p-4 sm:p-6 border border-border/50 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Acompanhamento de Clientes
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {customersWithKits.length} cliente{customersWithKits.length !== 1 ? 's' : ''} com veículos
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <CustomerTrackingFilters
          onSearch={handleSearch}
          searchTerm={searchTerm}
        />
      </div>

      {/* Customer List */}
      <div className="space-y-4">
        {customersWithKits.length === 0 ? (
          <div className="text-center py-16 bg-muted/10 rounded-xl border border-border/30">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground">
              {searchTerm ? "Nenhum cliente encontrado com os critérios de busca." : "Nenhum cliente com informações cadastradas."}
            </p>
          </div>
        ) : (
          customersWithKits.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              customerKits={getCustomerKits(customer.id!)}
              onUpdate={loadData}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CustomerTracking;
