import { useEffect, useRef } from 'react';
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
  const invalidateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryKeySignature = JSON.stringify(Array.isArray(queryKey) ? queryKey : [queryKey]);
  const filterSignature = JSON.stringify(filter ?? {});

  useEffect(() => {
    const normalizedQueryKey = Array.isArray(queryKey) ? queryKey : [queryKey];
    const currentFilter = filter ?? {};
    const channelName = `${tableName}-changes-${Date.now()}`;
    console.log(`Setting up realtime subscription for ${tableName}`);
    
    const channel = supabase
      .channel(channelName)
      .on<RealtimePostgresChangesPayload<any>>(
        'postgres_changes' as any,
        {
          event: currentFilter.event || '*',
          schema: currentFilter.schema || 'public',
          table: tableName
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log(`Realtime update received for ${tableName}:`, payload.eventType);

          if (invalidateTimeoutRef.current) {
            clearTimeout(invalidateTimeoutRef.current);
          }

          invalidateTimeoutRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: normalizedQueryKey });

            if (onUpdate) {
              onUpdate();
            }
          }, 400);
        }
      )
      .subscribe();

    return () => {
      if (invalidateTimeoutRef.current) {
        clearTimeout(invalidateTimeoutRef.current);
      }

      console.log(`Cleaning up realtime subscription for ${tableName}`);
      supabase.removeChannel(channel);
    };
  }, [tableName, queryClient, queryKeySignature, filterSignature, onUpdate]);
};
