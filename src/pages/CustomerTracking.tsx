import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { CustomerTrackingFilters } from "@/components/customer-tracking/CustomerTrackingFilters";
import { CustomerCard } from "@/components/customer-tracking/CustomerCard";
import { getCustomers, Customer } from "@/services/customerService";
import { getKitSchedules, KitScheduleWithDetails } from "@/services/kitScheduleService";
import { fetchHomologationKits, HomologationKit } from "@/services/homologationKitService";
import { checkMultipleKitsHomologation } from "@/services/kitHomologationService";
import Navigation from "@/components/Navigation";
import { Loader2 } from "lucide-react";
import { createTestCustomerWithAccessoriesAndSupplies } from "@/services/customerService";
import { Button } from "@/components/ui/button";

interface CustomerKitData {
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
}

const CustomerTracking = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [kitSchedules, setKitSchedules] = useState<KitScheduleWithDetails[]>([]);
  const [homologationKits, setHomologationKits] = useState<HomologationKit[]>([]);
  const [kitHomologationStatus, setKitHomologationStatus] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreatingTestCustomer, setIsCreatingTestCustomer] = useState(false);

  const handleCreateTestCustomer = async () => {
    try {
      setIsCreatingTestCustomer(true);
      await createTestCustomerWithAccessoriesAndSupplies();
      toast({
        title: "Sucesso",
        description: "Cliente de teste criado com acessórios e insumos!",
      });
      await loadData();
    } catch (error) {
      console.error('Error creating test customer:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar cliente de teste",
        variant: "destructive"
      });
    } finally {
      setIsCreatingTestCustomer(false);
    }
  };

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
        homologationStatus
      };
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Acompanhamento de Clientes</h1>
          <Navigation />
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Acompanhamento de Clientes</h1>
        <Navigation />
      </div>

      <div className="mb-4 flex gap-4 items-center">
        <div className="flex-1">
          <CustomerTrackingFilters
            onSearch={handleSearch}
            searchTerm={searchTerm}
          />
        </div>
        <Button 
          onClick={handleCreateTestCustomer}
          disabled={isCreatingTestCustomer}
          variant="outline"
        >
          {isCreatingTestCustomer ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando...
            </>
          ) : (
            "Criar Cliente de Teste"
          )}
        </Button>
      </div>

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