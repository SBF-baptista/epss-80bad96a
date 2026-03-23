import { useQuery } from '@tanstack/react-query';
import { fetchSegsaleAccessories, fetchSegsaleModules, fetchSegsaleProducts, SegsaleExtra, SegsaleProduct } from '@/services/segsaleExtrasService';

const FOUR_HOURS = 4 * 60 * 60 * 1000;

interface UseSegsaleExtrasResult {
  accessories: SegsaleExtra[];
  modules: SegsaleExtra[];
  products: SegsaleProduct[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useSegsaleExtras = (): UseSegsaleExtrasResult => {
  const accessoriesQuery = useQuery({
    queryKey: ['segsale-accessories'],
    queryFn: fetchSegsaleAccessories,
    staleTime: FOUR_HOURS,
    gcTime: FOUR_HOURS,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  const modulesQuery = useQuery({
    queryKey: ['segsale-modules'],
    queryFn: fetchSegsaleModules,
    staleTime: FOUR_HOURS,
    gcTime: FOUR_HOURS,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  const productsQuery = useQuery({
    queryKey: ['segsale-products'],
    queryFn: fetchSegsaleProducts,
    staleTime: FOUR_HOURS,
    gcTime: FOUR_HOURS,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  const loading = accessoriesQuery.isLoading || modulesQuery.isLoading || productsQuery.isLoading;
  const error = accessoriesQuery.error?.message || modulesQuery.error?.message || productsQuery.error?.message || null;

  const refetch = async () => {
    await Promise.all([
      accessoriesQuery.refetch(),
      modulesQuery.refetch(),
      productsQuery.refetch(),
    ]);
  };

  return {
    accessories: accessoriesQuery.data ?? [],
    modules: modulesQuery.data ?? [],
    products: productsQuery.data ?? [],
    loading,
    error,
    refetch,
  };
};
