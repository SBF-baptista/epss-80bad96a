import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Hook for setting up realtime subscriptions to Supabase tables
 * Automatically invalidates React Query cache when changes occur
 * 
 * @param tableName - The Supabase table name to subscribe to
 * @param queryKey - The React Query key to invalidate on changes
 * @param filter - Optional filter configuration for postgres_changes
 * @param onUpdate - Optional callback when changes occur
 */
export const useRealtimeSubscription = (
  tableName: string,
  queryKey: string | string[],
  filter?: {
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    schema?: string;
  },
  onUpdate?: () => void
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channelName = `${tableName}-changes-${Date.now()}`;
    console.log(`Setting up realtime subscription for ${tableName}`);
    
    const channel = supabase
      .channel(channelName)
      .on<RealtimePostgresChangesPayload<any>>(
        'postgres_changes' as any,
        {
          event: filter?.event || '*',
          schema: filter?.schema || 'public',
          table: tableName
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log(`Realtime update received for ${tableName}:`, payload.eventType);
          // Invalidate and refetch when changes occur
          const key = Array.isArray(queryKey) ? queryKey : [queryKey];
          queryClient.invalidateQueries({ queryKey: key });
          // Call optional callback
          if (onUpdate) {
            onUpdate();
          }
        }
      )
      .subscribe();

    return () => {
      console.log(`Cleaning up realtime subscription for ${tableName}`);
      supabase.removeChannel(channel);
    };
  }, [tableName, queryKey, queryClient, filter?.event, filter?.schema, onUpdate]);
};
