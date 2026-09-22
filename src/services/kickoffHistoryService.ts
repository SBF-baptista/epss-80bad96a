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
  approved_by_email?: string | null;
  approved_at: string;
  created_at: string;
  updated_at: string;
}

export const getKickoffHistory = async (): Promise<KickoffHistoryRecord[]> => {
  const { data, error } = await supabase
    .from('kickoff_history')
    .select('*')
    .order('company_name', { ascending: true })
    .order('approved_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching kickoff history:', error);
    throw error;
  }

  const records = (data as KickoffHistoryRecord[]) || [];

  // Fetch approver emails
  const approverIds = [...new Set(records.map(r => r.approved_by).filter(Boolean))] as string[];
  if (approverIds.length > 0) {
    const { data: users } = await supabase
      .from('usuarios')
      .select('id, email')
      .in('id', approverIds);
    const emailById = new Map((users || []).map(u => [u.id, u.email]));
    records.forEach(r => {
      // Prefer the e-mail stored at approval time; fall back to the users table
      if (!r.approved_by_email) {
        r.approved_by_email = r.approved_by ? (emailById.get(r.approved_by) ?? null) : null;
      }
    });
  }

  // Group by company_name to show all kickoffs for the same client together
  const groupedData = records.reduce((acc, record) => {
    const companyKey = record.company_name.trim().toUpperCase();
    if (!acc[companyKey]) {
      acc[companyKey] = [];
    }
    acc[companyKey].push(record);
    return acc;
  }, {} as Record<string, KickoffHistoryRecord[]>);

  // Flatten back to array, maintaining grouping
  return Object.values(groupedData).flat();
};
