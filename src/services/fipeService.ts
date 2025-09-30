const FIPE_API_BASE_URL = 'https://fipe.parallelum.com.br/api/v2';

export interface FipeBrand {
  code: string;
  name: string;
}

export interface FipeModel {
  code: string;
  name: string;
}

export interface FipeYear {
  code: string;
  name: string;
}

export async function fetchFipeBrands(): Promise<FipeBrand[]> {
  try {
    const response = await fetch(`${FIPE_API_BASE_URL}/cars/brands`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar marcas: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar marcas da FIPE:', error);
    throw error;
  }
}

export async function fetchFipeModels(brandCode: string): Promise<FipeModel[]> {
  try {
    const response = await fetch(`${FIPE_API_BASE_URL}/cars/brands/${brandCode}/models`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar modelos: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar modelos da FIPE:', error);
    throw error;
  }
}

export async function fetchFipeYears(brandCode: string, modelCode: string): Promise<FipeYear[]> {
  try {
    const response = await fetch(`${FIPE_API_BASE_URL}/cars/brands/${brandCode}/models/${modelCode}/years`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar anos: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar anos da FIPE:', error);
    throw error;
  }
}
