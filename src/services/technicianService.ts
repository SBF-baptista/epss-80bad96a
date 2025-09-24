import { supabase } from "@/integrations/supabase/client";

export interface Technician {
  id?: string;
  name: string;
  address_street?: string;
  address_number?: string;
  postal_code: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTechnicianData {
  name: string;
  address_street?: string;
  address_number?: string;
  postal_code: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
}

export const createTechnician = async (data: CreateTechnicianData): Promise<Technician> => {
  const { data: user } = await supabase.auth.getUser();
  
  const { data: technician, error } = await supabase
    .from('technicians')
    .insert([{
      ...data,
      created_by: user.user?.id
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating technician:', error);
    throw new Error(error.message || 'Erro ao criar técnico');
  }

  return technician;
};

export const updateTechnician = async (id: string, data: Partial<CreateTechnicianData>): Promise<Technician> => {
  const { data: technician, error } = await supabase
    .from('technicians')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating technician:', error);
    throw new Error(error.message || 'Erro ao atualizar técnico');
  }

  return technician;
};

export const getTechnicians = async (): Promise<Technician[]> => {
  const { data: technicians, error } = await supabase
    .from('technicians')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching technicians:', error);
    throw new Error(error.message || 'Erro ao carregar técnicos');
  }

  return technicians || [];
};

export const getTechnicianById = async (id: string): Promise<Technician | null> => {
  const { data: technician, error } = await supabase
    .from('technicians')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching technician:', error);
    throw new Error(error.message || 'Erro ao carregar técnico');
  }

  return technician;
};

export const deleteTechnician = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('technicians')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting technician:', error);
    throw new Error(error.message || 'Erro ao excluir técnico');
  }
};