import { supabase } from "@/integrations/supabase/client";

export interface ShipmentRecipient {
  id: string;
  name: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  complement?: string;
  created_at: string;
}

export interface ShipmentAddress {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  complement?: string;
}

export const fetchShipmentRecipients = async (): Promise<ShipmentRecipient[]> => {
  const { data, error } = await supabase
    .from('shipment_recipients')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching shipment recipients:', error);
    throw error;
  }

  return data || [];
};

export const createShipmentRecipient = async (recipient: Omit<ShipmentRecipient, 'id' | 'created_at'>): Promise<ShipmentRecipient> => {
  const { data, error } = await supabase
    .from('shipment_recipients')
    .insert([recipient])
    .select()
    .single();

  if (error) {
    console.error('Error creating shipment recipient:', error);
    throw error;
  }

  return data;
};

export const updateOrderShipment = async (
  orderId: string, 
  shipmentData: {
    shipment_recipient_id?: string;
    shipment_address_street: string;
    shipment_address_number: string;
    shipment_address_neighborhood: string;
    shipment_address_city: string;
    shipment_address_state: string;
    shipment_address_postal_code: string;
    shipment_address_complement?: string;
    shipment_prepared_at?: string;
  }
) => {
  const { error } = await supabase
    .from('pedidos')
    .update(shipmentData)
    .eq('id', orderId);

  if (error) {
    console.error('Error updating order shipment:', error);
    throw error;
  }
};

// Address parsing utility
export const parseAddress = (addressString: string): Partial<ShipmentAddress> => {
  const address: Partial<ShipmentAddress> = {};
  
  // Remove extra spaces and normalize
  const normalized = addressString.trim().replace(/\s+/g, ' ');
  
  // Try to extract postal code (CEP format: 12345-678 or 12345678)
  const postalCodeMatch = normalized.match(/(\d{5}-?\d{3})/);
  if (postalCodeMatch) {
    address.postal_code = postalCodeMatch[1].replace('-', '');
  }
  
  // Try to extract state (usually after dash or comma before postal code)
  const stateMatch = normalized.match(/[-,]\s*([A-Z]{2})\s*[-,]?\s*\d{5}/);
  if (stateMatch) {
    address.state = stateMatch[1];
  }
  
  // Split by commas to get main parts
  const parts = normalized.split(',').map(part => part.trim());
  
  if (parts.length >= 1) {
    // First part usually contains street and number
    const streetPart = parts[0];
    const streetMatch = streetPart.match(/^(.+?)\s+(\d+.*)$/);
    if (streetMatch) {
      address.street = streetMatch[1].trim();
      address.number = streetMatch[2].trim();
    } else {
      address.street = streetPart;
    }
  }
  
  if (parts.length >= 2) {
    // Second part might be neighborhood
    const secondPart = parts[1];
    if (!secondPart.match(/[A-Z]{2}/) && !secondPart.match(/\d{5}/)) {
      address.neighborhood = secondPart;
    }
  }
  
  if (parts.length >= 3) {
    // Third part might be city
    const thirdPart = parts[2];
    if (!thirdPart.match(/[A-Z]{2}/) && !thirdPart.match(/\d{5}/)) {
      address.city = thirdPart.replace(/\s*-\s*[A-Z]{2}.*/, '').trim();
    }
  }
  
  return address;
};