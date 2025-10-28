import { supabase } from "@/integrations/supabase/client";
import { ItemType } from "@/types/homologationKit";

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

    return { count };
  } catch (error) {
    console.error('Error in deleteKitItemOption:', error);
    throw error;
  }
};

export const checkIfItemExists = async (itemName: string, itemType: ItemType): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('kit_item_options')
      .select('id')
      .eq('item_name', itemName.trim())
      .eq('item_type', itemType)
      .limit(1);

    if (error) {
      console.error('Error checking if item exists:', error);
      throw error;
    }

    return (data && data.length > 0);
  } catch (error) {
    console.error('Error in checkIfItemExists:', error);
    throw error;
  }
};