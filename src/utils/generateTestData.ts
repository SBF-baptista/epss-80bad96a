import { createCustomersWithSalesData } from '@/services/customerService';

// Execute this function to generate test customer data
export const executeDataGeneration = async () => {
  try {
    console.log('Iniciando geração de dados de teste...');
    await createCustomersWithSalesData();
    console.log('Dados de teste gerados com sucesso!');
  } catch (error) {
    console.error('Erro ao gerar dados de teste:', error);
  }
};

// Auto-execute when this file is imported
executeDataGeneration();