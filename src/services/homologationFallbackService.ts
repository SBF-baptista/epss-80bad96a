import { supabase } from "@/integrations/supabase/client";

function normalize(s: string) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\/\-_.]/g, " ")
    .replace(/\s+/g, " ")
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

// Known brand aliases — maps any user input to the set of canonical brand names
// that should be searched in the database.
const BRAND_ALIASES: Record<string, string[]> = {
  VOLKSWAGEN: ["VOLKSWAGEN", "VOLKSWAGEM", "VW"],
  VOLKSWAGEM: ["VOLKSWAGEN", "VOLKSWAGEM", "VW"],
  VW: ["VOLKSWAGEN", "VOLKSWAGEM", "VW"],
  CHEVROLET: ["CHEVROLET", "GM", "GENERAL MOTORS"],
  GM: ["CHEVROLET", "GM", "GENERAL MOTORS"],
  MERCEDES: ["MERCEDES", "MERCEDES-BENZ", "MERCEDES BENZ", "MB"],
  "MERCEDES BENZ": ["MERCEDES", "MERCEDES-BENZ", "MERCEDES BENZ", "MB"],
  "MERCEDES-BENZ": ["MERCEDES", "MERCEDES-BENZ", "MERCEDES BENZ", "MB"],
  IVECO: ["IVECO", "IVECO/FIAT"],
  FIAT: ["FIAT", "FCA"],
  RENAULT: ["RENAULT", "RNT"],
  PEUGEOT: ["PEUGEOT", "PSA"],
  CITROEN: ["CITROEN", "CITROËN"],
  HYUNDAI: ["HYUNDAI", "HMB"],
};

function brandVariants(brand: string): string[] {
  const nb = normalize(brand);
  const variants = new Set<string>([nb]);
  // Direct alias hit
  if (BRAND_ALIASES[nb]) BRAND_ALIASES[nb].forEach((b) => variants.add(b));
  // Reverse alias hit (input is itself a canonical brand)
  for (const [key, group] of Object.entries(BRAND_ALIASES)) {
    if (group.includes(nb)) {
      variants.add(key);
      group.forEach((b) => variants.add(b));
    }
  }
  // Add a 5-char prefix as fuzzy fallback (covers small typos like VOLKSWAGEM)
  if (nb.length >= 5) variants.add(nb.slice(0, 5));
  return Array.from(variants);
}

// Tokens that don't help discriminate model and should be ignored when scoring
const STOP_TOKENS = new Set([
  "VW",
  "GM",
  "MB",
  "DE",
  "DA",
  "DO",
  "L",
  "MT",
  "AT",
  "CD",
  "CS",
  "RB",
  "MPI",
  "MF",
  "MBVS",
  "ROBUST",
  "16",
  "1.6",
  "20",
  "2.0",
  "TDI",
]);

function modelTokens(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((t) => t.length >= 2 && !STOP_TOKENS.has(t));
}

/**
 * Token-overlap score between input model and candidate model.
 * Returns the count of input tokens present in the candidate (case-insensitive).
 * Higher is better; 0 means no overlap.
 */
function modelScore(inputTokens: string[], candidate: string): number {
  if (inputTokens.length === 0) return 0;
  const candNorm = normalize(candidate);
  let score = 0;
  for (const t of inputTokens) {
    if (candNorm.includes(t)) score++;
  }
  return score;
}

/**
 * Picks the best candidate from a list using:
 *  1) highest model token overlap
 *  2) exact year match (when input year provided)
 *  3) closest year (smallest absolute diff)
 */
function pickBest<T extends Record<string, any>>(
  items: T[],
  inputModel: string,
  inputYear: number | null,
): T | null {
  const inputTokens = modelTokens(inputModel);
  const scored = items
    .filter((i) => !!i.configuration)
    .map((i) => {
      const itemYear =
        i.year != null
          ? Number(i.year)
          : i.model_year
            ? parseInt(i.model_year, 10) || null
            : null;
      const score = modelScore(inputTokens, i.model);
      const yearDiff = inputYear != null && itemYear != null ? Math.abs(itemYear - inputYear) : 999;
      const exactYear = inputYear != null && itemYear === inputYear ? 1 : 0;
      return { item: i, score, yearDiff, exactYear };
    })
    .filter((s) => s.score > 0); // Require at least 1 model token overlap

  if (scored.length === 0) return null;

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.exactYear !== a.exactYear) return b.exactYear - a.exactYear;
    return a.yearDiff - b.yearDiff;
  });

  return scored[0].item;
}

/**
 * Looks up a vehicle in homologation_cards (status = 'homologado') and then in
 * automation_rules_extended. Returns the best homologated configuration found,
 * or null if nothing matches.
 *
 * Strategy:
 *  - Tolerant brand matching via aliases (VW/VOLKSWAGEM/VOLKSWAGEN are equivalent)
 *  - Token-overlap scoring on model (handles trim suffixes like "CS RB MF")
 *  - Prefer exact year, then closest year
 */
export async function findHomologatedConfig(
  brand: string,
  model: string,
  year: number | null,
): Promise<HomologationFallbackMatch | null> {
  const nb = normalize(brand);
  const nm = normalize(model);
  if (!nb || !nm) return null;

  const brandList = brandVariants(brand);
  // Build a single PostgREST OR filter for brand variants using ilike
  const brandOr = brandList.map((b) => `brand.ilike.${b}`).join(",");
  // Use the strongest single token from the model name to widen the SQL filter,
  // then refine client-side with full token-overlap scoring.
  const tokens = modelTokens(model);
  const primaryToken = tokens[0] || nm;

  // 1) homologation_cards (status homologado, configuration not null)
  try {
    const { data: cards, error } = await supabase
      .from("homologation_cards")
      .select("brand, model, year, configuration, notes, status")
      .eq("status", "homologado")
      .or(brandOr)
      .ilike("model", `%${primaryToken}%`)
      .not("configuration", "is", null)
      .limit(50);

    if (error) console.warn("[homologationFallback] cards query error", error);

    if (cards && cards.length > 0) {
      const pick = pickBest(cards as any, model, year);
      if (pick && pick.configuration) {
        return {
          source: "homologation_card",
          brand: pick.brand,
          model: pick.model,
          year: pick.year ?? null,
          configuration: pick.configuration,
          notes: pick.notes,
        };
      }
    }
  } catch (e) {
    console.warn("[homologationFallback] cards lookup failed", e);
  }

  // 2) automation_rules_extended
  try {
    const { data: rules, error } = await supabase
      .from("automation_rules_extended")
      .select("brand, model, model_year, tracker_model, configuration, notes")
      .or(brandOr)
      .ilike("model", `%${primaryToken}%`)
      .not("configuration", "is", null)
      .limit(50);

    if (error) console.warn("[homologationFallback] rules query error", error);

    if (rules && rules.length > 0) {
      const pick = pickBest(rules as any, model, year);
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
