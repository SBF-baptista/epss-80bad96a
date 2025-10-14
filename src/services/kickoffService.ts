import { supabase } from "@/integrations/supabase/client";

export interface KickoffUsageType {
  sale_summary_id: number;
  company_name: string;
  usage_type: string;
  quantity: number;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_year: number;
}

export interface KickoffModule {
  name: string;
  quantity: number;
  categories: string;
}

export interface KickoffVehicle {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  plate: string | null;
  usage_type: string;
  quantity: number;
  kickoff_completed: boolean;
  modules: KickoffModule[];
}

export interface KickoffClient {
  sale_summary_id: number;
  company_name: string;
  needs_blocking: boolean;
  has_kickoff_details: boolean;
  contacts?: any[];
  total_quantity: number;
  total_vehicles: number;
  usage_types: KickoffUsageType[];
  vehicles: KickoffVehicle[];
}

export interface KickoffSummary {
  total_vehicles: number;
  total_companies: number;
  clients: KickoffClient[];
}

export const getKickoffData = async (): Promise<KickoffSummary> => {
  // Buscar todos os incoming_vehicles do Segsale (com sale_summary_id)
  const { data: vehicles, error } = await supabase
    .from('incoming_vehicles')
    .select('id, usage_type, company_name, quantity, sale_summary_id, brand, vehicle, year, plate, kickoff_completed')
    .not('sale_summary_id', 'is', null)
    .order('company_name');
  
  if (error) {
    console.error('Error fetching kickoff vehicles:', error);
    throw error;
  }

  // Buscar módulos/acessórios dos veículos
  const vehicleIds = vehicles?.map(v => v.id) || [];
  const { data: accessories } = await supabase
    .from('accessories')
    .select('vehicle_id, name, quantity, categories')
    .in('vehicle_id', vehicleIds);

  // Buscar customers para pegar informações de kickoff
  const { data: customers } = await supabase
    .from('customers')
    .select('sale_summary_id, needs_blocking, contacts')
    .not('sale_summary_id', 'is', null);

  if (!vehicles || vehicles.length === 0) {
    return {
      total_vehicles: 0,
      total_companies: 0,
      clients: []
    };
  }

  // Criar mapa de customers por sale_summary_id
  const customerMap = new Map(
    customers?.map(c => [c.sale_summary_id, c]) || []
  );

  // Criar mapa de módulos por vehicle_id
  const modulesMap = new Map<string, KickoffModule[]>();
  accessories?.forEach(acc => {
    if (acc.vehicle_id) {
      if (!modulesMap.has(acc.vehicle_id)) {
        modulesMap.set(acc.vehicle_id, []);
      }
      modulesMap.get(acc.vehicle_id)!.push({
        name: acc.name,
        quantity: acc.quantity,
        categories: acc.categories || 'Acessórios'
      });
    }
  });

  // Agrupar por company_name (cliente único)
  const clientsMap = new Map<string, KickoffClient>();
  let totalVehicles = 0;

  vehicles.forEach(vehicle => {
    const quantity = vehicle.quantity || 1;
    totalVehicles += quantity;
    
    const companyKey = (vehicle.company_name || 'Não identificado').trim().toUpperCase();
    const saleSummaryId = vehicle.sale_summary_id!;

    if (!clientsMap.has(companyKey)) {
      // Buscar customer data - preferir o que tem contatos
      const customer = customerMap.get(saleSummaryId);
      const customerContacts = Array.isArray(customer?.contacts) ? customer.contacts : [];
      
      clientsMap.set(companyKey, {
        sale_summary_id: saleSummaryId,
        company_name: vehicle.company_name || 'Não identificado',
        needs_blocking: customer?.needs_blocking || false,
        has_kickoff_details: customerContacts.length > 0,
        contacts: customerContacts,
        total_quantity: 0,
        total_vehicles: 0,
        usage_types: [],
        vehicles: []
      });
    }

    const client = clientsMap.get(companyKey)!;
    
    // Atualizar informações se encontrar um customer com mais dados
    const customer = customerMap.get(saleSummaryId);
    if (customer && Array.isArray(customer.contacts) && customer.contacts.length > 0 && client.contacts?.length === 0) {
      client.contacts = customer.contacts;
      client.has_kickoff_details = true;
      client.needs_blocking = customer.needs_blocking || client.needs_blocking;
    }
    
    client.total_quantity += quantity;
    client.total_vehicles += 1;
    client.usage_types.push({
      sale_summary_id: saleSummaryId,
      company_name: vehicle.company_name || 'Não identificado',
      usage_type: vehicle.usage_type || 'Não especificado',
      quantity: quantity,
      vehicle_brand: vehicle.brand || '',
      vehicle_model: vehicle.vehicle || '',
      vehicle_year: vehicle.year || 0
    });
    
    // Add vehicle to the vehicles array
    client.vehicles.push({
      id: vehicle.id,
      brand: vehicle.brand || '',
      model: vehicle.vehicle || '',
      year: vehicle.year || null,
      plate: vehicle.plate || null,
      usage_type: vehicle.usage_type || 'Não especificado',
      quantity: quantity,
      kickoff_completed: vehicle.kickoff_completed || false,
      modules: modulesMap.get(vehicle.id) || []
    });
  });

  const clients = Array.from(clientsMap.values())
    .sort((a, b) => a.company_name.localeCompare(b.company_name));

  return {
    total_vehicles: totalVehicles,
    total_companies: clientsMap.size,
    clients
  };
};
