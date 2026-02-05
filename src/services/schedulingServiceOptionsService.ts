import { supabase } from "@/integrations/supabase/client";

export interface SchedulingServiceOption {
  id: string;
  service_name: string;
  created_at: string;
  created_by: string | null;
}

export const getSchedulingServiceOptions = async (): Promise<SchedulingServiceOption[]> => {
  const { data, error } = await supabase
    .from("scheduling_service_options")
    .select("*")
    .order("service_name", { ascending: true });

  if (error) {
    console.error("Error fetching scheduling service options:", error);
    throw error;
  }

  return data || [];
};

export const createSchedulingServiceOption = async (serviceName: string): Promise<SchedulingServiceOption> => {
  const { data: userData } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from("scheduling_service_options")
    .insert({
      service_name: serviceName.trim(),
      created_by: userData?.user?.id || null
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation - service already exists
      throw new Error("Este serviço já existe");
    }
    console.error("Error creating scheduling service option:", error);
    throw error;
  }

  return data;
};
