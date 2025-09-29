import { supabase } from '@/integrations/supabase/client';

export interface VehicleInfo {
  id?: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  scheduled?: boolean;
  schedule_id?: string;
  schedule_date?: string;
  technician_name?: string;
}

export interface Customer {
  id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  name: string;
  document_number: string;
  document_type: 'cpf' | 'cnpj';
  phone: string;
  email: string;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
  address_complement?: string;
  // Novos campos para dados de vendas
  company_name?: string;
  package_name?: string;
  total_value?: number;
  contract_number?: string;
  sales_representative?: string;
  vehicles?: VehicleInfo[];
  accessories?: string[];
  modules?: string[];
}

export interface CreateCustomerData {
  name: string;
  document_number: string;
  document_type: 'cpf' | 'cnpj';
  phone: string;
  email: string;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
  address_complement?: string;
  // Novos campos opcionais
  company_name?: string;
  package_name?: string;
  total_value?: number;
  contract_number?: string;
  sales_representative?: string;
  vehicles?: VehicleInfo[];
  accessories?: string[];
  modules?: string[];
}

// Validation functions
export const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  
  if (cleanCPF.length !== 11) return false;
  
  // Check for same digits
  if (/^(.)\1+$/.test(cleanCPF)) return false;
  
  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
};

export const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  
  // Check for same digits
  if (/^(.)\1+$/.test(cleanCNPJ)) return false;
  
  // Validate first check digit
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights1[i];
  }
  let digit = sum % 11;
  digit = digit < 2 ? 0 : 11 - digit;
  if (digit !== parseInt(cleanCNPJ.charAt(12))) return false;
  
  // Validate second check digit
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights2[i];
  }
  digit = sum % 11;
  digit = digit < 2 ? 0 : 11 - digit;
  if (digit !== parseInt(cleanCNPJ.charAt(13))) return false;
  
  return true;
};

export const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  // Brazilian phone: 10 or 11 digits (with area code)
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const formatCPF = (cpf: string): string => {
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatCNPJ = (cnpj: string): string => {
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
  return cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

export const formatPhone = (phone: string): string => {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

// Customer service functions
export const createCustomer = async (data: CreateCustomerData): Promise<Customer> => {
  const customerData = {
    ...data,
    created_by: (await supabase.auth.getUser()).data.user?.id,
    vehicles: data.vehicles ? JSON.stringify(data.vehicles) : null
  };

  const { data: customer, error } = await supabase
    .from('customers')
    .insert([customerData])
    .select()
    .single();

  if (error) {
    console.error('Error creating customer:', error);
    throw new Error(error.message);
  }

  return {
    ...customer,
    document_type: customer.document_type as 'cpf' | 'cnpj',
    vehicles: customer.vehicles ? JSON.parse(customer.vehicles as string) : undefined
  };
};

export const getCustomers = async (search?: string): Promise<Customer[]> => {
  let query = supabase.from('customers').select('*');
  
  if (search && search.trim()) {
    query = query.or(`name.ilike.%${search}%,document_number.ilike.%${search}%,email.ilike.%${search}%`);
  }
  
  const { data, error } = await query.order('name');

  if (error) {
    console.error('Error fetching customers:', error);
    throw new Error(error.message);
  }
  
  const processedCustomers = data?.map(customer => ({
    ...customer,
    document_type: customer.document_type as 'cpf' | 'cnpj',
    vehicles: customer.vehicles ? JSON.parse(customer.vehicles as string) : undefined
  })) || [];
  
  return processedCustomers;
};

export const getCustomerById = async (id: string): Promise<Customer | null> => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching customer:', error);
    throw new Error(error.message);
  }

  return {
    ...data,
    document_type: data.document_type as 'cpf' | 'cnpj',
    vehicles: data.vehicles ? JSON.parse(data.vehicles as string) : undefined
  };
};

export const updateCustomer = async (id: string, data: Partial<CreateCustomerData>): Promise<Customer> => {
  const updateData = {
    ...data,
    vehicles: data.vehicles ? JSON.stringify(data.vehicles) : undefined
  };

  const { data: customer, error } = await supabase
    .from('customers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating customer:', error);
    throw new Error(error.message);
  }

  return {
    ...customer,
    document_type: customer.document_type as 'cpf' | 'cnpj',
    vehicles: customer.vehicles ? JSON.parse(customer.vehicles as string) : undefined
  };
};

export const getCustomerByDocument = async (documentNumber: string): Promise<Customer | null> => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('document_number', documentNumber.replace(/[^\d]/g, ''))
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching customer by document:', error);
    throw new Error(error.message);
  }

  return {
    ...data,
    document_type: data.document_type as 'cpf' | 'cnpj',
    vehicles: data.vehicles ? JSON.parse(data.vehicles as string) : undefined
  };
};

// Função para criar clientes com dados completos para teste
export const createCustomersWithSalesData = async (): Promise<void> => {
  const mockCompanies = [
    'Transportadora São Paulo Ltda',
    'Logística Brasil S.A.',
    'Frota Express',
    'Transporte Seguro Ltda',
    'Viação Paulista',
    'Carga Pesada Transportes',
    'Rodoviário Nacional',
    'Expresso Santos',
    'Translog Empresarial',
    'Frete Rápido S.A.'
  ];

  const mockPackages = [
    'Pacote Básico Rastreamento',
    'Pacote Premium Segurança',
    'Pacote Empresarial Plus',
    'Pacote Frota Completa',
    'Pacote Monitoramento 24h',
    'Pacote Executivo',
    'Pacote Corporativo',
    'Pacote Logística Avançada'
  ];

  const mockSalesReps = [
    'Carlos Silva',
    'Ana Santos',
    'Roberto Oliveira',
    'Mariana Costa',
    'Pedro Almeida',
    'Fernanda Lima',
    'José Pereira',
    'Luciana Ferreira'
  ];

  const vehicleBrands = ['TOYOTA', 'FORD', 'CHEVROLET', 'VOLKSWAGEN', 'HYUNDAI', 'HONDA', 'NISSAN', 'FIAT'];
  const vehicleModels = {
    'TOYOTA': ['COROLLA', 'HILUX', 'ETIOS', 'YARIS', 'PRIUS'],
    'FORD': ['KA', 'FIESTA', 'FOCUS', 'FUSION', 'RANGER'],
    'CHEVROLET': ['ONIX', 'PRISMA', 'CRUZE', 'S10', 'TRACKER'],
    'VOLKSWAGEN': ['GOL', 'POLO', 'JETTA', 'AMAROK', 'T-CROSS'],
    'HYUNDAI': ['HB20', 'ELANTRA', 'TUCSON', 'CRETA', 'AZERA'],
    'HONDA': ['CIVIC', 'FIT', 'CITY', 'HR-V', 'CR-V'],
    'NISSAN': ['MARCH', 'VERSA', 'SENTRA', 'KICKS', 'FRONTIER'],
    'FIAT': ['UNO', 'PALIO', 'SIENA', 'TORO', 'ARGO']
  };

  const accessories = ['Bloqueador', 'Sensor de Combustível', 'Botão de Pânico', 'Microfone', 'Sirene'];
  const modules = ['GPS', 'GSM', 'Bluetooth', 'WiFi'];

  // Gerar nomes brasileiros realistas
  const firstNames = ['João', 'Maria', 'José', 'Ana', 'Carlos', 'Fernanda', 'Roberto', 'Luciana', 'Pedro', 'Mariana', 'Francisco', 'Juliana', 'Antonio', 'Carla', 'Luiz'];
  const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Almeida', 'Lima', 'Ferreira', 'Rodrigues', 'Martins', 'Nascimento', 'Araujo', 'Rocha', 'Barbosa'];

  const generateRandomCPF = (): string => {
    const numbers = Array.from({length: 9}, () => Math.floor(Math.random() * 10));
    
    // Calculate first check digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += numbers[i] * (10 - i);
    }
    let firstDigit = 11 - (sum % 11);
    if (firstDigit >= 10) firstDigit = 0;
    numbers.push(firstDigit);
    
    // Calculate second check digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += numbers[i] * (11 - i);
    }
    let secondDigit = 11 - (sum % 11);
    if (secondDigit >= 10) secondDigit = 0;
    numbers.push(secondDigit);
    
    return numbers.join('');
  };

  const generateRandomCNPJ = (): string => {
    const numbers = Array.from({length: 12}, () => Math.floor(Math.random() * 10));
    
    // Calculate first check digit
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += numbers[i] * weights1[i];
    }
    let firstDigit = sum % 11;
    firstDigit = firstDigit < 2 ? 0 : 11 - firstDigit;
    numbers.push(firstDigit);
    
    // Calculate second check digit
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += numbers[i] * weights2[i];
    }
    let secondDigit = sum % 11;
    secondDigit = secondDigit < 2 ? 0 : 11 - secondDigit;
    numbers.push(secondDigit);
    
    return numbers.join('');
  };

  const generateRandomPhone = (): string => {
    const areaCodes = ['11', '21', '31', '41', '51', '61', '62', '71', '81', '85'];
    const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
    const number = '9' + Math.floor(Math.random() * 90000000 + 10000000);
    return areaCode + number;
  };

  const generateRandomPlate = (): string => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    return letters[Math.floor(Math.random() * letters.length)] +
           letters[Math.floor(Math.random() * letters.length)] +
           letters[Math.floor(Math.random() * letters.length)] +
           digits[Math.floor(Math.random() * digits.length)] +
           letters[Math.floor(Math.random() * letters.length)] +
           digits[Math.floor(Math.random() * digits.length)] +
           digits[Math.floor(Math.random() * digits.length)];
  };

  const brazilianCities = [
    { city: 'São Paulo', state: 'SP', cep: '01000-000' },
    { city: 'Rio de Janeiro', state: 'RJ', cep: '20000-000' },
    { city: 'Belo Horizonte', state: 'MG', cep: '30000-000' },
    { city: 'Brasília', state: 'DF', cep: '70000-000' },
    { city: 'Curitiba', state: 'PR', cep: '80000-000' },
    { city: 'Porto Alegre', state: 'RS', cep: '90000-000' },
    { city: 'Salvador', state: 'BA', cep: '40000-000' },
    { city: 'Fortaleza', state: 'CE', cep: '60000-000' }
  ];

  const customers: CreateCustomerData[] = [];

  for (let i = 0; i < 25; i++) {
    const isCompany = Math.random() > 0.3; // 70% chance of being a company
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const location = brazilianCities[Math.floor(Math.random() * brazilianCities.length)];
    
    const vehicles: VehicleInfo[] = [];
    const numVehicles = Math.floor(Math.random() * 3) + 1; // 1-3 vehicles
    
    for (let v = 0; v < numVehicles; v++) {
      const brand = vehicleBrands[Math.floor(Math.random() * vehicleBrands.length)];
      const modelList = vehicleModels[brand];
      const model = modelList[Math.floor(Math.random() * modelList.length)];
      const year = 2018 + Math.floor(Math.random() * 6); // 2018-2023
      
      vehicles.push({
        brand,
        model,
        year,
        plate: generateRandomPlate()
      });
    }

    const selectedAccessories = accessories
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 3) + 1);
    
    const selectedModules = modules
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 2) + 1);

    const customer: CreateCustomerData = {
      name: isCompany ? mockCompanies[Math.floor(Math.random() * mockCompanies.length)] : `${firstName} ${lastName}`,
      document_number: isCompany ? generateRandomCNPJ() : generateRandomCPF(),
      document_type: isCompany ? 'cnpj' : 'cpf',
      phone: generateRandomPhone(),
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      address_street: `Rua ${lastName}`,
      address_number: (Math.floor(Math.random() * 999) + 1).toString(),
      address_neighborhood: 'Centro',
      address_city: location.city,
      address_state: location.state,
      address_postal_code: location.cep,
      company_name: isCompany ? mockCompanies[Math.floor(Math.random() * mockCompanies.length)] : undefined,
      package_name: mockPackages[Math.floor(Math.random() * mockPackages.length)],
      total_value: Math.floor(Math.random() * 50000) + 5000,
      contract_number: `CTR-${Math.floor(Math.random() * 90000) + 10000}`,
      sales_representative: mockSalesReps[Math.floor(Math.random() * mockSalesReps.length)],
      vehicles,
      accessories: selectedAccessories,
      modules: selectedModules
    };

    customers.push(customer);
  }

  // Create customers in database
  for (const customerData of customers) {
    try {
      await createCustomer(customerData);
      console.log(`Cliente criado: ${customerData.name}`);
    } catch (error) {
      console.error(`Erro ao criar cliente ${customerData.name}:`, error);
    }
  }

  console.log(`${customers.length} clientes de teste criados com sucesso!`);
};