import { useEffect } from 'react';
import { realtimeService } from '@/services/realtimeService';

/**
 * Hook to subscribe to a table via the centralized RealtimeService.
 * Calls `onUpdate` when changes occur (debounced 500ms).
 * 
 * @param tableName - Supabase table to listen to
 * @param onUpdate - Callback when changes detected
 */
export const useCentralRealtime = (tableName: string, onUpdate: () => void) => {
  useEffect(() => {
    const unsubscribe = realtimeService.subscribe(tableName, onUpdate);
    return unsubscribe;
  }, [tableName, onUpdate]);
};
