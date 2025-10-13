import { supabase } from "@/integrations/supabase/client";

export interface KickoffUsageType {
  usage_type: string;
  company_name: string;
  total_quantity: number;
  vehicle_count: number;
}

export interface KickoffSummary {
  total_vehicles: number;
  total_companies: number;
  usage_types: KickoffUsageType[];
}

export const getKickoffData = async (): Promise<KickoffSummary> => {
  // Buscar todos os incoming_vehicles do Segsale (com sale_summary_id)
  const { data: vehicles, error } = await supabase
    .from('incoming_vehicles')
    .select('usage_type, company_name, quantity, sale_summary_id')
    .not('sale_summary_id', 'is', null)
    .order('company_name');

  if (error) {
    console.error('Error fetching kickoff data:', error);
    throw error;
  }

  if (!vehicles || vehicles.length === 0) {
    return {
      total_vehicles: 0,
      total_companies: 0,
      usage_types: []
    };
  }

  // Agrupar por usage_type e company_name
  const groupedMap = new Map<string, KickoffUsageType>();
  const companiesSet = new Set<string>();
  let totalVehicles = 0;

  vehicles.forEach(vehicle => {
    const key = `${vehicle.usage_type}|${vehicle.company_name}`;
    const quantity = vehicle.quantity || 1;
    
    totalVehicles += quantity;
    companiesSet.add(vehicle.company_name || 'Não identificado');

    if (groupedMap.has(key)) {
      const existing = groupedMap.get(key)!;
      existing.total_quantity += quantity;
      existing.vehicle_count += 1;
    } else {
      groupedMap.set(key, {
        usage_type: vehicle.usage_type || 'Não especificado',
        company_name: vehicle.company_name || 'Não identificado',
        total_quantity: quantity,
        vehicle_count: 1
      });
    }
  });

  const usage_types = Array.from(groupedMap.values())
    .sort((a, b) => {
      // Ordenar por usage_type, depois por company_name
      const usageCompare = a.usage_type.localeCompare(b.usage_type);
      if (usageCompare !== 0) return usageCompare;
      return a.company_name.localeCompare(b.company_name);
    });

  return {
    total_vehicles: totalVehicles,
    total_companies: companiesSet.size,
    usage_types
  };
};
