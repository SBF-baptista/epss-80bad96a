import { supabase } from '@/integrations/supabase/client';
import { HomologationKit, CreateKitRequest, UpdateKitRequest, HomologationKitItem, ItemType } from '@/types/homologationKit';

// Fetch all homologation kits for a specific card
export async function fetchHomologationKits(cardId: string): Promise<HomologationKit[]> {
  try {
    const { data: kits, error: kitsError } = await supabase
      .from('homologation_kits')
      .select('*')
      .eq('homologation_card_id', cardId)
      .order('created_at', { ascending: false });

    if (kitsError) {
      console.error('Error fetching homologation kits:', kitsError);
      throw kitsError;
    }

    // Fetch items for all kits
    const kitIds = kits?.map(kit => kit.id) || [];
    
    if (kitIds.length === 0) {
      return [];
    }

    const { data: items, error: itemsError } = await supabase
      .from('homologation_kit_accessories')
      .select('*')
      .in('kit_id', kitIds)
      .order('created_at', { ascending: true });

    if (itemsError) {
      console.error('Error fetching kit items:', itemsError);
      throw itemsError;
    }

    // Group items by kit and type
    const kitsWithItems: HomologationKit[] = kits?.map(kit => {
      const kitItems = items?.filter(item => item.kit_id === kit.id) || [];
      
      return {
        ...kit,
        equipment: kitItems.filter(item => item.item_type === 'equipment').map(item => ({
          id: item.id,
          item_name: item.item_name,
          item_type: item.item_type as ItemType,
          quantity: item.quantity,
          description: item.description || undefined,
          notes: item.notes || undefined,
        })),
        accessories: kitItems.filter(item => item.item_type === 'accessory').map(item => ({
          id: item.id,
          item_name: item.item_name,
          item_type: item.item_type as ItemType,
          quantity: item.quantity,
          description: item.description || undefined,
          notes: item.notes || undefined,
        })),
        supplies: kitItems.filter(item => item.item_type === 'supply').map(item => ({
          id: item.id,
          item_name: item.item_name,
          item_type: item.item_type as ItemType,
          quantity: item.quantity,
          description: item.description || undefined,
          notes: item.notes || undefined,
        })),
      };
    }) || [];

    return kitsWithItems;
  } catch (error) {
    console.error('Error in fetchHomologationKits:', error);
    throw error;
  }
}

// Create a new homologation kit with its items
export async function createHomologationKit(kitData: CreateKitRequest): Promise<HomologationKit> {
  try {
    // Create the kit first
    const { data: kit, error: kitError } = await supabase
      .from('homologation_kits')
      .insert({
        homologation_card_id: kitData.homologation_card_id,
        name: kitData.name,
        description: kitData.description,
      })
      .select()
      .single();

    if (kitError) {
      console.error('Error creating kit:', kitError);
      throw kitError;
    }

    // Create all items (equipment, accessories, supplies)
    const allItems = [
      ...kitData.equipment.map(item => ({
        kit_id: kit.id,
        item_name: item.item_name,
        item_type: 'equipment' as ItemType,
        quantity: item.quantity,
        description: item.description,
        notes: item.notes,
      })),
      ...kitData.accessories.map(item => ({
        kit_id: kit.id,
        item_name: item.item_name,
        item_type: 'accessory' as ItemType,
        quantity: item.quantity,
        description: item.description,
        notes: item.notes,
      })),
      ...kitData.supplies.map(item => ({
        kit_id: kit.id,
        item_name: item.item_name,
        item_type: 'supply' as ItemType,
        quantity: item.quantity,
        description: item.description,
        notes: item.notes,
      })),
    ];

    if (allItems.length > 0) {
      const { error: itemsError } = await supabase
        .from('homologation_kit_accessories')
        .insert(allItems);

      if (itemsError) {
        console.error('Error creating kit items:', itemsError);
        throw itemsError;
      }
    }

    // Return the complete kit with items
    return {
      ...kit,
      equipment: kitData.equipment,
      accessories: kitData.accessories,
      supplies: kitData.supplies,
    };
  } catch (error) {
    console.error('Error in createHomologationKit:', error);
    throw error;
  }
}

// Update a homologation kit
export async function updateHomologationKit(kitId: string, updateData: UpdateKitRequest): Promise<HomologationKit> {
  try {
    // Update kit basic info
    const { data: kit, error: kitError } = await supabase
      .from('homologation_kits')
      .update({
        name: updateData.name,
        description: updateData.description,
      })
      .eq('id', kitId)
      .select()
      .single();

    if (kitError) {
      console.error('Error updating kit:', kitError);
      throw kitError;
    }

    // Delete existing items and create new ones
    const { error: deleteError } = await supabase
      .from('homologation_kit_accessories')
      .delete()
      .eq('kit_id', kitId);

    if (deleteError) {
      console.error('Error deleting old kit items:', deleteError);
      throw deleteError;
    }

    // Create new items if provided
    const allItems = [
      ...(updateData.equipment || []).map(item => ({
        kit_id: kitId,
        item_name: item.item_name,
        item_type: 'equipment' as ItemType,
        quantity: item.quantity,
        description: item.description,
        notes: item.notes,
      })),
      ...(updateData.accessories || []).map(item => ({
        kit_id: kitId,
        item_name: item.item_name,
        item_type: 'accessory' as ItemType,
        quantity: item.quantity,
        description: item.description,
        notes: item.notes,
      })),
      ...(updateData.supplies || []).map(item => ({
        kit_id: kitId,
        item_name: item.item_name,
        item_type: 'supply' as ItemType,
        quantity: item.quantity,
        description: item.description,
        notes: item.notes,
      })),
    ];

    if (allItems.length > 0) {
      const { error: itemsError } = await supabase
        .from('homologation_kit_accessories')
        .insert(allItems);

      if (itemsError) {
        console.error('Error creating updated kit items:', itemsError);
        throw itemsError;
      }
    }

    // Return the updated kit
    return {
      ...kit,
      equipment: updateData.equipment || [],
      accessories: updateData.accessories || [],
      supplies: updateData.supplies || [],
    };
  } catch (error) {
    console.error('Error in updateHomologationKit:', error);
    throw error;
  }
}

// Delete a homologation kit
export async function deleteHomologationKit(kitId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('homologation_kits')
      .delete()
      .eq('id', kitId);

    if (error) {
      console.error('Error deleting kit:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteHomologationKit:', error);
    throw error;
  }
}