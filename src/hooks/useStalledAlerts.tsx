import { useQuery } from "@tanstack/react-query";
import { getStalledAlerts } from "@/services/stalledAlertsService";
import { useAuth } from "@/hooks/useAuth";

export const useStalledAlerts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["stalled-alerts"],
    queryFn: getStalledAlerts,
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
};
