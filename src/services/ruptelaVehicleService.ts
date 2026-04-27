import { supabase } from '@/integrations/supabase/client';

export interface RuptelaEntry {
  brand: string;
  model: string;
  type: string;
  generation: string;
  year_from: number | null;
  year_to: number | null;
  regions: string[];
  tags: string[];
  devices: string[];
  connection_methods: string[];
  created_at: string;
  // Link to the official Ruptela CANbus / Installation Instructions PDF
  canbus_configuration_url: string | null;
}

export interface RuptelaCandidate extends RuptelaEntry {
  match_score: number;
  year_in_range: boolean;
}

export interface RuptelaCheckResponse {
  supported: boolean;
  brand: string;
  model: string;
  year: number | null;
  matched_entry: RuptelaEntry | null;
  suggested_devices: string[];
  connection_methods: string[];
  candidates: RuptelaCandidate[];
  fetched_at: string | null;
  stale: boolean;
}

export interface RuptelaBrandListing {
  brand: string;
  total: number;
  entries: RuptelaEntry[];
  fetched_at: string | null;
  stale: boolean;
}

async function callFunction(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const { data, error } = await supabase.functions.invoke(
    `check-ruptela-vehicle?${query}`,
    { method: 'GET' },
  );
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export const ruptelaVehicleService = {
  async checkVehicle(brand: string, model: string, year?: number): Promise<RuptelaCheckResponse> {
    const params: Record<string, string> = { brand, model };
    if (year) params.year = String(year);
    return callFunction(params);
  },

  async listByBrand(brand: string): Promise<RuptelaBrandListing> {
    return callFunction({ brand });
  },

  async listBrands(): Promise<{ brands: string[]; fetched_at: string }> {
    return callFunction({ brands: 'true' });
  },
};
