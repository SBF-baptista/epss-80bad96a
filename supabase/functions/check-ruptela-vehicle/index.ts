import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RUPTELA_BASE = 'https://vehicles.ruptela.com/vehicles';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const PER_PAGE_HINT = 50;
const MAX_PAGES = 8; // safety cap

// ---------- Types ----------
interface RuptelaEntry {
  brand: string;
  model: string;
  type: string;
  generation: string;
  year_from: number | null;
  year_to: number | null;
  regions: string[];
  tags: string[];
  devices: string[];
  connection_methods: string[];
  created_at: string;
  // Internal Ruptela vehicle id (used to fetch the detail page that has
  // the actual CANbus Configuration text — e.g. "1. LCV group - CITROEN4").
  vehicle_id: number | null;
  // Link to the official Installation Instructions PDF (extracted from the listing).
  canbus_configuration_url: string | null;
  // Plain text of the "CANbus Configuration" section from the vehicle detail page.
  // Populated lazily for the matched entry only (avoids N extra requests when listing).
  canbus_configuration: string | null;
}

// ---------- Helpers ----------
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const stripTags = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const splitList = (s: string): string[] =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

const parseYear = (s: string): number | null => {
  const m = s.match(/\d{4}/);
  return m ? parseInt(m[0], 10) : null;
};

// ---------- HTML parser ----------
function parseRuptelaHtml(html: string): RuptelaEntry[] {
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) return [];

  const tableHtml = tableMatch[1];
  const rowMatches = tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g);
  const entries: RuptelaEntry[] = [];

  for (const rowMatch of rowMatches) {
    // Capture raw cell HTML so we can extract anchors before stripping tags
    const cellMatches = [...rowMatch[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)];
    if (cellMatches.length < 11) continue;

    const rawCells = cellMatches.map((c) => c[1]);
    const cells = rawCells.map(stripTags);
    if (cells[0].toLowerCase() === 'brand') continue; // header

    // Extract Installation Instructions / CANbus PDF link from Actions cell (index 11 when present).
    // Ruptela renders a green PDF icon linking to doc.ruptela.com/.../INSTALLATION INSTRUCTIONS/...pdf
    let canbusUrl: string | null = null;
    let vehicleId: number | null = null;
    const actionsHtml = rawCells[11] ?? '';
    const pdfMatch =
      actionsHtml.match(/href=["']([^"']*INSTALLATION%20INSTRUCTIONS[^"']*\.pdf)["']/i) ||
      actionsHtml.match(/href=["']([^"']+\.pdf)["']/i);
    if (pdfMatch) canbusUrl = pdfMatch[1];

    // The "showUpdateLog(N)" wire:click attribute carries the internal Ruptela vehicle id,
    // which lets us fetch the detail page (/vehicle/N) for the CANbus Configuration text.
    const idMatch = actionsHtml.match(/showUpdateLog\((\d+)\)/);
    if (idMatch) vehicleId = parseInt(idMatch[1], 10);

    entries.push({
      brand: cells[0],
      model: cells[1],
      type: cells[2],
      generation: cells[3],
      year_from: parseYear(cells[4]),
      year_to: cells[5] === '-' || !cells[5] ? null : parseYear(cells[5]),
      regions: splitList(cells[6]),
      tags: splitList(cells[7]),
      devices: splitList(cells[8]),
      connection_methods: splitList(cells[9]),
      created_at: cells[10] || '',
      vehicle_id: vehicleId,
      canbus_configuration_url: canbusUrl,
      canbus_configuration: null,
    });
  }
  return entries;
}

// ---------- Fetch with pagination ----------
async function fetchRuptelaBrand(brand: string): Promise<RuptelaEntry[]> {
  const all: RuptelaEntry[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL(RUPTELA_BASE);
    if (brand) url.searchParams.set('brand', brand);
    if (page > 1) url.searchParams.set('page', String(page));

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'OPM-SEGSAT/1.0 (+vehicle-compatibility-check)',
        Accept: 'text/html',
      },
    });
    if (!res.ok) {
      throw new Error(`Ruptela responded ${res.status} for page ${page}`);
    }
    const html = await res.text();
    const pageEntries = parseRuptelaHtml(html);
    if (pageEntries.length === 0) break;
    all.push(...pageEntries);
    if (pageEntries.length < PER_PAGE_HINT) break;
  }
  return all;
}

// ---------- Cache ----------
async function getCached(
  supabase: ReturnType<typeof createClient>,
  key: string,
): Promise<{ payload: RuptelaEntry[]; fetched_at: string } | null> {
  const { data } = await supabase
    .from('ruptela_vehicles_cache')
    .select('payload, fetched_at')
    .eq('cache_key', key)
    .maybeSingle();
  return (data as any) ?? null;
}

async function saveCache(
  supabase: ReturnType<typeof createClient>,
  key: string,
  payload: RuptelaEntry[],
) {
  await supabase
    .from('ruptela_vehicles_cache')
    .upsert(
      { cache_key: key, payload, fetched_at: new Date().toISOString() },
      { onConflict: 'cache_key' },
    );
}

// ---------- Vehicle detail (CANbus Configuration text) ----------
const VEHICLE_DETAIL_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — rarely changes

/**
 * Parses the "CANbus Configuration" card from the vehicle detail HTML.
 * The card structure on https://vehicles.ruptela.com/vehicle/{id} is:
 *   <h3>CANbus Configuration</h3> ... <div class="prose ...">TEXT</div>
 */
function parseCanbusConfiguration(html: string): string | null {
  // Find the heading, then the next .prose container after it.
  const headingIdx = html.search(/CANbus Configuration/i);
  if (headingIdx === -1) return null;
  const after = html.slice(headingIdx);
  const proseMatch = after.match(/<div[^>]*class=["'][^"']*prose[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (!proseMatch) return null;
  const text = stripTags(proseMatch[1]);
  return text || null;
}

async function fetchVehicleDetail(
  supabase: ReturnType<typeof createClient>,
  vehicleId: number,
): Promise<string | null> {
  const cacheKey = `vehicle_detail:${vehicleId}`;
  // Reuse same cache table — payload is wrapped as { canbus_configuration }.
  try {
    const { data } = await supabase
      .from('ruptela_vehicles_cache')
      .select('payload, fetched_at')
      .eq('cache_key', cacheKey)
      .maybeSingle();
    if (data) {
      const age = Date.now() - new Date((data as any).fetched_at).getTime();
      if (age < VEHICLE_DETAIL_TTL_MS) {
        return ((data as any).payload?.canbus_configuration as string | null) ?? null;
      }
    }
  } catch (_) {
    // cache read failure → fall through to live fetch
  }

  try {
    const res = await fetch(`https://vehicles.ruptela.com/vehicle/${vehicleId}`, {
      headers: {
        'User-Agent': 'OPM-SEGSAT/1.0 (+vehicle-compatibility-check)',
        Accept: 'text/html',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const canbus = parseCanbusConfiguration(html);

    await supabase
      .from('ruptela_vehicles_cache')
      .upsert(
        {
          cache_key: cacheKey,
          payload: { canbus_configuration: canbus },
          fetched_at: new Date().toISOString(),
        },
        { onConflict: 'cache_key' },
      );

    return canbus;
  } catch (err) {
    console.error('fetchVehicleDetail failed:', err);
    return null;
  }
}
// Tokens too generic to be discriminative (brand prefixes, abbreviations).
const STOPWORDS = new Set([
  'vw', 'mb', 'br', 'gm', 'fiat', 'ford', 'chevrolet', 'volkswagen', 'mercedes',
  'benz', 'de', 'do', 'da', 'the', 'new', 'novo', 'nova', 'serie', 'series',
  'class', 'classe', 'gen', 'type', 'mk',
]);

function tokenize(s: string): string[] {
  return normalize(s)
    .replace(/[^a-z0-9.\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((t) => t.length >= 2);
}

function significantTokens(s: string): string[] {
  return tokenize(s).filter((t) => !STOPWORDS.has(t));
}

/**
 * Token-set similarity: how many of the query's significant tokens appear
 * in the candidate (substring match allowed for numeric/model codes).
 * Returns 0..100.
 */
function tokenScore(query: string, target: string): number {
  const qTokens = significantTokens(query);
  const tTokens = tokenize(target);
  if (qTokens.length === 0) return 0;

  let hits = 0;
  for (const qt of qTokens) {
    const matched = tTokens.some(
      (tt) => tt === qt || (qt.length >= 3 && (tt.includes(qt) || qt.includes(tt))),
    );
    if (matched) hits++;
  }
  return Math.round((hits / qTokens.length) * 100);
}

function findCandidates(entries: RuptelaEntry[], model: string, year?: number) {
  const normModel = normalize(model);

  const scored = entries.map((entry) => {
    const en = normalize(entry.model);
    let score = 0;

    if (en === normModel) {
      score = 100;
    } else if (en.includes(normModel) || normModel.includes(en)) {
      score = 85;
    } else {
      // Token-based bidirectional scoring (handles word order, extra noise)
      const forward = tokenScore(model, entry.model);
      const backward = tokenScore(entry.model, model);
      score = Math.max(forward, backward);
      // Require at least one significant token match — avoid 0-token false positives
      if (score > 0 && score < 50) score = Math.max(score, 30);
    }

    let yearOk = true;
    if (year && score > 0) {
      const from = entry.year_from ?? 0;
      const to = entry.year_to ?? new Date().getFullYear();
      yearOk = year >= from && year <= to;
    }

    return { entry, score, yearOk };
  });

  return scored
    .filter((s) => s.score >= 30)
    .sort((a, b) => {
      if (a.yearOk !== b.yearOk) return a.yearOk ? -1 : 1;
      return b.score - a.score;
    });
}

// Try to load entries for a brand, returning empty array on any error.
async function tryFetchBrand(
  supabase: ReturnType<typeof createClient>,
  brand: string,
  force: boolean,
): Promise<{ entries: RuptelaEntry[]; fetchedAt: string | null; stale: boolean }> {
  const cacheKey = `brand:${normalize(brand)}`;
  let entries: RuptelaEntry[] = [];
  let fetchedAt: string | null = null;
  let stale = false;

  if (!force) {
    const cached = await getCached(supabase, cacheKey);
    if (cached) {
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      if (age < CACHE_TTL_MS) {
        return { entries: cached.payload, fetchedAt: cached.fetched_at, stale: false };
      }
    }
  }

  try {
    entries = await fetchRuptelaBrand(brand);
    await saveCache(supabase, cacheKey, entries);
    fetchedAt = new Date().toISOString();
  } catch (_) {
    const cached = await getCached(supabase, cacheKey);
    if (cached) {
      entries = cached.payload;
      fetchedAt = cached.fetched_at;
      stale = true;
    }
  }
  return { entries, fetchedAt, stale };
}

// ---------- Handler ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const brand = url.searchParams.get('brand')?.trim() ?? '';
    const model = url.searchParams.get('model')?.trim() ?? '';
    const yearStr = url.searchParams.get('year')?.trim() ?? '';
    const listBrands = url.searchParams.get('brands') === 'true';
    const force = url.searchParams.get('force') === 'true';
    const year = yearStr ? parseInt(yearStr, 10) : undefined;

    if (!listBrands && !brand) {
      return new Response(
        JSON.stringify({ error: 'Parameter "brand" is required (or use ?brands=true).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const cacheKey = listBrands ? 'all_brands' : `brand:${normalize(brand)}`;

    // Try cache
    let entries: RuptelaEntry[] = [];
    let fetchedAt: string | null = null;
    let stale = false;

    if (!force) {
      const cached = await getCached(supabase, cacheKey);
      if (cached) {
        const age = Date.now() - new Date(cached.fetched_at).getTime();
        if (age < CACHE_TTL_MS) {
          entries = cached.payload;
          fetchedAt = cached.fetched_at;
        }
      }
    }

    // Cache miss or forced
    if (entries.length === 0) {
      try {
        if (listBrands) {
          // Fetch first page only — enough to extract brand select options
          const res = await fetch(RUPTELA_BASE, {
            headers: { 'User-Agent': 'OPM-SEGSAT/1.0', Accept: 'text/html' },
          });
          const html = await res.text();
          // brands appear in a <select> — extract <option> values
          const selectMatch = html.match(/<select[^>]*name=["']?brand["']?[^>]*>([\s\S]*?)<\/select>/i);
          const brands: string[] = [];
          if (selectMatch) {
            const opts = selectMatch[1].matchAll(/<option[^>]*>([^<]+)<\/option>/g);
            for (const o of opts) {
              const v = o[1].trim();
              if (v && !/all brands/i.test(v)) brands.push(v);
            }
          }
          await saveCache(supabase, cacheKey, brands as any);
          return new Response(JSON.stringify({ brands, fetched_at: new Date().toISOString() }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        entries = await fetchRuptelaBrand(brand);
        if (entries.length === 0) {
          // Treat as a structural problem only if even a popular brand returns 0;
          // otherwise just an unknown brand → cache empty result for short period
        }
        await saveCache(supabase, cacheKey, entries);
        fetchedAt = new Date().toISOString();
      } catch (fetchErr) {
        // Fallback to stale cache
        const cached = await getCached(supabase, cacheKey);
        if (cached) {
          entries = cached.payload;
          fetchedAt = cached.fetched_at;
          stale = true;
        } else {
          throw fetchErr;
        }
      }
    }

    // List-brands path already returned above
    if (!model) {
      return new Response(
        JSON.stringify({
          brand,
          total: entries.length,
          entries,
          fetched_at: fetchedAt,
          stale,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Match model (+ optional year)
    const candidates = findCandidates(entries, model, year);
    const best = candidates[0];
    const supported = !!best && best.score >= 70 && best.yearOk;

    // Lazily enrich the matched entry with the CANbus Configuration text
    // from the vehicle detail page (only when we have an internal vehicle_id).
    let matchedEntry: RuptelaEntry | null = supported ? { ...best.entry } : null;
    if (matchedEntry && matchedEntry.vehicle_id) {
      const canbusText = await fetchVehicleDetail(supabase, matchedEntry.vehicle_id);
      matchedEntry.canbus_configuration = canbusText;
    }

    return new Response(
      JSON.stringify({
        supported,
        brand,
        model,
        year: year ?? null,
        matched_entry: matchedEntry,
        suggested_devices: supported ? best.entry.devices : [],
        connection_methods: supported ? best.entry.connection_methods : [],
        candidates: candidates.slice(0, 8).map((c) => ({
          ...c.entry,
          match_score: c.score,
          year_in_range: c.yearOk,
        })),
        fetched_at: fetchedAt,
        stale,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('check-ruptela-vehicle error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
