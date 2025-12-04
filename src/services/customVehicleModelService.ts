import { supabase } from '@/integrations/supabase/client';

export interface CustomVehicleModel {
  id: string;
  brand_code: string;
  brand_name: string;
  model_name: string;
  created_at: string;
}

export async function getCustomVehicleModels(brandCode: string): Promise<CustomVehicleModel[]> {
  const { data, error } = await supabase
    .from('custom_vehicle_models')
    .select('*')
    .eq('brand_code', brandCode)
    .order('model_name');

  if (error) {
    console.error('Error fetching custom vehicle models:', error);
    return [];
  }

  return data || [];
}

export async function createCustomVehicleModel(
  brandCode: string,
  brandName: string,
  modelName: string
): Promise<CustomVehicleModel | null> {
  const { data, error } = await supabase
    .from('custom_vehicle_models')
    .insert({
      brand_code: brandCode,
      brand_name: brandName,
      model_name: modelName,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // Duplicate key - model already exists
      console.log('Model already exists');
      return null;
    }
    console.error('Error creating custom vehicle model:', error);
    throw error;
  }

  return data;
}
