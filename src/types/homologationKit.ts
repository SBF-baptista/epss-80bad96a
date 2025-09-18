export interface HomologationKitAccessory {
  id?: string;
  accessory_name: string;
  quantity: number;
  notes?: string;
}

export interface HomologationKit {
  id?: string;
  homologation_card_id: string;
  name: string;
  description?: string;
  accessories: HomologationKitAccessory[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateKitRequest {
  homologation_card_id: string;
  name: string;
  description?: string;
  accessories: Omit<HomologationKitAccessory, 'id'>[];
}

export interface UpdateKitRequest {
  name?: string;
  description?: string;
  accessories?: HomologationKitAccessory[];
}