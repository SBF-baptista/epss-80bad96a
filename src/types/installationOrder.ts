export interface InstallationOrder {
  id: string;
  customer_name: string;
  technician_name: string;
  technician_id: string;
  kit_id: string;
  kit_name: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_plate?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date: string;
  installation_time?: string;
  installation_address_street?: string;
  installation_address_number?: string;
  installation_address_neighborhood?: string;
  installation_address_city?: string;
  installation_address_state?: string;
  installation_address_postal_code?: string;
  installation_address_complement?: string;
  customer_phone?: string;
  customer_email?: string;
  notes?: string;
  kit_accessories?: Array<{
    item_name: string;
    quantity: number;
    item_type: string;
    description?: string;
  }>;
  configuration?: string;
  created_at?: string;
  updated_at?: string;
}

export type InstallationStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
