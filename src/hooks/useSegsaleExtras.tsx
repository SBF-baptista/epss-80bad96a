import { useState, useEffect } from 'react';
import { fetchSegsaleAccessories, fetchSegsaleModules, fetchSegsaleProducts, SegsaleExtra, SegsaleProduct } from '@/services/segsaleExtrasService';
import { useToast } from '@/hooks/use-toast';

interface UseSegsaleExtrasResult {
  accessories: SegsaleExtra[];
  modules: SegsaleExtra[];
  products: SegsaleProduct[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useSegsaleExtras = (): UseSegsaleExtrasResult => {
  const [accessories, setAccessories] = useState<SegsaleExtra[]>([]);
  const [modules, setModules] = useState<SegsaleExtra[]>([]);
  const [products, setProducts] = useState<SegsaleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [accessoriesData, modulesData, productsData] = await Promise.all([
        fetchSegsaleAccessories(),
        fetchSegsaleModules(),
        fetchSegsaleProducts()
      ]);

      setAccessories(accessoriesData);
      setModules(modulesData);
      setProducts(productsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados do Segsale';
      setError(errorMessage);
      console.error('Error fetching Segsale extras:', err);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar dados do Segsale.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { accessories, modules, products, loading, error, refetch: fetchData };
};
