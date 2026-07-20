import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

// Considera "pendente há muito tempo" após este limite.
const PENDING_THRESHOLD_MINUTES = 5;

export const useFrotaUnitFailedCount = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadCount = useCallback(async () => {
    if (!user || role !== "admin") {
      setCount(0);
      setLoading(false);
      return;
    }
    try {
      const cutoff = new Date(Date.now() - PENDING_THRESHOLD_MINUTES * 60_000).toISOString();

      const [failed, stalePending] = await Promise.all([
        supabase
          .from("kit_schedules")
          .select("*", { count: "exact", head: true })
          .eq("frota_unit_status", "failed"),
        supabase
          .from("kit_schedules")
          .select("*", { count: "exact", head: true })
          .eq("frota_unit_status", "pending")
          .lt("created_at", cutoff),
      ]);

      setCount((failed.count || 0) + (stalePending.count || 0));
    } catch (e) {
      console.error("Error loading frota unit failed count:", e);
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    loadCount();
    // refresh a cada 60s para o badge do menu
    const t = setInterval(loadCount, 60_000);
    return () => clearInterval(t);
  }, [loadCount]);

  return { count, loading, refresh: loadCount };
};
