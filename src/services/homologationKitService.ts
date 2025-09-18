import { supabase } from "@/integrations/supabase/client";
import type { HomologationKit, CreateKitRequest, UpdateKitRequest, HomologationKitAccessory } from "@/types/homologationKit";

export async function fetchHomologationKits(cardId: string): Promise<HomologationKit[]> {
  const { data: kits, error: kitsError } = await supabase
    .from('homologation_kits')
    .select('*')
    .eq('homologation_card_id', cardId)
    .order('created_at', { ascending: true });

  if (kitsError) {
    console.error('Error fetching kits:', kitsError);
    throw kitsError;
  }

  // Fetch accessories for each kit
  const kitsWithAccessories = await Promise.all(
    (kits || []).map(async (kit) => {
      const { data: accessories, error: accessoriesError } = await supabase
        .from('homologation_kit_accessories')
        .select('*')
        .eq('kit_id', kit.id)
        .order('created_at', { ascending: true });

      if (accessoriesError) {
        console.error('Error fetching accessories:', accessoriesError);
        throw accessoriesError;
      }

      return {
        ...kit,
        accessories: accessories || []
      };
    })
  );

  return kitsWithAccessories;
}

export async function createHomologationKit(kitData: CreateKitRequest): Promise<HomologationKit> {
  // Create the kit first
  const { data: kit, error: kitError } = await supabase
    .from('homologation_kits')
    .insert({
      homologation_card_id: kitData.homologation_card_id,
      name: kitData.name,
      description: kitData.description
    })
    .select()
    .single();

  if (kitError) {
    console.error('Error creating kit:', kitError);
    throw kitError;
  }

  // Create accessories
  if (kitData.accessories.length > 0) {
    const accessoriesData = kitData.accessories.map(accessory => ({
      kit_id: kit.id,
      accessory_name: accessory.accessory_name,
      quantity: accessory.quantity,
      notes: accessory.notes
    }));

    const { data: accessories, error: accessoriesError } = await supabase
      .from('homologation_kit_accessories')
      .insert(accessoriesData)
      .select();

    if (accessoriesError) {
      console.error('Error creating accessories:', accessoriesError);
      throw accessoriesError;
    }

    return {
      ...kit,
      accessories: accessories || []
    };
  }

  return {
    ...kit,
    accessories: []
  };
}

export async function updateHomologationKit(kitId: string, updateData: UpdateKitRequest): Promise<HomologationKit> {
  // Update kit basic info if provided
  if (updateData.name || updateData.description !== undefined) {
    const { error: kitError } = await supabase
      .from('homologation_kits')
      .update({
        name: updateData.name,
        description: updateData.description
      })
      .eq('id', kitId);

    if (kitError) {
      console.error('Error updating kit:', kitError);
      throw kitError;
    }
  }

  // Update accessories if provided
  if (updateData.accessories) {
    // Delete existing accessories
    const { error: deleteError } = await supabase
      .from('homologation_kit_accessories')
      .delete()
      .eq('kit_id', kitId);

    if (deleteError) {
      console.error('Error deleting old accessories:', deleteError);
      throw deleteError;
    }

    // Insert new accessories
    if (updateData.accessories.length > 0) {
      const accessoriesData = updateData.accessories.map(accessory => ({
        kit_id: kitId,
        accessory_name: accessory.accessory_name,
        quantity: accessory.quantity,
        notes: accessory.notes
      }));

      const { error: insertError } = await supabase
        .from('homologation_kit_accessories')
        .insert(accessoriesData);

      if (insertError) {
        console.error('Error inserting new accessories:', insertError);
        throw insertError;
      }
    }
  }

  // Fetch and return updated kit
  const { data: kit, error: fetchError } = await supabase
    .from('homologation_kits')
    .select('*')
    .eq('id', kitId)
    .single();

  if (fetchError) {
    console.error('Error fetching updated kit:', fetchError);
    throw fetchError;
  }

  const { data: accessories, error: accessoriesError } = await supabase
    .from('homologation_kit_accessories')
    .select('*')
    .eq('kit_id', kitId)
    .order('created_at', { ascending: true });

  if (accessoriesError) {
    console.error('Error fetching updated accessories:', accessoriesError);
    throw accessoriesError;
  }

  return {
    ...kit,
    accessories: accessories || []
  };
}

export async function deleteHomologationKit(kitId: string): Promise<void> {
  const { error } = await supabase
    .from('homologation_kits')
    .delete()
    .eq('id', kitId);

  if (error) {
    console.error('Error deleting kit:', error);
    throw error;
  }
}