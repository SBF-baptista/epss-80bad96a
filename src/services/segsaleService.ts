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

export const fetchSegsaleProducts = async (idResumoVenda: number): Promise<SegsaleFetchResponse> => {
  console.log(`Fetching Segsale products for ID: ${idResumoVenda}`);
  
  const { data, error } = await supabase.functions.invoke('fetch-segsale-products', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    body: null,
    // Pass the parameter in the URL
  });

  if (error) {
    console.error('Error calling Segsale fetch function:', error);
    throw new Error(`Failed to fetch Segsale products: ${error.message}`);
  }

  return data as SegsaleFetchResponse;
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
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
};