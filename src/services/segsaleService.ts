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

// DEPRECATED: Use fetchSegsaleProductsDirect instead - this version doesn't pass parameters correctly
export const fetchSegsaleProducts = async (idResumoVenda: number): Promise<SegsaleFetchResponse> => {
  console.warn('fetchSegsaleProducts is deprecated. Use fetchSegsaleProductsDirect instead.');
  return fetchSegsaleProductsDirect(idResumoVenda);
};

// Alternative method using direct fetch with query params
export const fetchSegsaleProductsDirect = async (idResumoVenda: number): Promise<SegsaleFetchResponse> => {
  const url = `https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/fetch-segsale-products?idResumoVenda=${idResumoVenda}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.warn(`Segsale API returned ${response.status}:`, errorData);
    // Return a graceful fallback instead of throwing
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