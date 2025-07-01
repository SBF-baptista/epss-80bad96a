
import { supabase } from "@/integrations/supabase/client";

export interface HomologationCard {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  status: 'homologar' | 'em_homologacao' | 'em_testes_finais' | 'homologado';
  requested_by: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  incoming_vehicle_id: string | null;
  created_order_id: string | null;
}

export interface HomologationPhoto {
  id: string;
  homologation_card_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface WorkflowChainItem {
  incoming_vehicle_id: string | null;
  vehicle: string | null;
  brand: string | null;
  year: number | null;
  quantity: number | null;
  usage_type: string | null;
  received_at: string | null;
  incoming_processed: boolean | null;
  homologation_id: string | null;
  homologation_status: string | null;
  homologation_created_at: string | null;
  homologation_updated_at: string | null;
  order_id: string | null;
  order_number: string | null;
  order_status: string | null;
  order_created_at: string | null;
  processing_notes: string | null;
}

export const fetchHomologationCards = async (): Promise<HomologationCard[]> => {
  const { data, error } = await supabase
    .from('homologation_cards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching homologation cards:', error);
    throw error;
  }

  return data || [];
};

export const fetchWorkflowChain = async (): Promise<WorkflowChainItem[]> => {
  const { data, error } = await supabase
    .from('workflow_chain')
    .select('*')
    .order('received_at', { ascending: false });

  if (error) {
    console.error('Error fetching workflow chain:', error);
    throw error;
  }

  return data || [];
};

export const updateHomologationStatus = async (
  cardId: string, 
  status: HomologationCard['status']
): Promise<void> => {
  const { error } = await supabase
    .from('homologation_cards')
    .update({ status })
    .eq('id', cardId);

  if (error) {
    console.error('Error updating homologation status:', error);
    throw error;
  }
};

export const createHomologationCard = async (
  brand: string,
  model: string,
  year?: number,
  notes?: string
): Promise<HomologationCard> => {
  const { data, error } = await supabase
    .from('homologation_cards')
    .insert({
      brand,
      model,
      year,
      status: 'homologar',
      notes
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating homologation card:', error);
    throw error;
  }

  return data;
};

export const updateHomologationNotes = async (
  cardId: string,
  notes: string
): Promise<void> => {
  const { error } = await supabase
    .from('homologation_cards')
    .update({ notes })
    .eq('id', cardId);

  if (error) {
    console.error('Error updating homologation notes:', error);
    throw error;
  }
};

export const fetchHomologationPhotos = async (cardId: string): Promise<HomologationPhoto[]> => {
  const { data, error } = await supabase
    .from('homologation_photos')
    .select('*')
    .eq('homologation_card_id', cardId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching homologation photos:', error);
    throw error;
  }

  return data || [];
};

export const uploadHomologationPhoto = async (
  cardId: string,
  file: File
): Promise<{ photo: HomologationPhoto; url: string }> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${cardId}/${Date.now()}.${fileExt}`;
  
  // Upload to storage
  const { data: storageData, error: storageError } = await supabase.storage
    .from('homologation-photos')
    .upload(fileName, file);

  if (storageError) {
    console.error('Error uploading file:', storageError);
    throw storageError;
  }

  // Save photo record to database
  const { data: photoData, error: photoError } = await supabase
    .from('homologation_photos')
    .insert({
      homologation_card_id: cardId,
      file_name: file.name,
      file_path: storageData.path,
      file_size: file.size,
      content_type: file.type,
    })
    .select()
    .single();

  if (photoError) {
    console.error('Error saving photo record:', photoError);
    throw photoError;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('homologation-photos')
    .getPublicUrl(storageData.path);

  return {
    photo: photoData,
    url: urlData.publicUrl
  };
};

export const deleteHomologationPhoto = async (photoId: string, filePath: string): Promise<void> => {
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('homologation-photos')
    .remove([filePath]);

  if (storageError) {
    console.error('Error deleting file from storage:', storageError);
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('homologation_photos')
    .delete()
    .eq('id', photoId);

  if (dbError) {
    console.error('Error deleting photo record:', dbError);
    throw dbError;
  }
};

export const getPhotoUrl = (filePath: string): string => {
  const { data } = supabase.storage
    .from('homologation-photos')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
};
