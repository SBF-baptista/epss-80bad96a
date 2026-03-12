import { supabase } from "@/integrations/supabase/client";

export interface InstallationConfirmation {
  id: string;
  plate: string;
  imei: string;
  source: string | null;
  raw_payload: any;
  matched_schedule_id: string | null;
  created_at: string;
}

export const getInstallationConfirmations = async (): Promise<InstallationConfirmation[]> => {
  const { data, error } = await supabase
    .from("installation_confirmations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching installation confirmations:", error);
    throw new Error(error.message);
  }

  return data || [];
};

export const getConfirmationsByPlate = async (plate: string): Promise<InstallationConfirmation[]> => {
  const normalized = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const { data, error } = await supabase
    .from("installation_confirmations")
    .select("*")
    .eq("plate", normalized)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching confirmations by plate:", error);
    throw new Error(error.message);
  }

  return data || [];
};

export const getConfirmationsBySchedule = async (scheduleId: string): Promise<InstallationConfirmation[]> => {
  const { data, error } = await supabase
    .from("installation_confirmations")
    .select("*")
    .eq("matched_schedule_id", scheduleId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching confirmations by schedule:", error);
    throw new Error(error.message);
  }

  return data || [];
};
