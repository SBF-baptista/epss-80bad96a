// Edge function: processes kickoff vehicles server-side using service_role.
// Validates that the caller has permission (admin/gestor role OR edit/approve/admin access on 'kickoff' module),
// then creates/links homologation_cards without depending on RLS on homologation_cards.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Result {
  success: boolean;
  processed_count: number;
  homologations_created: number;
  already_homologated_count: number;
  errors: string[];
  failed_vehicles: Array<{ id: string; brand: string; model: string; error: string }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const result: Result = {
    success: true,
    processed_count: 0,
    homologations_created: 0,
    already_homologated_count: 0,
    errors: [],
    failed_vehicles: [],
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth: identify caller
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ ...result, success: false, errors: ["missing_auth"] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ...result, success: false, errors: ["invalid_auth"] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Admin client (service_role) — bypasses RLS for the actual writes
    const supabase = createClient(supabaseUrl, serviceKey);

    // Permission check: admin/gestor role OR edit/approve/admin on 'kickoff' module
    const [{ data: roles }, { data: perms }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("user_module_permissions").select("permission").eq("user_id", userId).eq("module", "kickoff"),
    ]);
    const roleSet = new Set((roles || []).map((r: any) => r.role));
    const permSet = new Set((perms || []).map((p: any) => p.permission));
    const allowed =
      roleSet.has("admin") ||
      roleSet.has("gestor") ||
      permSet.has("edit") ||
      permSet.has("approve") ||
      permSet.has("admin");

    if (!allowed) {
      return new Response(
        JSON.stringify({ ...result, success: false, errors: ["forbidden: no kickoff permission"] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const saleSummaryId: number | undefined = body.sale_summary_id;
    const validatedVehicleIds: string[] | undefined = body.validated_vehicle_ids;

    if (!saleSummaryId) {
      return new Response(JSON.stringify({ ...result, success: false, errors: ["missing sale_summary_id"] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[KICKOFF-EF] user=${userId} sale=${saleSummaryId} filter=${validatedVehicleIds?.length ?? "all"}`);

    // Load vehicles preferring the exact set from latest kickoff_history
    let vehicles: any[] = [];
    const { data: kickoff } = await supabase
      .from("kickoff_history")
      .select("vehicles_data")
      .eq("sale_summary_id", saleSummaryId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (kickoff?.vehicles_data && Array.isArray(kickoff.vehicles_data) && kickoff.vehicles_data.length > 0) {
      const ids = kickoff.vehicles_data.map((v: any) => v.id).filter(Boolean);
      const { data } = await supabase.from("incoming_vehicles").select("*").in("id", ids);
      vehicles = data || [];
    }
    if (vehicles.length === 0) {
      const { data } = await supabase.from("incoming_vehicles").select("*").eq("sale_summary_id", saleSummaryId);
      vehicles = data || [];
    }

    if (validatedVehicleIds && validatedVehicleIds.length > 0) {
      vehicles = vehicles.filter((v: any) => validatedVehicleIds.includes(v.id));
    }

    if (vehicles.length === 0) {
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const vehicle of vehicles) {
      try {
        console.log(`[KICKOFF-EF] processing ${vehicle.id} ${vehicle.brand} ${vehicle.vehicle} (${vehicle.year})`);

        // Cards currently linked to this incoming vehicle
        const { data: linkedCards } = await supabase
          .from("homologation_cards")
          .select("id, status, configuration, incoming_vehicle_id")
          .eq("incoming_vehicle_id", vehicle.id)
          .is("deleted_at", null);
        const existingCards: any[] = linkedCards || [];

        // If there is a pre-linked card by created_homologation_id, ensure it's included
        if (
          vehicle.created_homologation_id &&
          !existingCards.some((c) => c.id === vehicle.created_homologation_id)
        ) {
          const { data: createdCard } = await supabase
            .from("homologation_cards")
            .select("id, status, configuration, incoming_vehicle_id")
            .eq("id", vehicle.created_homologation_id)
            .is("deleted_at", null)
            .maybeSingle();

          if (createdCard) {
            if (!createdCard.incoming_vehicle_id) {
              await supabase
                .from("homologation_cards")
                .update({ incoming_vehicle_id: vehicle.id })
                .eq("id", createdCard.id);
              createdCard.incoming_vehicle_id = vehicle.id;
            }
            existingCards.push(createdCard);
          } else {
            await supabase
              .from("incoming_vehicles")
              .update({ created_homologation_id: null, homologation_status: "homologar" })
              .eq("id", vehicle.id);
          }
        }

        const normalizedBrand = (vehicle.brand || "").trim().toUpperCase();
        const normalizedModel = (vehicle.vehicle || "").trim().toUpperCase();

        const { data: existingCard } = await supabase
          .from("homologation_cards")
          .select("id, status, configuration, incoming_vehicle_id")
          .ilike("brand", normalizedBrand)
          .ilike("model", normalizedModel)
          .eq("year", vehicle.year || 0)
          .is("deleted_at", null)
          .order("status", { ascending: true })
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Não reaproveita card de outro veículo: o card do mesmo modelo serve apenas
        // como referência de status/configuração para o card próprio deste veículo.

        const qty = Math.max(vehicle.quantity || 1, 1);
        const missingCount = Math.max(qty - existingCards.length, 0);

        let firstCardId: string | null = existingCards[0]?.id || vehicle.created_homologation_id || null;
        const isHomologated = existingCard?.status === "homologado";
        const baseNotesAuto = `Criado do kickoff para ${vehicle.company_name}. Homologação automática baseada em card existente (${existingCard?.id}).`;
        const baseNotesManual = `Criado do kickoff para ${vehicle.company_name}. Aguardando homologação.`;

        for (let i = 0; i < missingCount; i++) {
          const status = isHomologated ? "homologado" : "homologar";
          const notes = isHomologated ? baseNotesAuto : baseNotesManual;

          const { data: newCard, error: createErr } = await supabase
            .from("homologation_cards")
            .insert({
              brand: normalizedBrand,
              model: normalizedModel,
              year: vehicle.year || null,
              status,
              incoming_vehicle_id: vehicle.id,
              configuration: existingCard?.configuration || null,
              notes,
            })
            .select()
            .single();

          if (createErr) {
            console.warn(`[KICKOFF-EF] create card failed for ${vehicle.id}, falling back to RPC:`, createErr);

            // Fallback: a tabela possui unique (brand, model, year) — reaproveita/vincula via função do banco
            const { data: rpcCardId, error: rpcErr } = await supabase.rpc("ensure_homologation_card", {
              p_vehicle_id: vehicle.id,
            });

            if (!rpcErr && rpcCardId) {
              if (!firstCardId) firstCardId = rpcCardId as string;
              existingCards.push({
                id: rpcCardId as string,
                status: "homologar",
                configuration: existingCard?.configuration || null,
                incoming_vehicle_id: vehicle.id,
              });
              continue;
            }

            const errMessage = rpcErr?.message || createErr.message;
            result.errors.push(`${vehicle.brand} ${vehicle.vehicle}: ${errMessage}`);
            result.failed_vehicles.push({
              id: vehicle.id,
              brand: vehicle.brand,
              model: vehicle.vehicle,
              error: errMessage,
            });

            await supabase.from("app_logs").insert({
              user_id: userId,
              action: "create_homologation_card_failed",
              module: "kickoff",
              details: JSON.stringify({
                sale_summary_id: saleSummaryId,
                vehicle_id: vehicle.id,
                brand: vehicle.brand,
                model: vehicle.vehicle,
                error: errMessage,
                via: "edge-function",
              }),
            });
            continue;
          }


          if (!firstCardId) firstCardId = newCard.id;
          existingCards.push({
            id: newCard.id,
            status: newCard.status,
            configuration: newCard.configuration,
            incoming_vehicle_id: vehicle.id,
          });
          if (!isHomologated) result.homologations_created++;
        }

        const linkedStatus = existingCards.some((c) => c.status === "homologado")
          ? "homologado"
          : existingCards[0]?.status || "homologar";

        if (existingCards.length > 0 && firstCardId) {
          await supabase
            .from("incoming_vehicles")
            .update({
              kickoff_completed: true,
              created_homologation_id: firstCardId,
              homologation_status: linkedStatus,
              processing_notes: `Kickoff completed via edge function. ${
                missingCount > 0 ? `Created ${missingCount} card(s).` : "Cards already existed."
              }`,
            })
            .eq("id", vehicle.id);
        } else {
          result.errors.push(`${vehicle.brand} ${vehicle.vehicle}: No cards created, kickoff not completed`);
          await supabase
            .from("incoming_vehicles")
            .update({ processing_notes: "ERRO: Falha ao criar cards de homologação. Necessário reprocessamento." })
            .eq("id", vehicle.id);
        }

        if (linkedStatus === "homologado" || isHomologated) result.already_homologated_count++;
        result.processed_count++;
      } catch (err) {
        console.error(`[KICKOFF-EF] unexpected error on vehicle ${vehicle.id}:`, err);
        result.errors.push(`${vehicle.brand} ${vehicle.vehicle}: ${(err as Error).message}`);
      }
    }

    result.success = result.errors.length === 0;

    await supabase.from("app_logs").insert({
      user_id: userId,
      action: result.success ? "kickoff_completed" : "kickoff_completed_with_errors",
      module: "kickoff",
      details: JSON.stringify({
        sale_summary_id: saleSummaryId,
        processed_count: result.processed_count,
        homologations_created: result.homologations_created,
        already_homologated_count: result.already_homologated_count,
        errors_count: result.errors.length,
        failed_vehicles: result.failed_vehicles,
        via: "edge-function",
      }),
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[KICKOFF-EF] FATAL:", error);
    return new Response(
      JSON.stringify({
        ...result,
        success: false,
        errors: [...result.errors, `fatal: ${(error as Error).message}`],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
