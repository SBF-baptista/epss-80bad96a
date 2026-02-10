import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppMessageLog {
  id: string;
  message_sid: string | null;
  recipient_name: string;
  recipient_phone: string;
  template_type: string | null;
  message_content: string | null;
  initial_status: string | null;
  final_status: string | null;
  error_code: number | null;
  error_message: string | null;
  friendly_message: string | null;
  dispatch_type: string;
  sent_at: string;
  created_at: string;
}

export async function fetchWhatsAppLogs(options?: {
  limit?: number;
  offset?: number;
  search?: string;
  dispatchType?: string;
}): Promise<{ data: WhatsAppMessageLog[]; count: number }> {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  let query = supabase
    .from('whatsapp_message_logs')
    .select('*', { count: 'exact' })
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.search) {
    query = query.or(
      `recipient_name.ilike.%${options.search}%,recipient_phone.ilike.%${options.search}%,message_content.ilike.%${options.search}%`
    );
  }

  if (options?.dispatchType && options.dispatchType !== 'all') {
    query = query.eq('dispatch_type', options.dispatchType);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching WhatsApp logs:', error);
    throw error;
  }

  return { data: (data as WhatsAppMessageLog[]) || [], count: count || 0 };
}
