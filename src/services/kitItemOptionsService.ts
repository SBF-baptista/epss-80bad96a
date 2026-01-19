import { supabase } from "@/integrations/supabase/client";
import { ItemType } from "@/types/homologationKit";
import { logCreate, logDelete } from "./logService";

export interface KitItemOption {
  id: string;
  item_name: string;
  item_type: ItemType;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateKitItemOptionRequest {
  item_name: string;
  item_type: ItemType;
  description?: string;
}

export const fetchKitItemOptions = async (itemType?: ItemType): Promise<KitItemOption[]> => {
  try {
    let query = supabase
      .from('kit_item_options')
      .select('*')
      .order('item_name');

    if (itemType) {
      query = query.eq('item_type', itemType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching kit item options:', error);
      throw error;
    }

    return data?.map(item => ({
      ...item,
      item_type: item.item_type as ItemType
    })) || [];
  } catch (error) {
    console.error('Error in fetchKitItemOptions:', error);
    throw error;
  }
};

export const createKitItemOption = async (optionData: CreateKitItemOptionRequest): Promise<KitItemOption> => {
  try {
    const { data, error } = await supabase
      .from('kit_item_options')
      .insert({
        item_name: optionData.item_name,
        item_type: optionData.item_type,
        description: optionData.description,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating kit item option:', error);
      throw error;
    }

    // Registrar log da criação
    await logCreate(
      "Acessórios e Insumos",
      `${optionData.item_type === 'accessory' ? 'acessório' : optionData.item_type === 'supply' ? 'insumo' : 'equipamento'} "${optionData.item_name}"`,
      data.id
    );

    return {
      ...data,
      item_type: data.item_type as ItemType
    };
  } catch (error) {
    console.error('Error in createKitItemOption:', error);
    throw error;
  }
};

export const deleteKitItemOption = async (optionId: string): Promise<{ count: number }> => {
  try {
    // Buscar o item antes de deletar para registrar no log
    const { data: itemData } = await supabase
      .from('kit_item_options')
      .select('item_name, item_type')
      .eq('id', optionId)
      .single();

    const { error, count } = await supabase
      .from('kit_item_options')
      .delete({ count: 'exact' })
      .eq('id', optionId);

    if (error) {
      console.error('Error deleting kit item option:', error);
      throw error;
    }

    // If no rows were deleted, it likely means RLS blocked the operation or the item doesn't exist
    if (!count || count === 0) {
      throw new Error('Sem permissão para excluir ou item não encontrado.');
    }

    // Registrar log da exclusão
    if (itemData) {
      await logDelete(
        "Acessórios e Insumos",
        `${itemData.item_type === 'accessory' ? 'acessório' : itemData.item_type === 'supply' ? 'insumo' : 'equipamento'} "${itemData.item_name}"`,
        optionId
      );
    }

    return { count };
  } catch (error) {
    console.error('Error in deleteKitItemOption:', error);
    throw error;
  }
};

export const checkIfItemExists = async (itemName: string, itemType: ItemType): Promise<boolean> => {
  try {
    const normalizedName = itemName.toLowerCase().trim();
    
    const { data, error } = await supabase
      .from('kit_item_options')
      .select('id, item_name')
      .eq('item_type', itemType);

    if (error) {
      console.error('Error checking if item exists:', error);
      throw error;
    }

    // Case-insensitive comparison
    return data?.some(item => 
      item.item_name.toLowerCase().trim() === normalizedName
    ) ?? false;
  } catch (error) {
    console.error('Error in checkIfItemExists:', error);
    throw error;
  }
};

export const findExistingItem = async (itemName: string, itemType: ItemType): Promise<KitItemOption | null> => {
  try {
    const normalizedName = itemName.toLowerCase().trim();
    
    const { data, error } = await supabase
      .from('kit_item_options')
      .select('*')
      .eq('item_type', itemType);

    if (error) {
      console.error('Error finding existing item:', error);
      throw error;
    }

    const existingItem = data?.find(item => 
      item.item_name.toLowerCase().trim() === normalizedName
    );

    if (!existingItem) return null;

    return {
      ...existingItem,
      item_type: existingItem.item_type as ItemType
    };
  } catch (error) {
    console.error('Error in findExistingItem:', error);
    throw error;
  }
};