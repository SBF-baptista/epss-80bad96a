import { supabase } from '@/integrations/supabase/client';
import { ItemType } from '@/types/homologationKit';

export interface PendingItem {
  item_name: string;
  item_type: ItemType;
  quantity: number;
  oldest_item_created_at?: string;
  kits: Array<{
    id: string;
    name: string;
    homologation_card_id?: string;
  }>;
  customers?: Array<{
    id: string;
    name: string;
    vehicles_count: number;
  }>;
}

export interface PendingItemsResponse {
  accessories: PendingItem[];
  supplies: PendingItem[];
  equipment: PendingItem[];
}

// Get all items that are used in kits but are not homologated
export async function fetchPendingHomologationItems(): Promise<PendingItemsResponse> {
  try {
    // First, get all homologated items from kit_item_options
    const { data: homologatedItems, error: homologatedError } = await supabase
      .from('kit_item_options')
      .select('item_name, item_type');

    if (homologatedError) {
      console.error('Error fetching homologated items:', homologatedError);
      throw homologatedError;
    }

    const homologatedMap = new Set(
      homologatedItems?.map(item => `${item.item_name}|${item.item_type}`) || []
    );

    // Get all kits with their items
    const { data: kits, error: kitsError } = await supabase
      .from('homologation_kits')
      .select(`
        id,
        name,
        homologation_card_id
      `);

    if (kitsError) {
      console.error('Error fetching kits:', kitsError);
      throw kitsError;
    }

    // Get all kit items
    const { data: kitItems, error: itemsError } = await supabase
      .from('homologation_kit_accessories')
      .select(`
        kit_id,
        item_name,
        item_type,
        quantity,
        created_at
      `);

    if (itemsError) {
      console.error('Error fetching kit items:', itemsError);
      throw itemsError;
    }

    // Create a map of kit_id to kit info
    const kitsMap = new Map(
      kits?.map(kit => [kit.id, kit]) || []
    );

    // Group pending items by type and name
    const pendingItemsMap = new Map<string, {
      item_name: string;
      item_type: ItemType;
      totalQuantity: number;
      kits: Set<string>;
      oldest_created_at?: string;
    }>();

    kitItems?.forEach(item => {
      const itemKey = `${item.item_name}|${item.item_type}`;
      
      // Check if item is not homologated
      if (!homologatedMap.has(itemKey)) {
        const existingItem = pendingItemsMap.get(itemKey);
        
        if (existingItem) {
          existingItem.totalQuantity += item.quantity;
          existingItem.kits.add(item.kit_id);
          // Update oldest_created_at if this item is older
          if (item.created_at && (!existingItem.oldest_created_at || item.created_at < existingItem.oldest_created_at)) {
            existingItem.oldest_created_at = item.created_at;
          }
        } else {
          pendingItemsMap.set(itemKey, {
            item_name: item.item_name,
            item_type: item.item_type as ItemType,
            totalQuantity: item.quantity,
            kits: new Set([item.kit_id]),
            oldest_created_at: item.created_at
          });
        }
      }
    });


    // Convert to response format
    const result: PendingItemsResponse = {
      accessories: [],
      supplies: [],
      equipment: []
    };

    // Add items from kits only
    pendingItemsMap.forEach((pendingItem) => {
      const kitsForItem = Array.from(pendingItem.kits)
        .map(kitId => kitsMap.get(kitId))
        .filter(Boolean)
        .map(kit => ({
          id: kit!.id,
          name: kit!.name,
          homologation_card_id: kit!.homologation_card_id
        }));

      const item: PendingItem = {
        item_name: pendingItem.item_name,
        item_type: pendingItem.item_type,
        quantity: pendingItem.totalQuantity,
        oldest_item_created_at: pendingItem.oldest_created_at,
        kits: kitsForItem,
        customers: []
      };

      switch (pendingItem.item_type) {
        case 'accessory':
          result.accessories.push(item);
          break;
        case 'supply':
          result.supplies.push(item);
          break;
        case 'equipment':
          result.equipment.push(item);
          break;
      }
    });

    // Sort by item name
    result.accessories.sort((a, b) => a.item_name.localeCompare(b.item_name));
    result.supplies.sort((a, b) => a.item_name.localeCompare(b.item_name));
    result.equipment.sort((a, b) => a.item_name.localeCompare(b.item_name));

    return result;
  } catch (error) {
    console.error('Error in fetchPendingHomologationItems:', error);
    throw error;
  }
}