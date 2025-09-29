import { createSingleCustomerForTesting } from '@/services/customerService';

// Execute this function to generate test customer data (only 1 customer)
export const executeDataGeneration = async () => {
  try {
    console.log('Criando cliente único para teste...');
    await createSingleCustomerForTesting();
    console.log('Cliente de teste criado com sucesso!');
  } catch (error) {
    console.error('Erro ao gerar cliente de teste:', error);
  }
};

// Auto-execute when this file is imported
executeDataGeneration();