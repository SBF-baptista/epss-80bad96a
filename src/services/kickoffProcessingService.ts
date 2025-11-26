import { supabase } from "@/integrations/supabase/client";
import { logAction } from "./logService";

export interface ProcessKickoffResult {
  success: boolean;
  processed_count: number;
  homologations_created: number;
  already_homologated_count: number;
  errors: string[];
  failed_vehicles: Array<{ id: string; brand: string; model: string; error: string }>;
}

/**
 * Process all vehicles for a client when kickoff is completed
 * - Check if vehicle already has homologation (brand, model, year)
 * - If yes: mark as homologated and send to planning
 * - If no: create homologation card with status "homologar"
 * @param saleSummaryId - ID do resumo de venda
 * @param validatedVehicleIds - IDs dos veículos que foram validados (opcional - se não fornecido, processa todos)
 */
export const processKickoffVehicles = async (saleSummaryId: number, validatedVehicleIds?: string[]): Promise<ProcessKickoffResult> => {
  const result: ProcessKickoffResult = {
    success: true,
    processed_count: 0,
    homologations_created: 0,
    already_homologated_count: 0,
    errors: [],
    failed_vehicles: [],
  };

  console.log(`[KICKOFF] Starting processing for sale_summary_id: ${saleSummaryId}`);

  try {
    // Prefer the exact set selected in the latest kickoff (kickoff_history)
    let vehicles: any[] | null = null;

    const { data: kickoff, error: kickoffErr } = await supabase
      .from('kickoff_history')
      .select('vehicles_data')
      .eq('sale_summary_id', saleSummaryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (kickoffErr) {
      console.warn('Error fetching kickoff_history:', kickoffErr);
    }

    if (kickoff?.vehicles_data && Array.isArray(kickoff.vehicles_data) && kickoff.vehicles_data.length > 0) {
      const vehicleIds = kickoff.vehicles_data.map((v: any) => v.id).filter(Boolean);
      const { data: byIds, error: byIdsErr } = await supabase
        .from('incoming_vehicles')
        .select('*')
        .in('id', vehicleIds);

      if (byIdsErr) {
        console.error('Error fetching vehicles by IDs from kickoff_history:', byIdsErr);
        result.errors.push(`Failed to fetch vehicles by kickoff set: ${byIdsErr.message}`);
      } else {
        vehicles = byIds || [];
      }
    }

    // Fallback: fetch by sale_summary_id
    if (!vehicles) {
      const { data: bySale, error: vehiclesError } = await supabase
        .from('incoming_vehicles')
        .select('*')
        .eq('sale_summary_id', saleSummaryId);

      if (vehiclesError) {
        console.error('Error fetching vehicles for kickoff by sale_summary_id:', vehiclesError);
        result.errors.push(`Failed to fetch vehicles: ${vehiclesError.message}`);
        result.success = false;
        return result;
      }

      vehicles = bySale || [];
    }

    if (!vehicles || vehicles.length === 0) {
      console.log('No vehicles to process for kickoff');
      return result;
    }

    // Filtrar apenas os veículos validados, se fornecidos
    if (validatedVehicleIds && validatedVehicleIds.length > 0) {
      vehicles = vehicles.filter(v => validatedVehicleIds.includes(v.id));
      console.log(`Filtered to ${vehicles.length} validated vehicles out of ${validatedVehicleIds.length} requested`);
    }

    if (vehicles.length === 0) {
      console.log('No validated vehicles to process for kickoff');
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

        // 3) Check if a card already exists for this vehicle type (any status)
        const normalizedBrand = vehicle.brand.trim().toUpperCase();
        const normalizedModel = vehicle.vehicle.trim().toUpperCase();
        
        const { data: existingCard, error: existingCardError } = await supabase
          .from('homologation_cards')
          .select('id, status, configuration, incoming_vehicle_id')
          .eq('brand', vehicle.brand)
          .eq('model', vehicle.vehicle)
          .eq('year', vehicle.year || 0)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (existingCardError) {
          console.warn('Error checking existing card:', existingCardError);
        }

        // 4) If card exists, link this vehicle to it instead of creating duplicate
        if (existingCard && !existingCards.some(c => c.id === existingCard.id)) {
          console.log(`[KICKOFF] Found existing card ${existingCard.id} (status: ${existingCard.status}), linking vehicle ${vehicle.id}`);
          
          // Link the vehicle to the existing card
          const { error: linkErr } = await supabase
            .from('homologation_cards')
            .update({ incoming_vehicle_id: vehicle.id })
            .eq('id', existingCard.id);
          
          if (linkErr) {
            console.warn(`Failed to link vehicle ${vehicle.id} to existing card ${existingCard.id}:`, linkErr);
          } else {
            console.log(`[KICKOFF] Successfully linked vehicle ${vehicle.id} to card ${existingCard.id}`);
            existingCard.incoming_vehicle_id = vehicle.id;
            existingCards.push(existingCard);
          }
        }

        // 5) Ensure there is one card per unit (quantity)
        const qty = Math.max(vehicle.quantity || 1, 1);
        const existingCount = existingCards.length;
        const missingCount = Math.max(qty - existingCount, 0);

        console.log(`Vehicle ${vehicle.id} has quantity=${qty}. Existing cards=${existingCount}. Missing to create=${missingCount}`);

        let firstCardId: string | null = existingCards[0]?.id || vehicle.created_homologation_id || null;
        const isHomologated = existingCard?.status === 'homologado';
        const baseNotesAuto = `Criado do kickoff para ${vehicle.company_name}. Homologação automática baseada em card existente (${existingCard?.id}).`;
        const baseNotesManual = `Criado do kickoff para ${vehicle.company_name}. Aguardando homologação.`;

        // Only create new cards if needed (when quantity > existing cards AND no card found to reuse)
        for (let i = 0; i < missingCount; i++) {
          // Check again if card exists (avoid duplicates within loop)
          const { data: checkCard } = await supabase
            .from('homologation_cards')
            .select('id')
            .eq('brand', vehicle.brand)
            .eq('model', vehicle.vehicle)
            .eq('year', vehicle.year || 0)
            .maybeSingle();
          
          if (checkCard) {
            console.log(`[KICKOFF] Card already exists (${checkCard.id}), skipping creation`);
            if (!firstCardId) firstCardId = checkCard.id;
            continue;
          }
          
          const status = isHomologated ? 'homologado' : 'homologar';
          const notes = isHomologated ? baseNotesAuto : baseNotesManual;

          console.log(`[KICKOFF] Creating ${status} card (${i + 1}/${missingCount}) for vehicle ${vehicle.id}`);
          
          try {
            const { data: newCard, error: createErr } = await supabase
              .from('homologation_cards')
              .insert({
                brand: vehicle.brand,
                model: vehicle.vehicle,
                year: vehicle.year || null,
                status,
                incoming_vehicle_id: vehicle.id,
                configuration: existingCard?.configuration || null,
                notes,
              })
              .select()
              .single();

            if (createErr) {
              const errorMsg = `Failed to create card: ${createErr.message} (code: ${createErr.code}, details: ${createErr.details})`;
              console.error(`[KICKOFF ERROR] Vehicle ${vehicle.id}:`, {
                error: createErr,
                vehicle: { id: vehicle.id, brand: vehicle.brand, model: vehicle.vehicle, year: vehicle.year },
                attemptedInsert: { brand: vehicle.brand, model: vehicle.vehicle, year: vehicle.year, status },
              });
              
              result.errors.push(`${vehicle.brand} ${vehicle.vehicle}: ${createErr.message}`);
              result.failed_vehicles.push({
                id: vehicle.id,
                brand: vehicle.brand,
                model: vehicle.vehicle,
                error: errorMsg,
              });

              // Log to app_logs
              await logAction({
                action: 'create_homologation_card_failed',
                module: 'kickoff',
                details: JSON.stringify({
                  sale_summary_id: saleSummaryId,
                  vehicle_id: vehicle.id,
                  brand: vehicle.brand,
                  model: vehicle.vehicle,
                  error: createErr.message,
                  error_code: createErr.code,
                  error_details: createErr.details,
                }),
              }).catch(logErr => console.error('[KICKOFF] Failed to log error:', logErr));

              continue; // try to create remaining ones
            }

            console.log(`[KICKOFF SUCCESS] Created homologation card ${newCard.id} for vehicle ${vehicle.id}`);
            if (!firstCardId) firstCardId = newCard.id;
            existingCards.push({ id: newCard.id, status: newCard.status, configuration: newCard.configuration, incoming_vehicle_id: vehicle.id } as any);

            if (!isHomologated) {
              result.homologations_created++;
            }
          } catch (insertError) {
            const errorMsg = `Unexpected error during card creation: ${insertError instanceof Error ? insertError.message : 'Unknown error'}`;
            console.error(`[KICKOFF CRITICAL ERROR] Vehicle ${vehicle.id}:`, insertError);
            
            result.errors.push(`${vehicle.brand} ${vehicle.vehicle}: ${errorMsg}`);
            result.failed_vehicles.push({
              id: vehicle.id,
              brand: vehicle.brand,
              model: vehicle.vehicle,
              error: errorMsg,
            });

            // Log to app_logs
            await logAction({
              action: 'create_homologation_card_exception',
              module: 'kickoff',
              details: JSON.stringify({
                sale_summary_id: saleSummaryId,
                vehicle_id: vehicle.id,
                brand: vehicle.brand,
                model: vehicle.vehicle,
                error: insertError instanceof Error ? insertError.message : 'Unknown error',
                stack: insertError instanceof Error ? insertError.stack : undefined,
              }),
            }).catch(logErr => console.error('[KICKOFF] Failed to log exception:', logErr));
          }
        }

        // 5) Determine overall status for the incoming vehicle based on its cards
        const linkedStatus = existingCards.some(c => c.status === 'homologado')
          ? 'homologado'
          : (existingCards[0]?.status || 'homologar');

        // 6) Only mark as kickoff_completed if we have at least one card
        if (existingCards.length > 0 && firstCardId) {
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
            console.error(`[KICKOFF ERROR] Failed to update vehicle ${vehicle.id}:`, updateErr);
            result.errors.push(`${vehicle.brand} ${vehicle.vehicle}: Failed to mark as completed - ${updateErr.message}`);
          } else {
            console.log(`[KICKOFF] Marked vehicle ${vehicle.id} as kickoff_completed with status ${linkedStatus}`);
          }
        } else {
          console.error(`[KICKOFF ERROR] Vehicle ${vehicle.id} has no cards, NOT marking as kickoff_completed`);
          result.errors.push(`${vehicle.brand} ${vehicle.vehicle}: No cards created, kickoff not completed`);
          
          // Update with error status
          await supabase
            .from('incoming_vehicles')
            .update({
              processing_notes: `ERRO: Falha ao criar cards de homologação. Necessário reprocessamento.`,
            })
            .eq('id', vehicle.id);
        }

        if (linkedStatus === 'homologado' || isHomologated) {
          result.already_homologated_count++;
        }
        result.processed_count++;

      } catch (error) {
        console.error(`Unexpected error processing vehicle ${vehicle.id}:`, error);
        result.errors.push(`Vehicle ${vehicle.brand} ${vehicle.vehicle}: ${(error as Error).message}`);
        // Continue to next vehicle even if this one failed
      }
    }

    console.log(`[KICKOFF] Processing complete: ${result.processed_count} processed, ${result.homologations_created} created, ${result.already_homologated_count} auto-homologated, ${result.errors.length} errors`);

    result.success = result.errors.length === 0;

    // Log final result to app_logs
    await logAction({
      action: result.success ? 'kickoff_completed' : 'kickoff_completed_with_errors',
      module: 'kickoff',
      details: JSON.stringify({
        sale_summary_id: saleSummaryId,
        processed_count: result.processed_count,
        homologations_created: result.homologations_created,
        already_homologated_count: result.already_homologated_count,
        errors_count: result.errors.length,
        failed_vehicles: result.failed_vehicles,
      }),
    }).catch(logErr => console.error('[KICKOFF] Failed to log completion:', logErr));

    return result;
  } catch (error) {
    console.error('[KICKOFF FATAL ERROR]:', error);
    result.errors.push(`Unexpected error: ${(error as Error).message}`);
    result.success = false;

    // Log fatal error
    await logAction({
      action: 'kickoff_fatal_error',
      module: 'kickoff',
      details: JSON.stringify({
        sale_summary_id: saleSummaryId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }),
    }).catch(logErr => console.error('[KICKOFF] Failed to log fatal error:', logErr));

    return result;
  }
};
