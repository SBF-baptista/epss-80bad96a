import { supabase } from "@/integrations/supabase/client";

export interface SegsaleExtra {
  id: number;
  nome: string;
  categoria: string;
  descricao?: string;
}

export interface SegsaleProduct {
  id: number;
  nome: string;
  descricao?: string;
  descricaovenda?: string;
}

export interface SegsaleExtrasResponse {
  items: SegsaleExtra[];
  error?: string;
}

export const fetchSegsaleExtras = async (category?: 'Acessórios' | 'Módulos'): Promise<SegsaleExtra[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-segsale-extras', {
      body: { category }
    });

    if (error) {
      console.warn('Error calling fetch-segsale-extras:', error);
      return []; // Graceful fallback
    }

    if (data.error) {
      console.warn('Segsale API warning:', data.error);
    }

    return data.items || [];
  } catch (error) {
    console.warn('Error fetching Segsale extras:', error);
    return []; // Graceful fallback
  }
};

export const fetchSegsaleProducts = async (): Promise<SegsaleProduct[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-segsale-extras', {
      body: { type: 'products' }
    });

    if (error) {
      console.warn('Error calling fetch-segsale-extras for products:', error);
      return []; // Graceful fallback
    }

    if (data.error) {
      console.warn('Segsale API warning:', data.error);
    }

    return data.items || [];
  } catch (error) {
    console.warn('Error fetching Segsale products:', error);
    return []; // Graceful fallback
  }
};

export const fetchSegsaleAccessories = async (): Promise<SegsaleExtra[]> => {
  return fetchSegsaleExtras('Acessórios');
};

export const fetchSegsaleModules = async (): Promise<SegsaleExtra[]> => {
  return fetchSegsaleExtras('Módulos');
};
