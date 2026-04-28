import { supabase } from "@/integrations/supabase/client";

function normalize(s: string) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

export interface HomologationFallbackMatch {
  source: "homologation_card" | "automation_rule";
  brand: string;
  model: string;
  year: number | null;
  configuration: string;
  tracker_model?: string | null;
  notes?: string | null;
}

/**
 * Looks up a vehicle in homologation_cards (status = 'homologado') and then in
 * automation_rules_extended. Returns the first homologated configuration found,
 * or null if nothing matches.
 */
export async function findHomologatedConfig(
  brand: string,
  model: string,
  year: number | null,
): Promise<HomologationFallbackMatch | null> {
  const nb = normalize(brand);
  const nm = normalize(model);
  if (!nb || !nm) return null;

  // 1) homologation_cards (status homologado, configuration not null)
  try {
    const { data: cards } = await supabase
      .from("homologation_cards")
      .select("brand, model, year, configuration, notes, status")
      .eq("status", "homologado")
      .ilike("brand", nb)
      .ilike("model", `%${nm}%`)
      .not("configuration", "is", null)
      .limit(20);

    if (cards && cards.length > 0) {
      const exactYear =
        year != null ? cards.find((c) => c.year === year && c.configuration) : null;
      const noYear = cards.find((c) => c.configuration);
      const pick = exactYear || noYear;
      if (pick && pick.configuration) {
        return {
          source: "homologation_card",
          brand: pick.brand,
          model: pick.model,
          year: pick.year,
          configuration: pick.configuration,
          notes: pick.notes,
        };
      }
    }
  } catch (e) {
    console.warn("[homologationFallback] cards lookup failed", e);
  }

  // 2) automation_rules_extended (broader match: brand exact, model contains)
  try {
    const { data: rules } = await supabase
      .from("automation_rules_extended")
      .select("brand, model, model_year, tracker_model, configuration, notes")
      .ilike("brand", nb)
      .ilike("model", `%${nm}%`)
      .limit(20);

    if (rules && rules.length > 0) {
      const yearStr = year ? String(year) : null;
      const exactYear = yearStr ? rules.find((r) => r.model_year === yearStr) : null;
      const pick = exactYear || rules[0];
      if (pick && pick.configuration) {
        return {
          source: "automation_rule",
          brand: pick.brand,
          model: pick.model,
          year: pick.model_year ? parseInt(pick.model_year, 10) || null : null,
          configuration: pick.configuration,
          tracker_model: pick.tracker_model,
          notes: pick.notes,
        };
      }
    }
  } catch (e) {
    console.warn("[homologationFallback] rules lookup failed", e);
  }

  return null;
}
