export type ItemType = 'equipment' | 'accessory' | 'supply';

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

export interface HomologationKit {
  id?: string;
  homologation_card_id?: string;
  name: string;
  description?: string;
  equipment: HomologationKitItem[];
  accessories: HomologationKitItem[];
  supplies: HomologationKitItem[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateKitRequest {
  homologation_card_id?: string;
  name: string;
  description?: string;
  equipment: Omit<HomologationKitItem, 'id'>[];
  accessories: Omit<HomologationKitItem, 'id'>[];
  supplies: Omit<HomologationKitItem, 'id'>[];
}

export interface UpdateKitRequest {
  name?: string;
  description?: string;
  equipment?: HomologationKitItem[];
  accessories?: HomologationKitItem[];
  supplies?: HomologationKitItem[];
}