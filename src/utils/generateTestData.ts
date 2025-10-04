import { createTestCustomerWithAccessoriesAndSupplies } from '@/services/customerService';

// Execute this function to generate test customer data with accessories and supplies
export const executeDataGeneration = async () => {
  try {
    console.log('Criando cliente de teste com acessórios e insumos...');
    await createTestCustomerWithAccessoriesAndSupplies();
    console.log('Cliente de teste criado com sucesso!');
  } catch (error) {
    console.error('Erro ao gerar cliente de teste:', error);
  }
};

// Auto-execute when this file is imported
executeDataGeneration();