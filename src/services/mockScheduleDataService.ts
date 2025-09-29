import { type KitScheduleWithDetails } from './kitScheduleService';
import { type Technician } from './technicianService';
import { type HomologationKit } from './homologationKitService';

export interface ExtendedScheduleData extends KitScheduleWithDetails {
  company_name: string;
  package_name: string;
  vehicles: VehicleData[];
  accessories: string[];
  modules: string[];
  sales_info: SalesInfo;
}

export interface VehicleData {
  brand: string;
  model: string;
  year: number;
  quantity: number;
}

export interface SalesInfo {
  total_value?: number;
  contract_number?: string;
  sales_representative?: string;
}

const COMPANIES = [
  'Transportadora Águia Dourada',
  'Logística Sul Express',
  'Transportes Rápido Norte',
  'Cargo Master Ltda',
  'Via Expressa Transportes',
  'Delta Logística',
  'Frota Brasil Transportes',
  'Mega Cargo Solutions',
  'Trans Atlântico',
  'Rodoviária Paulista',
  'Logística Central',
  'Express Cargo'
];

const PACKAGES = [
  'Copiloto 4 câmeras',
  'Rastreamento Básico',
  'Monitoramento Avançado',
  'Segurança Total',
  'Fleet Management Pro',
  'Eco Drive System',
  'Smart Tracker Plus',
  'Security Package Premium'
];

const VEHICLE_BRANDS = [
  'Volvo', 'Scania', 'Mercedes-Benz', 'Volkswagen', 'Ford', 'Iveco', 'DAF', 'MAN'
];

const VEHICLE_MODELS = {
  'Volvo': ['FM 370 4x2 2p', 'FH 460 6x4 3p', 'VM 260 6x4 2p', 'FH 540 6x4 3p'],
  'Scania': ['R 450 6x4 3p', 'G 410 4x2 2p', 'S 500 6x4 3p', 'P 280 4x2 2p'],
  'Mercedes-Benz': ['Actros 2546 6x4', 'Atego 1719 4x2', '2042 4x2', 'Actros 2651 6x4'],
  'Volkswagen': ['Constellation 19.330 4x2', '24.250 6x2', 'Delivery 11.180', '17.280 4x2'],
  'Ford': ['Cargo 1719 4x2', '2428 6x2', 'F-4000 4x2', 'Cargo 2842 6x4'],
  'Iveco': ['Stralis 440 4x2', 'Tector 170E28', 'Daily 35S14', 'Stralis 560 6x4'],
  'DAF': ['XF 440 4x2', 'CF 370 6x4', 'LF 180 4x2', 'XF 510 6x4'],
  'MAN': ['TGX 28.440 4x2', 'TGS 26.440 6x4', 'TGL 12.220 4x2', 'TGX 33.540 6x4']
};

const ACCESSORIES = [
  'Kit de Câmeras Frontais',
  'Sensor de Fadiga',
  'Monitor LCD 7"',
  'Câmera de Ré',
  'Câmeras Laterais',
  'Sistema de Áudio',
  'Microfone Externo',
  'Botão de Pânico',
  'Sensor de Porta',
  'Antena GPS Externa',
  'Cabo de Alimentação',
  'Suporte de Fixação'
];

const MODULES = [
  'Módulo de Rastreamento GPS',
  'Central de Monitoramento',
  'Módulo de Telemetria',
  'Sistema Anti-furto',
  'Bloqueador Veicular',
  'Sensor de Combustível',
  'Módulo de Temperatura',
  'Sistema de Comunicação',
  'Módulo de Identificação',
  'Interface OBD',
  'Módulo RFID',
  'Sistema de Backup'
];

const SALES_REPRESENTATIVES = [
  'Carlos Silva',
  'Maria Santos',
  'João Oliveira',
  'Ana Costa',
  'Pedro Rodrigues',
  'Juliana Lima'
];

function getRandomItems<T>(array: T[], min: number = 1, max: number = 4): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateRandomVehicles(): VehicleData[] {
  const count = Math.floor(Math.random() * 3) + 1; // 1-3 vehicles
  const vehicles: VehicleData[] = [];
  
  for (let i = 0; i < count; i++) {
    const brand = VEHICLE_BRANDS[Math.floor(Math.random() * VEHICLE_BRANDS.length)];
    const models = VEHICLE_MODELS[brand as keyof typeof VEHICLE_MODELS];
    const model = models[Math.floor(Math.random() * models.length)];
    const year = 2018 + Math.floor(Math.random() * 7); // 2018-2024
    const quantity = Math.floor(Math.random() * 5) + 1; // 1-5
    
    vehicles.push({ brand, model, year, quantity });
  }
  
  return vehicles;
}

function generateRandomSchedule(
  technicians: Technician[],
  kits: HomologationKit[],
  index: number
): ExtendedScheduleData {
  const company = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
  const packageName = PACKAGES[Math.floor(Math.random() * PACKAGES.length)];
  const vehicles = generateRandomVehicles();
  const accessories = getRandomItems(ACCESSORIES, 2, 6);
  const modules = getRandomItems(MODULES, 2, 5);
  
  // Generate dates in the next 30 days
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + Math.floor(Math.random() * 30) + 1);
  
  const kit = kits.length > 0 ? kits[Math.floor(Math.random() * kits.length)] : {
    id: `mock-kit-${index}`,
    name: packageName,
    description: `Kit completo para ${packageName}`,
    homologation_card_id: undefined
  };
  
  const technician = technicians.length > 0 ? technicians[Math.floor(Math.random() * technicians.length)] : {
    id: `mock-tech-${index}`,
    name: `Técnico ${index + 1}`,
    address_city: 'São Paulo',
    address_state: 'SP'
  };

  // Generate customer data
  const customerNames = [
    'João Silva Santos', 'Maria Oliveira Costa', 'Pedro Rodrigues Lima',
    'Ana Paula Ferreira', 'Carlos Eduardo Souza', 'Juliana Santos Pereira',
    'Roberto Carlos Alves', 'Fernanda Lima Silva', 'Ricardo Santos Costa'
  ];
  
  const customerName = customerNames[Math.floor(Math.random() * customerNames.length)];
  const documentNumber = `${Math.floor(Math.random() * 90000000) + 10000000}`;
  const phone = `(11) ${Math.floor(Math.random() * 90000) + 10000}-${Math.floor(Math.random() * 9000) + 1000}`;
  const email = `${customerName.split(' ')[0].toLowerCase()}@${company.split(' ')[0].toLowerCase()}.com.br`;
  
  // Generate installation time
  const hours = Math.floor(Math.random() * 8) + 8; // 8-15h
  const minutes = Math.random() < 0.5 ? '00' : '30';
  const installationTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
  
  return {
    id: `mock-schedule-${index}`,
    kit_id: kit.id!,
    technician_id: technician.id!,
    scheduled_date: baseDate.toISOString().split('T')[0],
    installation_time: installationTime,
    status: Math.random() < 0.8 ? 'scheduled' : 'in_progress',
    notes: `Instalação do pacote ${packageName} - ${vehicles.length} veículo(s)`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    
    // Related data
    kit: {
      id: kit.id || `mock-kit-${index}`,
      name: kit.name,
      description: kit.description,
      homologation_card_id: 'homologation_card_id' in kit ? kit.homologation_card_id : undefined
    },
    technician: {
      id: technician.id || `mock-tech-${index}`,
      name: technician.name,
      address_city: technician.address_city,
      address_state: technician.address_state
    },
    
    // Customer data
    customer_name: customerName,
    customer_document_number: documentNumber,
    customer_phone: phone,
    customer_email: email,
    
    // Extended data
    company_name: company,
    package_name: packageName,
    vehicles,
    accessories,
    modules,
    sales_info: {
      total_value: Math.floor(Math.random() * 50000) + 10000,
      contract_number: `CT-${Date.now()}-${index}`,
      sales_representative: SALES_REPRESENTATIVES[Math.floor(Math.random() * SALES_REPRESENTATIVES.length)]
    }
  };
}

export function generateMockScheduleData(
  technicians: Technician[],
  kits: HomologationKit[],
  count: number = 15
): ExtendedScheduleData[] {
  const mockData: ExtendedScheduleData[] = [];
  
  // Generate multiple schedules for some customers
  const customerGroups = Math.floor(count * 0.6); // 60% unique customers
  const usedCustomers: string[] = [];
  
  for (let i = 0; i < count; i++) {
    let schedule = generateRandomSchedule(technicians, kits, i);
    
    // 30% chance to assign to an existing customer for multiple technician scenarios
    if (i > customerGroups && usedCustomers.length > 0 && Math.random() < 0.3) {
      const existingCustomer = mockData[Math.floor(Math.random() * usedCustomers.length)];
      schedule.customer_name = existingCustomer.customer_name;
      schedule.customer_document_number = existingCustomer.customer_document_number;
      schedule.customer_phone = existingCustomer.customer_phone;
      schedule.customer_email = existingCustomer.customer_email;
      schedule.company_name = existingCustomer.company_name;
      
      // Different date for same customer
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + Math.floor(Math.random() * 30) + 1);
      schedule.scheduled_date = newDate.toISOString().split('T')[0];
    } else {
      usedCustomers.push(schedule.customer_name!);
    }
    
    mockData.push(schedule);
  }
  
  return mockData;
}