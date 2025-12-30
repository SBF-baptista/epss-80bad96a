import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useEditRequestsCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadCount = async () => {
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
  };

  useEffect(() => {
    loadCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('edit-requests-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'item_edit_requests'
        },
        () => loadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { count, loading };
};
