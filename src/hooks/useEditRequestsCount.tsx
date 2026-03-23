import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCentralRealtime } from "@/hooks/useCentralRealtime";
import { useAuth } from "@/hooks/useAuth";

export const useEditRequestsCount = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadCount = useCallback(async () => {
    if (!user) {
      setCount(0);
      setLoading(false);
      return;
    }
    try {
      const { count: pendingCount, error } = await supabase
        .from('item_edit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) {
        console.error('Error loading edit requests count:', error);
        return;
      }
      
      setCount(pendingCount || 0);
    } catch (error) {
      console.error('Error loading edit requests count:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  useCentralRealtime('item_edit_requests', loadCount);

  return { count, loading };
};
