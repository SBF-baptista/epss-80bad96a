export type ItemType = 'equipment' | 'accessory' | 'supply' | 'module';

export interface HomologationKitItem {
  id?: string;
  item_name: string;
  item_type: ItemType;
  quantity: number;
  description?: string;
  notes?: string;
}

export interface HomologationKitAccessory extends HomologationKitItem {
  item_type: 'accessory';
}

export type KitCategory = 'telemetria' | 'videomonitoramento' | 'rastreamento';

export interface HomologationKit {
  id?: string;
  homologation_card_id?: string;
  name: string;
  description?: string;
  category?: KitCategory | string | null;
  equipment: HomologationKitItem[];
  accessories: HomologationKitItem[];
  modules: HomologationKitItem[];
  supplies: HomologationKitItem[];
  segsale_product?: string | null;
  segsale_modules?: string[] | null;
  segsale_accessories?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateKitRequest {
  homologation_card_id?: string;
  name: string;
  description?: string;
  category?: string;
  equipment: Omit<HomologationKitItem, 'id'>[];
  accessories: Omit<HomologationKitItem, 'id'>[];
  modules: Omit<HomologationKitItem, 'id'>[];
  supplies: Omit<HomologationKitItem, 'id'>[];
  segsale_product?: string;
  segsale_modules?: string[];
  segsale_accessories?: string[];
}

export interface UpdateKitRequest {
  name?: string;
  description?: string;
  equipment?: HomologationKitItem[];
  accessories?: HomologationKitItem[];
  modules?: HomologationKitItem[];
  supplies?: HomologationKitItem[];
}