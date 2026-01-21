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
      console.error('Error calling fetch-segsale-extras:', error);
      throw error;
    }

    if (data.error) {
      console.error('API error:', data.error);
      throw new Error(data.error);
    }

    return data.items || [];
  } catch (error) {
    console.error('Error fetching Segsale extras:', error);
    throw error;
  }
};

export const fetchSegsaleProducts = async (): Promise<SegsaleProduct[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-segsale-extras', {
      body: { type: 'products' }
    });

    if (error) {
      console.error('Error calling fetch-segsale-extras for products:', error);
      throw error;
    }

    if (data.error) {
      console.error('API error:', data.error);
      throw new Error(data.error);
    }

    return data.items || [];
  } catch (error) {
    console.error('Error fetching Segsale products:', error);
    throw error;
  }
};

export const fetchSegsaleAccessories = async (): Promise<SegsaleExtra[]> => {
  return fetchSegsaleExtras('Acessórios');
};

export const fetchSegsaleModules = async (): Promise<SegsaleExtra[]> => {
  return fetchSegsaleExtras('Módulos');
};
