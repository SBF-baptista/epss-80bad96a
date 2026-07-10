import { supabase } from "@/integrations/supabase/client";

export interface ProcessKickoffResult {
  success: boolean;
  processed_count: number;
  homologations_created: number;
  already_homologated_count: number;
  errors: string[];
  failed_vehicles: Array<{ id: string; brand: string; model: string; error: string }>;
}

/**
 * Process all vehicles for a client when kickoff is completed.
 * Delegates the entire flow to the `kickoff-process-vehicles` edge function,
 * which uses service_role — no dependency on RLS in homologation_cards.
 */
export const processKickoffVehicles = async (
  saleSummaryId: number,
  validatedVehicleIds?: string[],
): Promise<ProcessKickoffResult> => {
  console.log(`[KICKOFF] Invoking edge function for sale_summary_id=${saleSummaryId}`);

  const { data, error } = await supabase.functions.invoke("kickoff-process-vehicles", {
    body: {
      sale_summary_id: saleSummaryId,
      validated_vehicle_ids: validatedVehicleIds,
    },
  });

  if (error) {
    console.error("[KICKOFF] Edge function invocation failed:", error);
    return {
      success: false,
      processed_count: 0,
      homologations_created: 0,
      already_homologated_count: 0,
      errors: [`Edge function error: ${error.message}`],
      failed_vehicles: [],
    };
  }

  return (data as ProcessKickoffResult) ?? {
    success: false,
    processed_count: 0,
    homologations_created: 0,
    already_homologated_count: 0,
    errors: ["Empty response from edge function"],
    failed_vehicles: [],
  };
};
