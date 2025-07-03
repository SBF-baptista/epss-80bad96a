import { useState, useEffect } from 'react';
import { fetchCitiesByState, fetchStates, IBGEState } from '@/services/ibgeService';

export const useCities = (stateCode: string) => {
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stateCode) {
      setCities([]);
      return;
    }

    const loadCities = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const cityData = await fetchCitiesByState(stateCode);
        setCities(cityData);
      } catch (err) {
        setError('Erro ao carregar cidades');
        setCities([]);
      } finally {
        setLoading(false);
      }
    };

    loadCities();
  }, [stateCode]);

  return { cities, loading, error };
};

export const useStates = () => {
  const [states, setStates] = useState<IBGEState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStates = async () => {
      try {
        const stateData = await fetchStates();
        setStates(stateData);
      } catch (err) {
        setError('Erro ao carregar estados');
      } finally {
        setLoading(false);
      }
    };

    loadStates();
  }, []);

  return { states, loading, error };
};