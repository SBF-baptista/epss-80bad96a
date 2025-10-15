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
      .eq('sale_summary_id', saleSummaryId);

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

    console.log(`Found ${vehicles.length} vehicles to process`);
    
    // Process each vehicle - ensure individual cards per unit (quantity)
    for (const vehicle of vehicles) {
      try {
        const idx = vehicles.indexOf(vehicle) + 1;
        console.log(`[${idx}/${vehicles.length}] Processing vehicle ${vehicle.id}: ${vehicle.brand} ${vehicle.vehicle} (${vehicle.year})`);

        // 1) Load currently linked cards for this incoming_vehicle
        const { data: linkedCards, error: linkedErr } = await supabase
          .from('homologation_cards')
          .select('id, status, configuration, incoming_vehicle_id')
          .eq('incoming_vehicle_id', vehicle.id);

        if (linkedErr) {
          console.error(`Error fetching linked cards for vehicle ${vehicle.id}:`, linkedErr);
          result.errors.push(`Vehicle ${vehicle.brand} ${vehicle.vehicle}: Failed to fetch linked cards - ${linkedErr.message}`);
        }

        let existingCards = linkedCards || [];

        // 2) If there is a pre-linked card by created_homologation_id but not associated via incoming_vehicle_id, link it
        if (vehicle.created_homologation_id && !existingCards.some(c => c.id === vehicle.created_homologation_id)) {
          const { data: createdCard, error: createdCardErr } = await supabase
            .from('homologation_cards')
            .select('id, status, configuration, incoming_vehicle_id')
            .eq('id', vehicle.created_homologation_id)
            .maybeSingle();

          if (createdCardErr) {
            console.warn(`Could not fetch created_homologation_id ${vehicle.created_homologation_id}:`, createdCardErr);
          } else if (createdCard) {
            if (!createdCard.incoming_vehicle_id) {
              const { error: linkErr } = await supabase
                .from('homologation_cards')
                .update({ incoming_vehicle_id: vehicle.id })
                .eq('id', createdCard.id);
              if (linkErr) {
                console.warn(`Failed to link existing card ${createdCard.id} to vehicle ${vehicle.id}:`, linkErr);
              } else {
                createdCard.incoming_vehicle_id = vehicle.id;
              }
            }
            existingCards.push(createdCard);
          }
        }

        // 3) Try to find a homologated card for similar vehicle to auto-homologate
        const { data: existingHomologation, error: homologationError } = await supabase
          .from('homologation_cards')
          .select('id, status, configuration')
          .eq('brand', vehicle.brand)
          .eq('model', vehicle.vehicle)
          .eq('year', vehicle.year || 0)
          .eq('status', 'homologado')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (homologationError) {
          console.warn('Error checking existing homologation, defaulting to manual homologation:', homologationError);
        }

        // 4) Ensure there is one card per unit (quantity)
        const qty = Math.max(vehicle.quantity || 1, 1);
        const existingCount = existingCards.length;
        const missingCount = Math.max(qty - existingCount, 0);

        console.log(`Vehicle ${vehicle.id} has quantity=${qty}. Existing cards=${existingCount}. Missing to create=${missingCount}`);

        let firstCardId: string | null = existingCards[0]?.id || vehicle.created_homologation_id || null;
        const baseNotesAuto = `Criado do kickoff para ${vehicle.company_name}. Homologação automática baseada em veículo similar (${existingHomologation?.id}).`;
        const baseNotesManual = `Criado do kickoff para ${vehicle.company_name}. Aguardando homologação.`;

        for (let i = 0; i < missingCount; i++) {
          const status = existingHomologation ? 'homologado' : 'homologar';
          const notes = existingHomologation ? baseNotesAuto : baseNotesManual;

          console.log(`Creating ${status} card (${i + 1}/${missingCount}) for vehicle ${vehicle.id}`);
          const { data: newCard, error: createErr } = await supabase
            .from('homologation_cards')
            .insert({
              brand: vehicle.brand,
              model: vehicle.vehicle,
              year: vehicle.year || null,
              status,
              incoming_vehicle_id: vehicle.id,
              configuration: existingHomologation?.configuration || null,
              notes,
            })
            .select()
            .single();

          if (createErr) {
            console.error(`Error creating homologation card for vehicle ${vehicle.id}:`, createErr);
            result.errors.push(`Vehicle ${vehicle.brand} ${vehicle.vehicle}: ${createErr.message}`);
            continue; // try to create remaining ones
          }

          console.log(`Successfully created homologation card ${newCard.id} for vehicle ${vehicle.id}`);
          if (!firstCardId) firstCardId = newCard.id;
          existingCards.push({ id: newCard.id, status: newCard.status, configuration: newCard.configuration, incoming_vehicle_id: vehicle.id } as any);

          if (!existingHomologation) {
            result.homologations_created++;
          }
        }

        // 5) Determine overall status for the incoming vehicle based on its cards
        const linkedStatus = existingCards.some(c => c.status === 'homologado')
          ? 'homologado'
          : (existingCards[0]?.status || 'homologar');

        // 6) Mark incoming vehicle as kickoff completed and store linkage
        const { error: updateErr } = await supabase
          .from('incoming_vehicles')
          .update({
            kickoff_completed: true,
            created_homologation_id: firstCardId,
            homologation_status: linkedStatus,
            processing_notes: `Kickoff completed. ${missingCount > 0 ? `Created ${missingCount} card(s).` : 'Cards already existed.'}`,
          })
          .eq('id', vehicle.id);

        if (updateErr) {
          console.error(`Error updating vehicle ${vehicle.id}:`, updateErr);
          result.errors.push(`Vehicle ${vehicle.brand} ${vehicle.vehicle}: Failed to mark as completed - ${updateErr.message}`);
        } else {
          console.log(`Successfully marked vehicle ${vehicle.id} as kickoff_completed with status ${linkedStatus}`);
        }

        if (linkedStatus === 'homologado' || existingHomologation) {
          result.already_homologated_count++;
        }
        result.processed_count++;

      } catch (error) {
        console.error(`Unexpected error processing vehicle ${vehicle.id}:`, error);
        result.errors.push(`Vehicle ${vehicle.brand} ${vehicle.vehicle}: ${(error as Error).message}`);
        // Continue to next vehicle even if this one failed
      }
    }

    console.log(`Kickoff processing complete: ${result.processed_count} processed, ${result.homologations_created} created, ${result.already_homologated_count} auto-homologated, ${result.errors.length} errors`);

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    console.error('Unexpected error in processKickoffVehicles:', error);
    result.errors.push(`Unexpected error: ${(error as Error).message}`);
    result.success = false;
    return result;
  }
};
