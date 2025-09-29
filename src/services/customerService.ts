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

// Função para criar clientes com dados completos - REMOVIDA
// Sistema agora inicia sem clientes de exemplo
export const createCustomersWithSalesData = async (): Promise<void> => {
  console.log('Função de criação de clientes de exemplo desabilitada');
  return;
};