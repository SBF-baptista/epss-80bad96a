import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Permission for the Kickoff → Scheduling bypass action.
 * Granted when the user is admin OR their email is present in
 * `public.kickoff_bypass_allowed_users`. Backend is the source of truth;
 * this hook only controls UI visibility.
 */
export const useKickoffBypassPermission = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const admin = isAdmin();
  const email = user?.email?.toLowerCase() ?? null;

  const { data: emailAllowed = false, isLoading } = useQuery({
    queryKey: ["kickoff-bypass-allowed", email],
    queryFn: async () => {
      if (!email) return false;
      const { data, error } = await supabase
        .from("kickoff_bypass_allowed_users")
        .select("email")
        .ilike("email", email)
        .maybeSingle();
      if (error) {
        console.warn("[useKickoffBypassPermission] lookup error:", error);
        return false;
      }
      return !!data;
    },
    enabled: !!email && !admin,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    canBypass: admin || emailAllowed,
    isLoading: !admin && isLoading,
  };
};
