export interface VehicleCategory {
  code: "HCV" | "LCV" | "BOTH";
  name: string;
  description: string;
  brands: string[];
}

export interface VehicleBrandClassification {
  brand: string;
  categories: Array<"HCV" | "LCV">;
  normalizedName: string;
}

// Classificação das marcas por categoria
export const vehicleBrandCategories: VehicleBrandClassification[] = [
  // Heavy Commercial Vehicle (HCV) - Veículos Pesados
  { brand: "Mercedes-Benz", categories: ["HCV"], normalizedName: "MERCEDES-BENZ" },
  { brand: "Volvo", categories: ["HCV"], normalizedName: "VOLVO" },
  { brand: "Scania", categories: ["HCV"], normalizedName: "SCANIA" },
  { brand: "DAF", categories: ["HCV"], normalizedName: "DAF" },
  { brand: "Iveco", categories: ["HCV"], normalizedName: "IVECO" },
  { brand: "CATERPILLAR", categories: ["HCV"], normalizedName: "CATERPILLAR" },
  { brand: "XCMG", categories: ["HCV"], normalizedName: "XCMG" },
  
  // Light Commercial Vehicle (LCV) - Veículos Leves
  { brand: "Fiat", categories: ["LCV"], normalizedName: "FIAT" },
  { brand: "Renault", categories: ["LCV"], normalizedName: "RENAULT" },
  { brand: "Peugeot", categories: ["LCV"], normalizedName: "PEUGEOT" },
  { brand: "CITROEN", categories: ["LCV"], normalizedName: "CITROEN" },
  { brand: "BMW", categories: ["LCV"], normalizedName: "BMW" },
  
  // Ambos (HCV e LCV)
  { brand: "FORD", categories: ["HCV", "LCV"], normalizedName: "FORD" },
  { brand: "VOLKSWAGEN", categories: ["HCV", "LCV"], normalizedName: "VOLKSWAGEN" },
  { brand: "HYUNDAI", categories: ["HCV", "LCV"], normalizedName: "HYUNDAI" },
];

// Estrutura para filtros da interface
export const vehicleCategories: VehicleCategory[] = [
  {
    code: "HCV",
    name: "Veículos Pesados",
    description: "Heavy Commercial Vehicle - Caminhões e veículos de grande porte",
    brands: vehicleBrandCategories
      .filter(item => item.categories.includes("HCV"))
      .map(item => item.brand)
      .sort()
  },
  {
    code: "LCV", 
    name: "Veículos Leves",
    description: "Light Commercial Vehicle - Veículos comerciais leves",
    brands: vehicleBrandCategories
      .filter(item => item.categories.includes("LCV"))
      .map(item => item.brand)
      .sort()
  },
  {
    code: "BOTH",
    name: "Ambas Categorias",
    description: "Marcas que fabricam tanto veículos pesados quanto leves",
    brands: vehicleBrandCategories
      .filter(item => item.categories.length > 1)
      .map(item => item.brand)
      .sort()
  }
];

// Utilitários para busca e filtros
export const getBrandCategory = (brand: string): Array<"HCV" | "LCV"> => {
  const normalized = brand.toUpperCase();
  const brandData = vehicleBrandCategories.find(
    item => item.normalizedName === normalized || item.brand.toUpperCase() === normalized
  );
  return brandData?.categories || [];
};

export const getBrandsByCategory = (category: "HCV" | "LCV"): string[] => {
  return vehicleBrandCategories
    .filter(item => item.categories.includes(category))
    .map(item => item.brand)
    .sort();
};

export const getAllBrands = (): string[] => {
  return vehicleBrandCategories.map(item => item.brand).sort();
};

// Para facilitar adição de novas marcas no futuro
export const addNewBrand = (brand: string, categories: Array<"HCV" | "LCV">): VehicleBrandClassification => {
  const newBrand: VehicleBrandClassification = {
    brand,
    categories,
    normalizedName: brand.toUpperCase()
  };
  
  // Verificar se já existe
  const exists = vehicleBrandCategories.some(
    item => item.normalizedName === newBrand.normalizedName
  );
  
  if (!exists) {
    vehicleBrandCategories.push(newBrand);
  }
  
  return newBrand;
};

// Validação de categoria
export const isValidCategory = (category: string): category is "HCV" | "LCV" => {
  return category === "HCV" || category === "LCV";
};