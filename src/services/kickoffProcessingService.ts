import { supabase } from "@/integrations/supabase/client";

export interface ProcessKickoffResult {
  success: boolean;
  processed_count: number;
  homologations_created: number;
  already_homologated_count: number;
  errors: string[];
}

/**
 * Process all vehicles for a client when kickoff is completed
 * - Check if vehicle already has homologation (brand, model, year)
 * - If yes: mark as homologated and send to planning
 * - If no: create homologation card with status "homologar"
 */
export const processKickoffVehicles = async (saleSummaryId: number): Promise<ProcessKickoffResult> => {
  const result: ProcessKickoffResult = {
    success: true,
    processed_count: 0,
    homologations_created: 0,
    already_homologated_count: 0,
    errors: []
  };

  try {
    // Get all vehicles for this sale_summary_id that haven't been processed
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('incoming_vehicles')
      .select('*')
      .eq('sale_summary_id', saleSummaryId)
      .eq('kickoff_completed', false);

    if (vehiclesError) {
      console.error('Error fetching vehicles for kickoff:', vehiclesError);
      result.errors.push(`Failed to fetch vehicles: ${vehiclesError.message}`);
      result.success = false;
      return result;
    }

    if (!vehicles || vehicles.length === 0) {
      console.log('No vehicles to process for kickoff');
      return result;
    }

    console.log(`Processing ${vehicles.length} vehicles for kickoff completion`);

    // Process each vehicle - create individual homologation cards
    for (const vehicle of vehicles) {
      try {
        console.log(`Processing vehicle ${vehicle.id}: ${vehicle.brand} ${vehicle.vehicle} (${vehicle.year})`);
        
        // Check if there's already a homologated card for this vehicle type (not this specific vehicle)
        const { data: existingHomologation, error: homologationError } = await supabase
          .from('homologation_cards')
          .select('id, status, configuration')
          .eq('brand', vehicle.brand)
          .eq('model', vehicle.vehicle)
          .eq('year', vehicle.year || 0)
          .eq('status', 'homologado')
          .maybeSingle();

        if (homologationError) {
          console.error('Error checking existing homologation:', homologationError);
          result.errors.push(`Vehicle ${vehicle.brand} ${vehicle.vehicle}: ${homologationError.message}`);
          continue;
        }

        // Create homologation card for THIS vehicle (regardless of whether similar ones exist)
        const homologationStatus = existingHomologation ? 'homologado' : 'homologar';
        const homologationNotes = existingHomologation 
          ? `Criado do kickoff para ${vehicle.company_name}. Homologação automática baseada em veículo similar (${existingHomologation.id}).`
          : `Criado do kickoff para ${vehicle.company_name}. Aguardando homologação.`;
        
        console.log(`Creating ${homologationStatus} card for ${vehicle.brand} ${vehicle.vehicle}`);
        
        const { data: newHomologation, error: createError } = await supabase
          .from('homologation_cards')
          .insert({
            brand: vehicle.brand,
            model: vehicle.vehicle,
            year: vehicle.year || null,
            status: homologationStatus,
            incoming_vehicle_id: vehicle.id,
            configuration: existingHomologation?.configuration || null,
            notes: homologationNotes
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating homologation card:', createError);
          result.errors.push(`Vehicle ${vehicle.brand} ${vehicle.vehicle}: ${createError.message}`);
          continue;
        }

        // Update incoming_vehicle
        const { error: updateError } = await supabase
          .from('incoming_vehicles')
          .update({
            kickoff_completed: true,
            created_homologation_id: newHomologation.id,
            homologation_status: homologationStatus,
            processing_notes: `Kickoff completed. Homologation card: ${newHomologation.id}`
          })
          .eq('id', vehicle.id);

        if (updateError) {
          console.error('Error updating vehicle:', updateError);
          result.errors.push(`Vehicle ${vehicle.brand} ${vehicle.vehicle}: ${updateError.message}`);
        } else {
          if (existingHomologation) {
            result.already_homologated_count++;
          } else {
            result.homologations_created++;
          }
          result.processed_count++;
        }
      } catch (error) {
        console.error(`Error processing vehicle ${vehicle.id}:`, error);
        result.errors.push(`Vehicle ${vehicle.brand} ${vehicle.vehicle}: ${(error as Error).message}`);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    console.error('Unexpected error in processKickoffVehicles:', error);
    result.errors.push(`Unexpected error: ${(error as Error).message}`);
    result.success = false;
    return result;
  }
};
