import { supabase } from "@/integrations/supabase/client";
import { InstallationOrder } from "@/types/installationOrder";

export const getInstallationOrders = async (): Promise<InstallationOrder[]> => {
  const { data: schedules, error } = await supabase
    .from('kit_schedules')
    .select(`
      *,
      kit:homologation_kits(
        id,
        name,
        description,
        homologation_card_id,
        homologation_card:homologation_cards(
          id,
          brand,
          model,
          year,
          configuration
        )
      ),
      technician:technicians(
        id,
        name
      )
    `)
    .order('scheduled_date', { ascending: true });

  if (error) {
    console.error('Error fetching installation orders:', error);
    throw new Error(error.message || 'Erro ao carregar pedidos de instalação');
  }

  // Fetch accessories and supplies for each kit
  const ordersWithItems = await Promise.all(
    (schedules || []).map(async (schedule) => {
      const { data: kitItems, error: itemsError } = await supabase
        .from('homologation_kit_accessories')
        .select('*')
        .eq('kit_id', schedule.kit_id);

      if (itemsError) {
        console.error('Error fetching kit items:', itemsError);
      }

      const accessories = (kitItems || [])
        .filter(item => item.item_type === 'accessory')
        .map(item => ({
          name: item.item_name,
          quantity: item.quantity,
          description: item.description || undefined
        }));

      const supplies = (kitItems || [])
        .filter(item => item.item_type === 'supply')
        .map(item => ({
          name: item.item_name,
          quantity: item.quantity,
          description: item.description || undefined
        }));

      return {
        id: schedule.id,
        customerName: schedule.customer_name || 'Cliente não informado',
        technicianName: schedule.technician?.name || 'Técnico não informado',
        status: mapScheduleStatus(schedule.status),
        scheduledDate: schedule.scheduled_date,
        vehicleBrand: schedule.vehicle_brand,
        vehicleModel: schedule.vehicle_model,
        vehicleYear: schedule.vehicle_year,
        vehiclePlate: schedule.vehicle_plate,
        configuration: schedule.kit?.homologation_card?.configuration,
        trackerModel: 'Ruptella Smart5', // Default tracker model
        accessories,
        supplies,
        trackingCode: undefined, // Will be added later
        kitId: schedule.kit_id,
        technicianId: schedule.technician_id,
        notes: schedule.notes,
        customerPhone: schedule.customer_phone,
        customerEmail: schedule.customer_email,
        installationAddress: schedule.installation_address_street ? {
          street: schedule.installation_address_street,
          number: schedule.installation_address_number || '',
          neighborhood: schedule.installation_address_neighborhood || '',
          city: schedule.installation_address_city || '',
          state: schedule.installation_address_state || '',
          postalCode: schedule.installation_address_postal_code || '',
          complement: schedule.installation_address_complement
        } : undefined
      } as InstallationOrder;
    })
  );

  return ordersWithItems;
};

const mapScheduleStatus = (status: string): InstallationOrder['status'] => {
  switch (status) {
    case 'scheduled':
      return 'scheduled';
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'awaiting_shipment';
    default:
      return 'scheduled';
  }
};

export const updateInstallationOrderStatus = async (
  id: string,
  status: InstallationOrder['status']
): Promise<void> => {
  const dbStatus = mapStatusToDb(status);
  
  const { error } = await supabase
    .from('kit_schedules')
    .update({ status: dbStatus })
    .eq('id', id);

  if (error) {
    console.error('Error updating installation order status:', error);
    throw new Error(error.message || 'Erro ao atualizar status');
  }
};

const mapStatusToDb = (status: InstallationOrder['status']): string => {
  switch (status) {
    case 'scheduled':
      return 'scheduled';
    case 'in_progress':
      return 'in_progress';
    case 'awaiting_shipment':
    case 'shipped':
    case 'cancelled':
      return 'completed';
    default:
      return 'scheduled';
  }
};

export const updateTrackingCode = async (
  id: string,
  trackingCode: string
): Promise<void> => {
  const { error } = await supabase
    .from('kit_schedules')
    .update({ 
      notes: `Código de rastreio: ${trackingCode}`
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating tracking code:', error);
    throw new Error(error.message || 'Erro ao atualizar código de rastreio');
  }
};
