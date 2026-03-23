import { supabase } from "@/integrations/supabase/client";

export interface SegsaleVehicle {
  brand: string;
  vehicle: string;
  year: number;
  quantity: number;
  accessories: string[];
  modules: string[];
}

export interface SegsaleSale {
  company_name: string;
  usage_type: string;
  vehicles: SegsaleVehicle[];
}

export interface SegsaleFetchResponse {
  success: boolean;
  message: string;
  id_resumo_venda: string;
  sales: SegsaleSale[];
  stored_count: number;
}

export const fetchSegsaleProductsDirect = async (idResumoVenda: number): Promise<SegsaleFetchResponse> => {
  const { data, error } = await supabase.functions.invoke('fetch-segsale-products', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: null,
  });

  // supabase.functions.invoke doesn't support query params natively for GET,
  // so we fall back to authenticated fetch with the anon key
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-segsale-products?idResumoVenda=${idResumoVenda}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.warn(`Segsale API returned ${response.status}:`, errorData);
    return {
      success: false,
      message: errorData.suggestion || errorData.error || `HTTP ${response.status}`,
      id_resumo_venda: String(idResumoVenda),
      sales: [],
      stored_count: 0,
    } as SegsaleFetchResponse;
  }

  return response.json();
};

// Keep backward compat alias
export const fetchSegsaleProducts = fetchSegsaleProductsDirect;
