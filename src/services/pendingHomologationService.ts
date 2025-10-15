import { supabase } from '@/integrations/supabase/client';
import { ItemType } from '@/types/homologationKit';

export interface PendingItem {
  item_name: string;
  item_type: ItemType;
  quantity: number;
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
        quantity
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
    }>();

    kitItems?.forEach(item => {
      const itemKey = `${item.item_name}|${item.item_type}`;
      
      // Check if item is not homologated
      if (!homologatedMap.has(itemKey)) {
        const existingItem = pendingItemsMap.get(itemKey);
        
        if (existingItem) {
          existingItem.totalQuantity += item.quantity;
          existingItem.kits.add(item.kit_id);
        } else {
          pendingItemsMap.set(itemKey, {
            item_name: item.item_name,
            item_type: item.item_type as ItemType,
            totalQuantity: item.quantity,
            kits: new Set([item.kit_id])
          });
        }
      }
    });

    // Fetch accessories from the accessories table (from incoming_vehicles)
    const { data: vehicleAccessories, error: accessoriesError } = await supabase
      .from('accessories')
      .select('vehicle_id, name, quantity, incoming_vehicle_group_id, categories')
      .not('vehicle_id', 'is', null);

    if (accessoriesError) {
      console.error('Error fetching vehicle accessories:', accessoriesError);
      throw accessoriesError;
    }

    // Process vehicle accessories
    // IMPORTANTE: Filtrar módulos (categories='modulos') - eles não precisam de homologação
    vehicleAccessories?.forEach(accessory => {
      // Ignorar módulos - eles não passam por homologação
      const categories = (accessory.categories || '').toLowerCase();
      if (categories === 'modulos') {
        return;
      }
      
      const itemKey = `${accessory.name}|accessory`;
      
      if (!homologatedMap.has(itemKey)) {
        const existing = pendingItemsMap.get(itemKey);
        
        if (existing) {
          existing.totalQuantity += accessory.quantity;
          existing.kits.add(accessory.vehicle_id); // Use vehicle_id as reference
        } else {
          pendingItemsMap.set(itemKey, {
            item_name: accessory.name,
            item_type: 'accessory' as ItemType,
            totalQuantity: accessory.quantity,
            kits: new Set([accessory.vehicle_id])
          });
        }
      }
    });

    // Also fetch accessories and modules from customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name, accessories, modules, vehicles');

    if (customersError) {
      console.error('Error fetching customers:', customersError);
      throw customersError;
    }

    // Process customer accessories and modules
    const customerItemsMap = new Map<string, {
      item_name: string;
      item_type: ItemType;
      customers: Set<string>;
      vehiclesCount: number;
    }>();

    customers?.forEach(customer => {
      // Parse vehicles to count
      let vehiclesCount = 0;
      try {
        const vehiclesData = typeof customer.vehicles === 'string' 
          ? JSON.parse(customer.vehicles) 
          : customer.vehicles;
        vehiclesCount = Array.isArray(vehiclesData) ? vehiclesData.length : 0;
      } catch (e) {
        console.warn('Failed to parse vehicles for customer:', customer.id);
      }

      // Process accessories
      const accessories = Array.isArray(customer.accessories) ? customer.accessories : [];
      accessories.forEach(acc => {
        const itemKey = `${acc}|accessory`;
        if (!homologatedMap.has(itemKey)) {
          const existing = customerItemsMap.get(itemKey);
          if (existing) {
            existing.customers.add(customer.id);
            existing.vehiclesCount += vehiclesCount;
          } else {
            customerItemsMap.set(itemKey, {
              item_name: acc,
              item_type: 'accessory',
              customers: new Set([customer.id]),
              vehiclesCount
            });
          }
        }
      });

      // Process modules (equipment)
      const modules = Array.isArray(customer.modules) ? customer.modules : [];
      modules.forEach(mod => {
        const itemKey = `${mod}|equipment`;
        if (!homologatedMap.has(itemKey)) {
          const existing = customerItemsMap.get(itemKey);
          if (existing) {
            existing.customers.add(customer.id);
            existing.vehiclesCount += vehiclesCount;
          } else {
            customerItemsMap.set(itemKey, {
              item_name: mod,
              item_type: 'equipment',
              customers: new Set([customer.id]),
              vehiclesCount
            });
          }
        }
      });
    });

    // Create a customers map for lookup
    const customersMap = new Map(
      customers?.map(c => [c.id, c]) || []
    );

    // Convert to response format
    const result: PendingItemsResponse = {
      accessories: [],
      supplies: [],
      equipment: []
    };

    // First, add items from kits
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

    // Then, merge items from customers
    customerItemsMap.forEach((customerItem) => {
      const itemKey = `${customerItem.item_name}|${customerItem.item_type}`;
      
      // Check if this item is already in result from kits
      let existingItem: PendingItem | undefined;
      switch (customerItem.item_type) {
        case 'accessory':
          existingItem = result.accessories.find(i => i.item_name === customerItem.item_name);
          break;
        case 'equipment':
          existingItem = result.equipment.find(i => i.item_name === customerItem.item_name);
          break;
      }

      const customersForItem = Array.from(customerItem.customers)
        .map(customerId => customersMap.get(customerId))
        .filter(Boolean)
        .map(customer => {
          let vehiclesCount = 0;
          try {
            const vehiclesData = typeof customer!.vehicles === 'string' 
              ? JSON.parse(customer!.vehicles) 
              : customer!.vehicles;
            vehiclesCount = Array.isArray(vehiclesData) ? vehiclesData.length : 0;
          } catch (e) {
            vehiclesCount = 0;
          }
          return {
            id: customer!.id!,
            name: customer!.name,
            vehicles_count: vehiclesCount
          };
        });

      if (existingItem) {
        // Merge customers info into existing item
        existingItem.customers = customersForItem;
        existingItem.quantity += customerItem.vehiclesCount;
      } else {
        // Create new item entry
        const newItem: PendingItem = {
          item_name: customerItem.item_name,
          item_type: customerItem.item_type,
          quantity: customerItem.vehiclesCount,
          kits: [],
          customers: customersForItem
        };

        switch (customerItem.item_type) {
          case 'accessory':
            result.accessories.push(newItem);
            break;
          case 'equipment':
            result.equipment.push(newItem);
            break;
        }
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