
import { supabase } from "@/integrations/supabase/client";

export interface HomologationCard {
  id: string;
  brand: string;
  model: string;
  status: 'homologar' | 'em_homologacao' | 'em_testes_finais' | 'homologado';
  requested_by: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
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
  notes?: string
): Promise<HomologationCard> => {
  const { data, error } = await supabase
    .from('homologation_cards')
    .insert({
      brand,
      model,
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
