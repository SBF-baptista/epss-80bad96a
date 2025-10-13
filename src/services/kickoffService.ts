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

export interface KickoffClient {
  sale_summary_id: number;
  company_name: string;
  needs_blocking: boolean;
  has_kickoff_details: boolean;
  contacts?: any[];
  total_quantity: number;
  total_vehicles: number;
  usage_types: KickoffUsageType[];
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
    .select('usage_type, company_name, quantity, sale_summary_id, brand, vehicle, year')
    .not('sale_summary_id', 'is', null)
    .order('company_name');

  if (error) {
    console.error('Error fetching kickoff data:', error);
    throw error;
  }

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

  // Agrupar por cliente (sale_summary_id)
  const clientsMap = new Map<number, KickoffClient>();
  let totalVehicles = 0;

  vehicles.forEach(vehicle => {
    const saleSummaryId = vehicle.sale_summary_id!;
    const quantity = vehicle.quantity || 1;
    totalVehicles += quantity;

    if (!clientsMap.has(saleSummaryId)) {
      const customer = customerMap.get(saleSummaryId);
      const customerContacts = Array.isArray(customer?.contacts) ? customer.contacts : [];
      clientsMap.set(saleSummaryId, {
        sale_summary_id: saleSummaryId,
        company_name: vehicle.company_name || 'Não identificado',
        needs_blocking: customer?.needs_blocking || false,
        has_kickoff_details: customerContacts.length > 0,
        contacts: customerContacts,
        total_quantity: 0,
        total_vehicles: 0,
        usage_types: []
      });
    }

    const client = clientsMap.get(saleSummaryId)!;
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
  });

  const clients = Array.from(clientsMap.values())
    .sort((a, b) => a.company_name.localeCompare(b.company_name));

  return {
    total_vehicles: totalVehicles,
    total_companies: clientsMap.size,
    clients
  };
};
