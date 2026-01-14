import { useState, useEffect } from 'react';
import { fetchSegsaleAccessories, fetchSegsaleModules, SegsaleExtra } from '@/services/segsaleExtrasService';
import { useToast } from '@/hooks/use-toast';

interface UseSegsaleExtrasResult {
  accessories: SegsaleExtra[];
  modules: SegsaleExtra[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useSegsaleExtras = (): UseSegsaleExtrasResult => {
  const [accessories, setAccessories] = useState<SegsaleExtra[]>([]);
  const [modules, setModules] = useState<SegsaleExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [accessoriesData, modulesData] = await Promise.all([
        fetchSegsaleAccessories(),
        fetchSegsaleModules()
      ]);

      setAccessories(accessoriesData);
      setModules(modulesData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados do Segsale';
      setError(errorMessage);
      console.error('Error fetching Segsale extras:', err);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar acessórios e módulos do Segsale.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { accessories, modules, loading, error, refetch: fetchData };
};
