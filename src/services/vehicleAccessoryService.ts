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

export const fetchAccessoriesByPlates = async (plates: string[]): Promise<Map<string, VehicleAccessory[]>> => {
  try {
    if (!plates || plates.length === 0) {
      return new Map();
    }

    // First, get incoming_vehicles by plates
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('incoming_vehicles')
      .select('id, plate')
      .in('plate', plates)
      .not('plate', 'is', null);

    if (vehiclesError) {
      console.error('Error fetching vehicles by plates:', vehiclesError);
      throw vehiclesError;
    }

    if (!vehicles || vehicles.length === 0) {
      return new Map();
    }

    const vehicleIds = vehicles.map(v => v.id);
    const plateToVehicleId = new Map(vehicles.map(v => [v.plate!, v.id]));

    // Fetch accessories for these vehicle_ids
    const { data: accessories, error: accessoriesError } = await supabase
      .from('accessories')
      .select('*')
      .in('vehicle_id', vehicleIds)
      .order('accessory_name');

    if (accessoriesError) {
      console.error('Error fetching accessories by vehicle_ids:', accessoriesError);
      throw accessoriesError;
    }

    // Group by plate
    const accessoriesByPlate = new Map<string, VehicleAccessory[]>();
    
    if (accessories) {
      accessories.forEach((accessory) => {
        // Find the plate for this vehicle_id
        const plate = Array.from(plateToVehicleId.entries())
          .find(([_, vId]) => vId === accessory.vehicle_id)?.[0];
        
        if (plate) {
          if (!accessoriesByPlate.has(plate)) {
            accessoriesByPlate.set(plate, []);
          }
          accessoriesByPlate.get(plate)!.push(accessory);
        }
      });
    }

    return accessoriesByPlate;
  } catch (error) {
    console.error('Error in fetchAccessoriesByPlates:', error);
    throw error;
  }
};