import { supabase } from "@/integrations/supabase/client";

export interface VehicleAccessory {
  id: string;
  name: string;
  quantity: number;
  company_name?: string;
  usage_type?: string;
  vehicle_id?: string;
  categories?: string;
}

export const fetchVehicleAccessories = async (vehicleId: string): Promise<VehicleAccessory[]> => {
  try {
    const { data, error } = await supabase
      .from('accessories')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('name');

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
      .order('name');

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
      .order('name');

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

export const fetchAccessoriesByVehicleIds = async (vehicleIds: string[]): Promise<Map<string, VehicleAccessory[]>> => {
  try {
    if (!vehicleIds || vehicleIds.length === 0) {
      return new Map();
    }

    const { data: accessories, error } = await supabase
      .from('accessories')
      .select('*')
      .in('vehicle_id', vehicleIds)
      .order('name');

    if (error) {
      console.error('Error fetching accessories by vehicle IDs:', error);
      throw error;
    }

    const accessoriesByVehicleId = new Map<string, VehicleAccessory[]>();
    
    if (accessories) {
      accessories.forEach((accessory) => {
        if (accessory.vehicle_id) {
          if (!accessoriesByVehicleId.has(accessory.vehicle_id)) {
            accessoriesByVehicleId.set(accessory.vehicle_id, []);
          }
          accessoriesByVehicleId.get(accessory.vehicle_id)!.push(accessory);
        }
      });
    }

    return accessoriesByVehicleId;
  } catch (error) {
    console.error('Error in fetchAccessoriesByVehicleIds:', error);
    throw error;
  }
};

/**
 * Normaliza string removendo diacríticos e convertendo para minúsculas
 * Ex: "Módulos" -> "modulos"
 */
const normalizeCategory = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
    .toLowerCase()
    .trim();
};

/**
 * Verifica se uma categoria representa módulos
 */
export const isModuleCategory = (category?: string): boolean => {
  if (!category) return false;
  return normalizeCategory(category) === 'modulos';
};

export const aggregateAccessories = (accessories: VehicleAccessory[]): string[] => {
  const aggregated = new Map<string, number>();
  
  accessories.forEach(acc => {
    const current = aggregated.get(acc.name) || 0;
    aggregated.set(acc.name, current + acc.quantity);
  });

  return Array.from(aggregated.entries())
    .map(([name, qty]) => `${name} (${qty}x)`)
    .sort();
};

/**
 * Agrega acessórios retornando objetos com nome e quantidade (sem duplicar formato)
 */
export const aggregateAccessoriesToObjects = (accessories: VehicleAccessory[]): { name: string; quantity: number }[] => {
  const aggregated = new Map<string, number>();
  
  accessories.forEach(acc => {
    const current = aggregated.get(acc.name) || 0;
    aggregated.set(acc.name, current + acc.quantity);
  });

  return Array.from(aggregated.entries())
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Filtra módulos e agrega apenas acessórios reais
 * Módulos são identificados por categories='modulos' ou 'Módulos'
 */
export const aggregateAccessoriesWithoutModules = (accessories: VehicleAccessory[]): string[] => {
  // Filtrar módulos - só incluir acessórios reais
  const realAccessories = accessories.filter(acc => !isModuleCategory(acc.categories));
  
  return aggregateAccessories(realAccessories);
};

/**
 * Filtra módulos e agrega apenas acessórios reais retornando objetos
 */
export const aggregateAccessoriesWithoutModulesToObjects = (accessories: VehicleAccessory[]): { name: string; quantity: number }[] => {
  const realAccessories = accessories.filter(acc => !isModuleCategory(acc.categories));
  return aggregateAccessoriesToObjects(realAccessories);
};

/**
 * Filtra e agrega APENAS módulos (categories='Módulos')
 */
export const aggregateModulesOnly = (accessories: VehicleAccessory[]): string[] => {
  const modules = accessories.filter(acc => isModuleCategory(acc.categories));
  const aggregated = new Map<string, number>();
  
  modules.forEach(acc => {
    const current = aggregated.get(acc.name) || 0;
    aggregated.set(acc.name, current + acc.quantity);
  });

  return Array.from(aggregated.keys()).sort();
};
