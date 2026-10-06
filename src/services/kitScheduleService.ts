import { supabase } from "@/integrations/supabase/client";
import { logCreate, logUpdate, logDelete } from "./logService";

export interface KitSchedule {
  id?: string;
  kit_id?: string | null;
  technician_id: string;
  scheduled_date: string;
  installation_time?: string;
  status: 'scheduled' | 'counting' | 'in_progress' | 'verifying' | 'completed' | 'shipped' | 'cancelled';
  notes?: string;
  configuration?: string;
  selected_kit_ids?: string[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  accessories?: string[];
  supplies?: string[];
  incoming_vehicle_id?: string;
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
    modules?: Array<{
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
    configuration?: string;
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
  incoming_vehicle_id?: string;
  vehicle_plate?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  accessories?: string[];
  supplies?: string[];
  tracking_code?: string;
}

export interface CreateKitScheduleData {
  kit_id?: string | null;
  technician_id: string;
  scheduled_date: string;
  installation_time?: string;
  notes?: string;
  configuration?: string;
  selected_kit_ids?: string[];
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
  incoming_vehicle_id?: string;
  /** Tipo de serviço do formulário (Instalação, Manutenção, Retirada, etc.).
   *  Não é persistido no banco — usado apenas para decidir se dispara Kafka/Frota. */
  service?: string;
}

// Create a new kit schedule
export const createKitSchedule = async (data: CreateKitScheduleData): Promise<KitSchedule> => {
  const { data: user } = await supabase.auth.getUser();

  // Extrai service do payload (não é coluna do banco)
  const { service, ...insertData } = data;

  // Validação obrigatória: placa deve estar na base de pendências do Frota (Segsale).
  // Se não estiver, bloqueia a criação do agendamento.
  const plateForCheck = String(insertData.vehicle_plate ?? "").trim().toUpperCase();
  if (plateForCheck) {
    try {
      const { data: checkRes, error: checkErr } = await supabase.functions.invoke(
        'frota-check-placa-pendente',
        { body: { placa: plateForCheck } },
      );
      if (checkErr) {
        console.warn('[createKitSchedule] falha ao validar placa pendente:', checkErr.message);
        throw new Error(`Não foi possível validar a placa ${plateForCheck} na base de pendências do Segsale. Tente novamente.`);
      }
      if (!checkRes?.pendente) {
        throw new Error(
          `A placa ${plateForCheck} não está na base de pendências do Segsale. Insira essa placa no Segsale para que o processo siga normalmente.`,
        );
      }
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error(String(e));
    }
  }

  const { data: schedule, error } = await supabase
    .from('kit_schedules')
    .insert([{
      ...insertData,
      created_by: user.user?.id
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating kit schedule:', error);
    throw new Error(error.message || 'Erro ao criar agendamento');
  }

  // Registrar log da criação
  await logCreate(
    "Agendamentos",
    "agendamento de kit",
    schedule.id
  );

  // Dispara integrações externas (Kafka + Frota Segsale) APENAS quando o
  // serviço for "Instalação". Outros serviços (Manutenção, Retirada, etc.)
  // não devem criar unidade no Frota. O fluxo automático do Segsale
  // (kickoff → agendamento) já dispara via edge function separada.
  const serviceLabel = (service ?? '').toString();
  const isInstalacao = serviceLabel
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim() === 'instalacao';

  if (isInstalacao) {
    console.log(`[kitScheduleService] Disparando Kafka + Frota para schedule=${schedule.id} (serviço="${serviceLabel}")`);

    supabase.functions
      .invoke('kafka-publish-agendamento', { body: { scheduleId: schedule.id } })
      .then(({ error }) => {
        if (error) console.warn('[kafka-publish-agendamento] falhou:', error.message);
      })
      .catch((e) => console.warn('[kafka-publish-agendamento] erro:', e));

    supabase.functions
      .invoke('create-frota-unidade', { body: { scheduleId: schedule.id } })
      .then(({ data, error }) => {
        if (error) console.warn('[create-frota-unidade] falhou:', error.message);
        else console.log('[create-frota-unidade] resultado:', data);
      })
      .catch((e) => console.warn('[create-frota-unidade] erro:', e));
  } else {
    console.log(`[kitScheduleService] Serviço "${serviceLabel}" ≠ Instalação — Kafka/Frota NÃO disparados para schedule=${schedule.id}`);
  }

  // WhatsApp notification removed - only sent via "Disparar Agenda" button

  return {
    ...schedule,
    status: schedule.status as KitSchedule['status'],
    accessories: schedule.accessories as string[] || [],
    supplies: schedule.supplies as string[] || []
  };
};

// Update an existing kit schedule
export const updateKitSchedule = async (id: string, data: Partial<CreateKitScheduleData>): Promise<KitSchedule> => {
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

  // Registrar log da atualização
  await logUpdate(
    "Agendamentos",
    "agendamento de kit",
    id,
    Object.keys(data).join(", ")
  );

  return {
    ...schedule,
    status: schedule.status as KitSchedule['status'],
    accessories: schedule.accessories as string[] || [],
    supplies: schedule.supplies as string[] || []
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
    return {
      ...schedule,
      status: schedule.status as KitSchedule['status'],
      homologation_card: schedule.kit?.homologation_card || undefined,
      accessories: (schedule.accessories as string[]) || [],
      supplies: (schedule.supplies as string[]) || [],
      kit: schedule.kit ? {
        ...schedule.kit,
        equipment: kitItems.filter((item: any) => ['equipment', 'tracker', 'camera'].includes(item.item_type)),
        accessories: kitItems.filter((item: any) => item.item_type === 'accessory'),
        modules: kitItems.filter((item: any) => item.item_type === 'module'),
        supplies: kitItems.filter((item: any) => item.item_type === 'supply'),
      } : undefined
    } as KitScheduleWithDetails;
  });

  return schedulesWithDetails;
};

// Get all kit schedules with details
// Only return schedules that were manually created (not from Segsale auto-flow)
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
    return {
      ...schedule,
      status: schedule.status as KitSchedule['status'],
      homologation_card: schedule.kit?.homologation_card || undefined,
      accessories: (schedule.accessories as string[]) || [],
      supplies: (schedule.supplies as string[]) || [],
      kit: schedule.kit ? {
        ...schedule.kit,
        equipment: kitItems.filter((item: any) => ['equipment', 'tracker', 'camera'].includes(item.item_type)),
        accessories: kitItems.filter((item: any) => item.item_type === 'accessory'),
        modules: kitItems.filter((item: any) => item.item_type === 'module'),
        supplies: kitItems.filter((item: any) => item.item_type === 'supply'),
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
    status: schedule.status as KitSchedule['status'],
    homologation_card: schedule.kit?.homologation_card || undefined,
    accessories: (schedule.accessories as string[]) || [],
    supplies: (schedule.supplies as string[]) || []
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
    status: schedule.status as KitSchedule['status'],
    homologation_card: schedule.kit?.homologation_card || undefined,
    accessories: (schedule.accessories as string[]) || [],
    supplies: (schedule.supplies as string[]) || []
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

  // Registrar log da exclusão
  await logDelete(
    "Agendamentos",
    "agendamento de kit",
    id
  );
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