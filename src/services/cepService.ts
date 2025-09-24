// Service to fetch address data from ViaCEP API
export interface CEPData {
  cep: string;
  logradouro: string;
  complemento?: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export const fetchAddressByCEP = async (cep: string): Promise<CEPData | null> => {
  // Remove non-numeric characters
  const cleanCEP = cep.replace(/\D/g, '');
  
  // Validate CEP format (8 digits)
  if (cleanCEP.length !== 8) {
    throw new Error('CEP deve ter 8 dígitos');
  }
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch address: ${response.status}`);
    }
    
    const data: CEPData = await response.json();
    
    // Check if CEP was found
    if (data.erro) {
      throw new Error('CEP não encontrado');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching address from ViaCEP:', error);
    throw error;
  }
};

export const formatCEP = (cep: string): string => {
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.replace(/^(\d{5})(\d{3})$/, '$1-$2');
};

export const isValidCEP = (cep: string): boolean => {
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.length === 8;
};