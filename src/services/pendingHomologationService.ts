import { supabase } from '@/integrations/supabase/client';
import { ItemType } from '@/types/homologationKit';
import { normalizeItemName } from '@/utils/itemNormalization';

export interface PendingItem {
  item_name: string;
  item_type: ItemType;
  quantity: number;
  last_pending_date?: string;
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
  vehicles_count?: number; // Count of vehicles using this accessory
}

export interface PendingItemsResponse {
  accessories: PendingItem[];
  supplies: PendingItem[];
  equipment: PendingItem[];
}

// Get all items that are used in kits but are not homologated
export async function fetchPendingHomologationItems(): Promise<PendingItemsResponse> {
  try {
    // Get all homologated items from kit_item_options
    const { data: homologatedItems, error: homologatedError } = await supabase
      .from('kit_item_options')
      .select('item_name, item_type');

    if (homologatedError) {
      console.error('Error fetching homologated items:', homologatedError);
      throw homologatedError;
    }

    // Create a normalized set of homologated items
    const homologatedSet = new Set(
      homologatedItems?.map(item => normalizeItemName(item.item_name)) || []
    );

    // Get the latest status change for each item to pending
    const { data: statusHistory, error: historyError } = await supabase
      .from('item_homologation_history')
      .select('item_name, item_type, status, changed_at')
      .eq('status', 'pending')
      .order('changed_at', { ascending: false });

    if (historyError) {
      console.error('Error fetching item status history:', historyError);
      throw historyError;
    }

    // Create a map of last pending date for each item
    const lastPendingDateMap = new Map<string, string>();
    statusHistory?.forEach(record => {
      const normalizedName = normalizeItemName(record.item_name);
      const itemKey = `${normalizedName}|${record.item_type}`;
      if (!lastPendingDateMap.has(itemKey)) {
        lastPendingDateMap.set(itemKey, record.changed_at);
      }
    });

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

    // Get all vehicle accessories (from accessories table) - exclude Módulos category
    const { data: vehicleAccessories, error: accessoriesError } = await supabase
      .from('accessories')
      .select('name, quantity, categories, company_name, vehicle_id')
      .or('categories.is.null,categories.neq.Módulos');

    if (accessoriesError) {
      console.error('Error fetching vehicle accessories:', accessoriesError);
      throw accessoriesError;
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
      vehicles: Set<string>;
      last_pending_date?: string;
    }>();

    // Process kit items
    kitItems?.forEach(item => {
      const normalizedName = normalizeItemName(item.item_name);
      
      // Check if item is not homologated
      if (!homologatedSet.has(normalizedName)) {
        const itemKey = `${item.item_name}|${item.item_type}`;
        const normalizedItemKey = `${normalizedName}|${item.item_type}`;
        const existingItem = pendingItemsMap.get(itemKey);
        
        const lastPendingDate = lastPendingDateMap.get(normalizedItemKey);
        
        if (existingItem) {
          existingItem.totalQuantity += item.quantity;
          existingItem.kits.add(item.kit_id);
          if (lastPendingDate && (!existingItem.last_pending_date || lastPendingDate > existingItem.last_pending_date)) {
            existingItem.last_pending_date = lastPendingDate;
          }
        } else {
          pendingItemsMap.set(itemKey, {
            item_name: item.item_name,
            item_type: item.item_type as ItemType,
            totalQuantity: item.quantity,
            kits: new Set([item.kit_id]),
            vehicles: new Set(),
            last_pending_date: lastPendingDate
          });
        }
      }
    });

    // Process vehicle accessories - check if they are homologated (skip Módulos)
    vehicleAccessories?.forEach(accessory => {
      // Skip items with "Módulos" category
      if (accessory.categories === 'Módulos') return;
      
      const normalizedName = normalizeItemName(accessory.name);
      const isHomologated = homologatedItems?.some(hi => {
        const hiNormalized = normalizeItemName(hi.item_name);
        // Exact match
        if (hiNormalized === normalizedName) return true;
        // Substring match
        if (hiNormalized.includes(normalizedName) || normalizedName.includes(hiNormalized)) return true;
        // Synonym matching
        const synonyms: Record<string, string[]> = {
          'SIRENE': ['SIRENE', 'SIREN'],
          'BLOQUEIO': ['BLOQUEIO', 'RELE', 'RELÉ', 'RELAY'],
          'IBUTTON': ['IBUTTON', 'ID IBUTTON', 'IDENTIFICADOR IBUTTON'],
          'RFID': ['RFID', 'LEITOR RFID', 'ID CONDUTOR RFID', 'ID RFID', 'IDENTIFICADOR RFID'],
          'BLUETOOTH': ['BLUETOOTH', 'ID BLUETOOTH', 'IDENTIFICADOR BLUETOOTH'],
          'CAMERA': ['CAMERA', 'CÂMERA', 'CAMERA EXTRA'],
        };
        for (const [, variations] of Object.entries(synonyms)) {
          const accessoryMatches = variations.some(v => normalizedName.includes(v));
          const homologatedMatches = variations.some(v => hiNormalized.includes(v));
          if (accessoryMatches && homologatedMatches) return true;
        }
        return false;
      });
      
      if (!isHomologated) {
        const itemKey = `${accessory.name}|accessory`;
        const normalizedItemKey = `${normalizedName}|accessory`;
        const existingItem = pendingItemsMap.get(itemKey);
        
        const lastPendingDate = lastPendingDateMap.get(normalizedItemKey);
        
        if (existingItem) {
          existingItem.totalQuantity += accessory.quantity;
          if (accessory.vehicle_id) {
            existingItem.vehicles.add(accessory.vehicle_id);
          }
          if (lastPendingDate && (!existingItem.last_pending_date || lastPendingDate > existingItem.last_pending_date)) {
            existingItem.last_pending_date = lastPendingDate;
          }
        } else {
          pendingItemsMap.set(itemKey, {
            item_name: accessory.name,
            item_type: 'accessory' as ItemType,
            totalQuantity: accessory.quantity,
            kits: new Set(),
            vehicles: accessory.vehicle_id ? new Set([accessory.vehicle_id]) : new Set(),
            last_pending_date: lastPendingDate
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

    // Add items from kits and vehicles
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
        last_pending_date: pendingItem.last_pending_date,
        kits: kitsForItem,
        customers: [],
        vehicles_count: pendingItem.vehicles.size
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