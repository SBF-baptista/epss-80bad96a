import { supabase } from "@/integrations/supabase/client";

export interface VehicleAccessory {
  id: string;
  accessory_name: string;
  quantity: number;
  company_name?: string;
  usage_type?: string;
  vehicle_id?: string;
}

export const fetchVehicleAccessories = async (vehicleId: string): Promise<VehicleAccessory[]> => {
  try {
    const { data, error } = await supabase
      .from('accessories')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('accessory_name');

    if (error) {
      console.error('Error fetching vehicle accessories:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchVehicleAccessories:', error);
    throw error;
  }
};

export const fetchAllVehicleAccessories = async (): Promise<Map<string, VehicleAccessory[]>> => {
  try {
    const { data, error } = await supabase
      .from('accessories')
      .select('*')
      .not('vehicle_id', 'is', null)
      .order('accessory_name');

    if (error) {
      console.error('Error fetching all vehicle accessories:', error);
      throw error;
    }

    const accessoriesByVehicle = new Map<string, VehicleAccessory[]>();
    
    if (data) {
      data.forEach((accessory) => {
        if (accessory.vehicle_id) {
          if (!accessoriesByVehicle.has(accessory.vehicle_id)) {
            accessoriesByVehicle.set(accessory.vehicle_id, []);
          }
          accessoriesByVehicle.get(accessory.vehicle_id)!.push(accessory);
        }
      });
    }

    return accessoriesByVehicle;
  } catch (error) {
    console.error('Error in fetchAllVehicleAccessories:', error);
    throw error;
  }
};