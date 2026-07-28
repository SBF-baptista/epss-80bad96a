import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Permissão para ativar/desativar unidades (Frota/Auto).
 * Concedida a admins OU a e-mails presentes em
 * `public.unit_activation_allowed_users`. O backend é a fonte da verdade;
 * este hook controla apenas a visibilidade na UI.
 */
export const useUnitActivationPermission = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const admin = isAdmin();
  const email = user?.email?.toLowerCase() ?? null;

  const { data: emailAllowed = false, isLoading } = useQuery({
    queryKey: ["unit-activation-allowed", email],
    queryFn: async () => {
      if (!email) return false;
      const { data, error } = await supabase
        .from("unit_activation_allowed_users")
        .select("email")
        .ilike("email", email)
        .maybeSingle();
      if (error) {
        console.warn("[useUnitActivationPermission] lookup error:", error);
        return false;
      }
      return !!data;
    },
    enabled: !!email && !admin,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    canActivateUnits: admin || emailAllowed,
    isLoading: !admin && isLoading,
  };
};
