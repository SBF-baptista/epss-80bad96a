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
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`, {
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch address: ${response.status}`);
    }
    
    const data = await response.json();
    
    // ViaCEP returns { erro: true } for valid format but nonexistent CEPs
    if (data.erro) {
      // Try BrasilAPI as fallback
      try {
        const fallback = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCEP}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (fallback.ok) {
          const fbData = await fallback.json();
          return {
            cep: fbData.cep,
            logradouro: fbData.street || '',
            bairro: fbData.neighborhood || '',
            localidade: fbData.city || '',
            uf: fbData.state || '',
          };
        }
      } catch {
        // fallback also failed
      }
      throw new Error('CEP não encontrado');
    }
    
    return data as CEPData;
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