import { useState, useEffect } from 'react';
import { fetchFipeBrands, fetchFipeModels, fetchFipeYears, FipeBrand, FipeModel, FipeYear } from '@/services/fipeService';

export const useFipeBrands = () => {
  const [brands, setBrands] = useState<FipeBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBrands = async () => {
      try {
        const brandData = await fetchFipeBrands();
        setBrands(brandData);
      } catch (err) {
        setError('Erro ao carregar marcas');
      } finally {
        setLoading(false);
      }
    };

    loadBrands();
  }, []);

  return { brands, loading, error };
};

export const useFipeModels = (brandCode: string) => {
  const [models, setModels] = useState<FipeModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandCode) {
      setModels([]);
      return;
    }

    const loadModels = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const modelData = await fetchFipeModels(brandCode);
        setModels(modelData);
      } catch (err) {
        setError('Erro ao carregar modelos');
        setModels([]);
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, [brandCode]);

  return { models, loading, error };
};

export const useFipeYears = (brandCode: string, modelCode: string) => {
  const [years, setYears] = useState<FipeYear[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandCode || !modelCode) {
      setYears([]);
      return;
    }

    const loadYears = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const yearData = await fetchFipeYears(brandCode, modelCode);
        setYears(yearData);
      } catch (err) {
        setError('Erro ao carregar anos');
        setYears([]);
      } finally {
        setLoading(false);
      }
    };

    loadYears();
  }, [brandCode, modelCode]);

  return { years, loading, error };
};
