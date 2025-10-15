import { supabase } from "@/integrations/supabase/client";

export interface KickoffHistoryRecord {
  id: string;
  sale_summary_id: number;
  company_name: string;
  total_vehicles: number;
  contacts: any;
  installation_locations: any;
  has_installation_particularity: boolean;
  installation_particularity_details: string | null;
  kickoff_notes: string | null;
  vehicles_data: any;
  approved_by: string | null;
  approved_at: string;
  created_at: string;
  updated_at: string;
}

export const getKickoffHistory = async (): Promise<KickoffHistoryRecord[]> => {
  const { data, error } = await supabase
    .from('kickoff_history')
    .select('*')
    .order('approved_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching kickoff history:', error);
    throw error;
  }

  return (data as KickoffHistoryRecord[]) || [];
};
