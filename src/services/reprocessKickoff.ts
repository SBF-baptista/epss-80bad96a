import { supabase } from "@/integrations/supabase/client";

/**
 * Reprocess a specific kickoff to create missing homologation cards
 */
export const reprocessKickoff = async (saleSummaryId: number) => {
  try {
    console.log(`🔄 Reprocessing kickoff for sale_summary_id: ${saleSummaryId}`);
    
    // Get all vehicles for this sale_summary_id
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('incoming_vehicles')
      .select('*')
      .eq('sale_summary_id', saleSummaryId);

    if (vehiclesError) {
      console.error('Error fetching vehicles:', vehiclesError);
      throw vehiclesError;
    }

    if (!vehicles || vehicles.length === 0) {
      console.log('No vehicles found for this sale_summary_id');
      return { success: false, message: 'No vehicles found' };
    }

    console.log(`Found ${vehicles.length} vehicle(s) to process`);

    for (const vehicle of vehicles) {
      console.log(`Processing vehicle: ${vehicle.brand} ${vehicle.vehicle} (${vehicle.year})`);
      
      // Check if homologation card already exists
      const { data: existingCards } = await supabase
        .from('homologation_cards')
        .select('*')
        .eq('incoming_vehicle_id', vehicle.id);

      const qty = Math.max(vehicle.quantity || 1, 1);
      const existingCount = existingCards?.length || 0;
      const missingCount = Math.max(qty - existingCount, 0);

      console.log(`Vehicle needs ${qty} cards. Has ${existingCount}. Missing: ${missingCount}`);

      if (missingCount > 0) {
        // Check for existing homologated card
        const { data: existingHomologation } = await supabase
          .from('homologation_cards')
          .select('id, status, configuration')
          .eq('brand', vehicle.brand)
          .eq('model', vehicle.vehicle)
          .eq('year', vehicle.year || 0)
          .eq('status', 'homologado')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Create missing cards
        for (let i = 0; i < missingCount; i++) {
          const status = existingHomologation ? 'homologado' : 'homologar';
          const notes = existingHomologation 
            ? `Criado do kickoff para ${vehicle.company_name}. Homologação automática baseada em veículo similar (${existingHomologation.id}).`
            : `Criado do kickoff para ${vehicle.company_name}. Aguardando homologação.`;

          console.log(`Creating card ${i + 1}/${missingCount} with status: ${status}`);
          
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
            console.error('Error creating card:', createErr);
            throw createErr;
          }

          console.log(`✅ Created card ${newCard.id}`);

          // Update incoming_vehicle with the first card's ID
          if (i === 0) {
            await supabase
              .from('incoming_vehicles')
              .update({
                created_homologation_id: newCard.id,
                homologation_status: status,
                processing_notes: `Kickoff reprocessado. Criado ${missingCount} card(s).`,
              })
              .eq('id', vehicle.id);
          }
        }
      } else {
        console.log('Vehicle already has all required cards');
      }
    }

    return { 
      success: true, 
      message: `Successfully reprocessed ${vehicles.length} vehicle(s)` 
    };

  } catch (error) {
    console.error('Error reprocessing kickoff:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
