import { supabase } from '@/integrations/supabase/client';
import type { InstallationOrder } from '@/types/installationOrder';

export const fetchInstallationOrders = async (): Promise<InstallationOrder[]> => {
  const { data: schedules, error } = await supabase
    .from('kit_schedules')
    .select(`
      *,
      kit:homologation_kits(
        id,
        name,
        description,
        homologation_card_id
      ),
      technician:technicians(
        id,
        name
      )
    `)
    .order('scheduled_date', { ascending: true });

  if (error) {
    console.error('Error fetching installation orders:', error);
    throw error;
  }

  if (!schedules) return [];

  // Fetch kit accessories for each schedule
  const ordersWithAccessories = await Promise.all(
    schedules.map(async (schedule) => {
      const { data: accessories } = await supabase
        .from('homologation_kit_accessories')
        .select('*')
        .eq('kit_id', schedule.kit_id);

      // Fetch configuration from homologation card if available
      let configuration = undefined;
      if (schedule.kit?.homologation_card_id) {
        const { data: card } = await supabase
          .from('homologation_cards')
          .select('configuration')
          .eq('id', schedule.kit.homologation_card_id)
          .single();
        
        configuration = card?.configuration;
      }

      return {
        id: schedule.id,
        customer_name: schedule.customer_name || '',
        technician_name: schedule.technician?.name || '',
        technician_id: schedule.technician_id,
        kit_id: schedule.kit_id,
        kit_name: schedule.kit?.name || '',
        vehicle_brand: schedule.vehicle_brand,
        vehicle_model: schedule.vehicle_model,
        vehicle_year: schedule.vehicle_year,
        vehicle_plate: schedule.vehicle_plate,
        status: schedule.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
        scheduled_date: schedule.scheduled_date,
        installation_time: schedule.installation_time,
        installation_address_street: schedule.installation_address_street,
        installation_address_number: schedule.installation_address_number,
        installation_address_neighborhood: schedule.installation_address_neighborhood,
        installation_address_city: schedule.installation_address_city,
        installation_address_state: schedule.installation_address_state,
        installation_address_postal_code: schedule.installation_address_postal_code,
        installation_address_complement: schedule.installation_address_complement,
        customer_phone: schedule.customer_phone,
        customer_email: schedule.customer_email,
        notes: schedule.notes,
        kit_accessories: accessories || [],
        configuration,
        created_at: schedule.created_at,
        updated_at: schedule.updated_at,
      } as InstallationOrder;
    })
  );

  return ordersWithAccessories;
};

export const updateInstallationOrderStatus = async (
  orderId: string,
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
): Promise<void> => {
  const { error } = await supabase
    .from('kit_schedules')
    .update({ status })
    .eq('id', orderId);

  if (error) {
    console.error('Error updating installation order status:', error);
    throw error;
  }
};
