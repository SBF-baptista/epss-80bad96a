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
import { Loader2 } from "lucide-react";

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
        configuration: scheduleWithIds.configuration
      };
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Acompanhamento de Clientes</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Acompanhamento de Clientes</h1>

      <CustomerTrackingFilters
        onSearch={handleSearch}
        searchTerm={searchTerm}
      />

      <div className="space-y-6">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm ? "Nenhum cliente encontrado com os critérios de busca." : "Nenhum cliente cadastrado."}
            </p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
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