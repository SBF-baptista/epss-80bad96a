import { useMemo } from 'react';
import { 
  vehicleCategories, 
  getBrandsByCategory, 
  getBrandCategory,
  getAllBrands,
  type VehicleCategory
} from '@/types/vehicleCategories';

export interface FilterOption {
  value: string;
  label: string;
  category?: "HCV" | "LCV" | "BOTH";
}

export const useVehicleCategories = () => {
  // Opções de filtro organizadas por categoria
  const categoryFilterOptions = useMemo((): FilterOption[] => {
    return vehicleCategories.map(category => ({
      value: category.code,
      label: category.name,
      category: category.code
    }));
  }, []);

  // Todas as marcas organizadas por categoria para filtros
  const brandFilterOptions = useMemo((): FilterOption[] => {
    const allBrands = getAllBrands();
    
    return allBrands.map(brand => {
      const categories = getBrandCategory(brand);
      const categoryLabel = categories.length > 1 ? 'BOTH' : categories[0];
      
      return {
        value: brand,
        label: brand,
        category: categoryLabel as "HCV" | "LCV" | "BOTH"
      };
    });
  }, []);

  // Agrupar marcas por categoria para display organizado
  const groupedBrands = useMemo(() => {
    return {
      HCV: getBrandsByCategory("HCV"),
      LCV: getBrandsByCategory("LCV"),
      BOTH: vehicleCategories.find(cat => cat.code === "BOTH")?.brands || []
    };
  }, []);

  // Filtrar marcas por categoria
  const filterBrandsByCategory = (category: "HCV" | "LCV" | "ALL"): string[] => {
    if (category === "ALL") return getAllBrands();
    return getBrandsByCategory(category);
  };

  // Verificar se uma marca pertence a uma categoria
  const isBrandInCategory = (brand: string, category: "HCV" | "LCV"): boolean => {
    const brandCategories = getBrandCategory(brand);
    return brandCategories.includes(category);
  };

  // Buscar marcas com suporte a categoria
  const searchBrands = (searchTerm: string, categoryFilter?: "HCV" | "LCV"): FilterOption[] => {
    let brands = brandFilterOptions;
    
    // Filtrar por categoria se especificada
    if (categoryFilter) {
      brands = brands.filter(brand => 
        brand.category === categoryFilter || brand.category === "BOTH"
      );
    }
    
    // Filtrar por termo de busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      brands = brands.filter(brand =>
        brand.label.toLowerCase().includes(searchLower)
      );
    }
    
    return brands.sort((a, b) => a.label.localeCompare(b.label));
  };

  return {
    vehicleCategories,
    categoryFilterOptions,
    brandFilterOptions,
    groupedBrands,
    filterBrandsByCategory,
    isBrandInCategory,
    searchBrands,
    getBrandCategory,
    getAllBrands
  };
};