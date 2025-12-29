import { supabase } from "@/integrations/supabase/client";

export interface IncomingVehicle {
  id: string;
  plate: string | null;
  brand: string;
  vehicle: string;
  year: number | null;
  company_name: string | null;
  received_at: string;
  sale_summary_id: number | null;
  usage_type: string | null;
}

export const getIncomingVehiclesBySaleSummary = async (saleSummaryId: number): Promise<IncomingVehicle[]> => {
  try {
    const { data, error } = await supabase
      .from('incoming_vehicles')
      .select('id, plate, brand, vehicle, year, company_name, received_at, sale_summary_id, usage_type')
      .eq('sale_summary_id', saleSummaryId)
      .order('received_at', { ascending: false });

    if (error) {
      console.error('Error fetching incoming vehicles by sale_summary_id:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getIncomingVehiclesBySaleSummary:', error);
    throw error;
  }
};

export const resolveIncomingVehicleId = async (
  customerCompanyName: string | null | undefined,
  saleSummaryId: number | null | undefined,
  vehicle: {
    plate?: string;
    brand: string;
    model: string;
    year?: number;
  }
): Promise<string | null> => {
  try {
    // Priority 1: By plate (if available and not "Placa pendente")
    if (vehicle.plate && vehicle.plate !== 'Placa pendente') {
      const { data, error } = await supabase
        .from('incoming_vehicles')
        .select('id')
        .eq('plate', vehicle.plate)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return data.id;
      }
    }

    // Priority 2: By sale_summary_id + brand + model match
    if (saleSummaryId) {
      const firstToken = vehicle.model?.split(' ')?.[0] || vehicle.model;
      let query = supabase
        .from('incoming_vehicles')
        .select('id')
        .eq('sale_summary_id', saleSummaryId)
        .eq('brand', vehicle.brand)
        .ilike('vehicle', `%${firstToken}%`);

      if (vehicle.year) {
        query = query.eq('year', vehicle.year);
      }

      const { data, error } = await query
        .order('received_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return data.id;
      }
    }

    // Priority 3: By company_name + brand + model + time window
    if (customerCompanyName) {
      const firstToken = vehicle.model?.split(' ')?.[0] || vehicle.model;
      const { data, error } = await supabase
        .from('incoming_vehicles')
        .select('id, received_at')
        .eq('company_name', customerCompanyName)
        .eq('brand', vehicle.brand)
        .ilike('vehicle', `%${firstToken}%`)
        .order('received_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return data.id;
      }
    }

    return null;
  } catch (error) {
    console.error('Error in resolveIncomingVehicleId:', error);
    return null;
  }
};
