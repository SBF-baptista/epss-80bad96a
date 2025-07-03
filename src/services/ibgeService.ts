// Service to fetch cities from IBGE API
export interface IBGECity {
  id: number;
  nome: string;
}

export interface IBGEState {
  id: number;
  sigla: string;
  nome: string;
}

export const fetchCitiesByState = async (stateCode: string): Promise<string[]> => {
  try {
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateCode}/municipios`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch cities: ${response.status}`);
    }
    
    const cities: IBGECity[] = await response.json();
    return cities.map(city => city.nome).sort();
  } catch (error) {
    console.error('Error fetching cities from IBGE:', error);
    throw error;
  }
};

export const fetchStates = async (): Promise<IBGEState[]> => {
  try {
    const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch states: ${response.status}`);
    }
    
    const states: IBGEState[] = await response.json();
    return states.sort((a, b) => a.sigla.localeCompare(b.sigla));
  } catch (error) {
    console.error('Error fetching states from IBGE:', error);
    throw error;
  }
};