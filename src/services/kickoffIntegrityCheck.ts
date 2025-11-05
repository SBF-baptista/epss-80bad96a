import { supabase } from "@/integrations/supabase/client";

export interface OrphanKickoff {
  sale_summary_id: number;
  company_name: string;
  approved_at: string;
  total_vehicles: number;
  vehicles_without_cards: number;
}

/**
 * Verifica a integridade dos kickoffs aprovados
 * Identifica kickoffs onde veículos foram marcados como kickoff_completed
 * mas não têm cards de homologação criados
 */
export const checkKickoffIntegrity = async (): Promise<{
  success: boolean;
  orphans: OrphanKickoff[];
  error?: string;
}> => {
  try {
    // 1. Buscar todos os kickoffs aprovados
    const { data: kickoffHistory, error: historyError } = await supabase
      .from('kickoff_history')
      .select('sale_summary_id, company_name, approved_at, total_vehicles, vehicles_data')
      .order('approved_at', { ascending: false });

    if (historyError) {
      console.error('Error fetching kickoff history:', historyError);
      return { success: false, orphans: [], error: historyError.message };
    }

    if (!kickoffHistory || kickoffHistory.length === 0) {
      return { success: true, orphans: [] };
    }

    const orphans: OrphanKickoff[] = [];

    // 2. Para cada kickoff, verificar se todos os veículos têm cards
    for (const kickoff of kickoffHistory) {
      // Buscar veículos deste kickoff
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('incoming_vehicles')
        .select('id, brand, vehicle, year, quantity, created_homologation_id, kickoff_completed')
        .eq('sale_summary_id', kickoff.sale_summary_id);

      if (vehiclesError) {
        console.error(`Error fetching vehicles for kickoff ${kickoff.sale_summary_id}:`, vehiclesError);
        continue;
      }

      if (!vehicles || vehicles.length === 0) continue;

      let vehiclesWithoutCards = 0;

      // Verificar cada veículo
      for (const vehicle of vehicles) {
        // Apenas verificar veículos marcados como kickoff_completed
        if (!vehicle.kickoff_completed) continue;

        // Contar cards existentes para este veículo
        const { data: cards, error: cardsError } = await supabase
          .from('homologation_cards')
          .select('id')
          .eq('incoming_vehicle_id', vehicle.id);

        if (cardsError) {
          console.error(`Error fetching cards for vehicle ${vehicle.id}:`, cardsError);
          continue;
        }

        const expectedCards = vehicle.quantity || 1;
        const actualCards = cards?.length || 0;

        // Se faltam cards, contar como órfão
        if (actualCards < expectedCards) {
          vehiclesWithoutCards++;
        }
      }

      // Se encontrou veículos sem cards, adicionar aos órfãos
      if (vehiclesWithoutCards > 0) {
        orphans.push({
          sale_summary_id: kickoff.sale_summary_id,
          company_name: kickoff.company_name,
          approved_at: kickoff.approved_at,
          total_vehicles: kickoff.total_vehicles,
          vehicles_without_cards: vehiclesWithoutCards,
        });
      }
    }

    return { success: true, orphans };
  } catch (error) {
    console.error('Unexpected error in checkKickoffIntegrity:', error);
    return {
      success: false,
      orphans: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
