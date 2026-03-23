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
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error("Usuário não autenticado para acessar o Segsale.");
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = `${supabaseUrl}/functions/v1/fetch-segsale-products?idResumoVenda=${idResumoVenda}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': anonKey,
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
    };
  }

  return response.json();
};

export const fetchSegsaleProducts = fetchSegsaleProductsDirect;
