import { supabase } from "@/integrations/supabase/client";

export interface KitSchedule {
  id?: string;
  kit_id: string;
  technician_id: string;
  scheduled_date: string;
  installation_time?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'shipped';
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  accessories?: string[];
  supplies?: string[];
}

export interface KitScheduleWithDetails extends KitSchedule {
  kit: {
    id: string;
    name: string;
    description?: string;
    homologation_card_id?: string;
    equipment?: Array<{
      id: string;
      item_name: string;
      quantity: number;
      description?: string;
    }>;
    accessories?: Array<{
      id: string;
      item_name: string;
      quantity: number;
      description?: string;
    }>;
    supplies?: Array<{
      id: string;
      item_name: string;
      quantity: number;
      description?: string;
    }>;
  };
  technician: {
    id: string;
    name: string;
    address_city?: string;
    address_state?: string;
  };
  homologation_card?: {
    id: string;
    brand: string;
    model: string;
    status: string;
  };
  customer_id?: string;
  customer_name?: string;
  customer_document_number?: string;
  customer_phone?: string;
  customer_email?: string;
  installation_address_street?: string;
  installation_address_number?: string;
  installation_address_neighborhood?: string;
  installation_address_city?: string;
  installation_address_state?: string;
  installation_address_postal_code?: string;
  installation_address_complement?: string;
  vehicle_plate?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  accessories?: string[];
  supplies?: string[];
}

export interface CreateKitScheduleData {
  kit_id: string;
  technician_id: string;
  scheduled_date: string;
  installation_time?: string;
  notes?: string;
  customer_id?: string;
  customer_name: string;
  customer_document_number: string;
  customer_phone: string;
  customer_email: string;
  installation_address_street: string;
  installation_address_number: string;
  installation_address_neighborhood: string;
  installation_address_city: string;
  installation_address_state: string;
  installation_address_postal_code: string;
  installation_address_complement?: string;
  vehicle_plate?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  accessories?: string[];
  supplies?: string[];
}

// Create a new kit schedule
export const createKitSchedule = async (data: CreateKitScheduleData): Promise<KitSchedule> => {
  const { data: user } = await supabase.auth.getUser();
  
  const { data: schedule, error } = await supabase
    .from('kit_schedules')
    .insert([{
      ...data,
      created_by: user.user?.id
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating kit schedule:', error);
    throw new Error(error.message || 'Erro ao criar agendamento');
  }

  return {
    ...schedule,
    status: schedule.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'shipped',
    accessories: (schedule as any).accessories as string[] || [],
    supplies: (schedule as any).supplies as string[] || []
  };
};

// Update an existing kit schedule
export const updateKitSchedule = async (id: string, data: Partial<CreateKitScheduleData> & { status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'shipped' }): Promise<KitSchedule> => {
  const { data: schedule, error } = await supabase
    .from('kit_schedules')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating kit schedule:', error);
    throw new Error(error.message || 'Erro ao atualizar agendamento');
  }

  return {
    ...schedule,
    status: schedule.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'shipped',
    accessories: (schedule as any).accessories as string[] || [],
    supplies: (schedule as any).supplies as string[] || []
  };
};

// Get schedules by customer (name or id)
export const getSchedulesByCustomer = async (customerName?: string, customerId?: string): Promise<KitScheduleWithDetails[]> => {
  let query = supabase
    .from('kit_schedules')
    .select(`
      *,
      kit:homologation_kits!kit_id (
        id,
        name,
        description,
        homologation_card_id,
        kit_items:homologation_kit_accessories(
          id,
          item_name,
          quantity,
          description,
          item_type
        ),
        homologation_card:homologation_cards(
          id,
          brand,
          model,
          status
        )
      ),
      technician:technicians!technician_id (
        id,
        name,
        address_city,
        address_state
      )
    `);

  if (customerId) {
    query = query.eq('customer_id', customerId);
  } else if (customerName) {
    query = query.eq('customer_name', customerName);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching schedules by customer:', error);
    throw new Error(error.message || 'Erro ao buscar agendamentos do cliente');
  }

  const schedulesWithDetails = (data || []).map((schedule) => {
    const kitItems = schedule.kit?.kit_items || [];
    
    // Get accessories and supplies from both sources:
    // 1. From kit_items (homologation_kit_accessories) - detailed items with quantities
    // 2. From schedule fields (accessories/supplies) - simple arrays from scheduling
    const kitAccessories = kitItems.filter((item: any) => item.item_type === 'accessory');
    const kitSupplies = kitItems.filter((item: any) => item.item_type === 'supply');
    
    // Convert schedule arrays to item format if they exist
    const scheduleAccessories = Array.isArray((schedule as any).accessories) 
      ? ((schedule as any).accessories as string[]).map((name, i) => ({
          id: `sched-acc-${schedule.id}-${i}`,
          item_name: name,
          quantity: 1,
          item_type: 'accessory',
          description: undefined
        }))
      : [];
    
    const scheduleSupplies = Array.isArray((schedule as any).supplies)
      ? ((schedule as any).supplies as string[]).map((name, i) => ({
          id: `sched-sup-${schedule.id}-${i}`,
          item_name: name,
          quantity: 1,
          item_type: 'supply',
          description: undefined
        }))
      : [];

    // Merge both sources, prioritizing kit items but adding schedule items if they don't exist
    const mergedAccessories = [...kitAccessories];
    scheduleAccessories.forEach(schedAcc => {
      if (!mergedAccessories.find(kitAcc => kitAcc.item_name === schedAcc.item_name)) {
        mergedAccessories.push(schedAcc);
      }
    });

    const mergedSupplies = [...kitSupplies];
    scheduleSupplies.forEach(schedSup => {
      if (!mergedSupplies.find(kitSup => kitSup.item_name === schedSup.item_name)) {
        mergedSupplies.push(schedSup);
      }
    });

    return {
      ...schedule,
      status: schedule.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'shipped',
      homologation_card: schedule.kit?.homologation_card || undefined,
      accessories: ((schedule as any).accessories as string[]) || [],
      supplies: ((schedule as any).supplies as string[]) || [],
      kit: schedule.kit ? {
        ...schedule.kit,
        equipment: kitItems.filter((item: any) => item.item_type === 'equipment'),
        accessories: mergedAccessories,
        supplies: mergedSupplies,
      } : undefined
    } as KitScheduleWithDetails;
  });

  return schedulesWithDetails;
};

// Get all kit schedules with details
export const getKitSchedules = async (): Promise<KitScheduleWithDetails[]> => {
  const { data: schedules, error } = await supabase
    .from('kit_schedules')
    .select(`
      *,
      kit:homologation_kits(
        id,
        name,
        description,
        homologation_card_id,
        kit_items:homologation_kit_accessories(
          id,
          item_name,
          quantity,
          description,
          item_type
        ),
        homologation_card:homologation_cards(
          id,
          brand,
          model,
          status
        )
      ),
      technician:technicians(
        id,
        name,
        address_city,
        address_state
      )
    `)
    .order('scheduled_date', { ascending: true });

  if (error) {
    console.error('Error fetching kit schedules:', error);
    throw new Error(error.message || 'Erro ao carregar agendamentos');
  }

  return schedules?.map(schedule => {
    const kitItems = schedule.kit?.kit_items || [];
    
    // Get accessories and supplies from both sources
    const kitAccessories = kitItems.filter((item: any) => item.item_type === 'accessory');
    const kitSupplies = kitItems.filter((item: any) => item.item_type === 'supply');
    
    // Convert schedule arrays to item format if they exist
    const scheduleAccessories = Array.isArray((schedule as any).accessories) 
      ? ((schedule as any).accessories as string[]).map((name, i) => ({
          id: `sched-acc-${schedule.id}-${i}`,
          item_name: name,
          quantity: 1,
          item_type: 'accessory',
          description: undefined
        }))
      : [];
    
    const scheduleSupplies = Array.isArray((schedule as any).supplies)
      ? ((schedule as any).supplies as string[]).map((name, i) => ({
          id: `sched-sup-${schedule.id}-${i}`,
          item_name: name,
          quantity: 1,
          item_type: 'supply',
          description: undefined
        }))
      : [];

    // Merge both sources
    const mergedAccessories = [...kitAccessories];
    scheduleAccessories.forEach(schedAcc => {
      if (!mergedAccessories.find(kitAcc => kitAcc.item_name === schedAcc.item_name)) {
        mergedAccessories.push(schedAcc);
      }
    });

    const mergedSupplies = [...kitSupplies];
    scheduleSupplies.forEach(schedSup => {
      if (!mergedSupplies.find(kitSup => kitSup.item_name === schedSup.item_name)) {
        mergedSupplies.push(schedSup);
      }
    });

    return {
      ...schedule,
      status: schedule.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'shipped',
      homologation_card: schedule.kit?.homologation_card || undefined,
      accessories: ((schedule as any).accessories as string[]) || [],
      supplies: ((schedule as any).supplies as string[]) || [],
      kit: schedule.kit ? {
        ...schedule.kit,
        equipment: kitItems.filter((item: any) => item.item_type === 'equipment'),
        accessories: mergedAccessories,
        supplies: mergedSupplies,
      } : undefined
    };
  }) || [];
};

// Get schedules by technician
export const getSchedulesByTechnician = async (technicianId: string): Promise<KitScheduleWithDetails[]> => {
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
          status
        )
      ),
      technician:technicians(
        id,
        name,
        address_city,
        address_state
      )
    `)
    .eq('technician_id', technicianId)
    .order('scheduled_date', { ascending: true });

  if (error) {
    console.error('Error fetching technician schedules:', error);
    throw new Error(error.message || 'Erro ao carregar agendamentos do técnico');
  }

  return schedules?.map(schedule => ({
    ...schedule,
    status: schedule.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'shipped',
    homologation_card: schedule.kit?.homologation_card || undefined,
    accessories: ((schedule as any).accessories as string[]) || [],
    supplies: ((schedule as any).supplies as string[]) || []
  })) || [];
};

// Get schedules by date range
export const getSchedulesByDateRange = async (startDate: string, endDate: string): Promise<KitScheduleWithDetails[]> => {
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
          status
        )
      ),
      technician:technicians(
        id,
        name,
        address_city,
        address_state
      )
    `)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date', { ascending: true });

  if (error) {
    console.error('Error fetching schedules by date range:', error);
    throw new Error(error.message || 'Erro ao carregar agendamentos do período');
  }

  return schedules?.map(schedule => ({
    ...schedule,
    status: schedule.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'shipped',
    homologation_card: schedule.kit?.homologation_card || undefined,
    accessories: ((schedule as any).accessories as string[]) || [],
    supplies: ((schedule as any).supplies as string[]) || []
  })) || [];
};

// Delete a kit schedule
export const deleteKitSchedule = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('kit_schedules')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting kit schedule:', error);
    throw new Error(error.message || 'Erro ao excluir agendamento');
  }
};

// Check for conflicts (same technician, date and time)
export const checkScheduleConflict = async (
  technicianId: string, 
  date: string, 
  time?: string,
  excludeScheduleId?: string
): Promise<boolean> => {
  let query = supabase
    .from('kit_schedules')
    .select('id')
    .eq('technician_id', technicianId)
    .eq('scheduled_date', date);

  if (time) {
    query = query.eq('installation_time', time);
  }

  if (excludeScheduleId) {
    query = query.neq('id', excludeScheduleId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error checking schedule conflict:', error);
    throw new Error('Erro ao verificar conflitos de horário');
  }

  return (data && data.length > 0);
};