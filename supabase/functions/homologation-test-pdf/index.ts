import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "npm:pdf-lib@1.17.1";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PHOTO_LABELS: Record<string, string> = {
  chassi: "Chassi",
  veiculo: "Veículo",
  can_location: "Local da CAN",
  can_wires: "Fios da CAN",
  rastreador: "Rastreador",
  positivo: "Positivo",
  negativo: "Negativo",
  pos_chave: "Pós-chave",
  bloqueio: "Bloqueio",
  installation: "Instalação",
  outros: "Outros",
};
const ALL_TYPES = Object.keys(PHOTO_LABELS);

interface Template {
  title: string;
  photoOrder: string[];
  highlight: string;
}

// One template per tracker model. Add a new entry to support another tracker.
const TEMPLATES: Record<string, Template> = {
  FMC150: {
    title: "Relatório de Homologação - Telemetria (FMC150)",
    photoOrder: ["can_location", "can_wires", "rastreador", "chassi", "veiculo", "positivo", "negativo", "pos_chave", "bloqueio", "installation", "outros"],
    highlight: "Foco em leitura CAN: local e fios da conexão.",
  },
  FMC130: {
    title: "Relatório de Homologação - Rastreamento (FMC130)",
    photoOrder: ["positivo", "negativo", "pos_chave", "bloqueio", "rastreador", "chassi", "veiculo", "installation", "outros"],
    highlight: "Foco em alimentação, pós-chave e bloqueio.",
  },
  default: {
    title: "Relatório de Homologação",
    photoOrder: ALL_TYPES,
    highlight: "",
  },
};

const pickTemplate = (tracker: string | null) => {
  if (!tracker) return TEMPLATES.default;
  const key = Object.keys(TEMPLATES).find((k) => k !== "default" && tracker.toUpperCase().includes(k));
  return key ? TEMPLATES[key] : { ...TEMPLATES.default, title: `Relatório de Homologação (${tracker})` };
};

const Params = z.object({
  homologation_id: z.string().uuid().optional(),
  marca: z.string().trim().min(1).max(100).optional(),
  modelo: z.string().trim().min(1).max(150).optional(),
  ano: z.coerce.number().int().min(1950).max(2100).optional(),
  rastreador: z.string().trim().min(1).max(100).optional(),
  formato: z.enum(["pdf", "json"]).optional(),
}).refine((p) => p.homologation_id || (p.marca && p.modelo), {
  message: "Informe homologation_id ou marca + modelo",
});

// Strip characters the standard PDF font cannot encode.
const safe = (s: unknown) =>
  String(s ?? "-").replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "").replace(/\s+/g, " ") || "-";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Auth: x-api-key or logged-in user
    const apiKey = req.headers.get("x-api-key");
    const expected = Deno.env.get("HOMOLOGATION_PDF_API_KEY") ?? Deno.env.get("OPM_API_KEY");
    let authorized = !!(apiKey && expected && apiKey === expected);
    if (!authorized) {
      const token = req.headers.get("Authorization")?.replace("Bearer ", "");
      if (token) {
        const { data } = await supabase.auth.getUser(token);
        authorized = !!data?.user;
      }
    }
    if (!authorized) return json({ error: "Não autorizado" }, 401);

    let raw: Record<string, unknown> = Object.fromEntries(new URL(req.url).searchParams);
    if (req.method === "POST") {
      try { raw = { ...raw, ...(await req.json()) }; } catch { /* no body */ }
    }
    const parsed = Params.safeParse(raw);
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const p = parsed.data;

    // Find card
    let q = supabase.from("homologation_cards").select("*").is("deleted_at", null);
    if (p.homologation_id) q = q.eq("id", p.homologation_id);
    else {
      q = q.ilike("brand", p.marca!).ilike("model", p.modelo!);
      if (p.ano) q = q.eq("year", p.ano);
    }
    const { data: cards, error: cardErr } = await q.order("updated_at", { ascending: false }).limit(1);
    if (cardErr) return json({ error: cardErr.message });
    const card = cards?.[0];
    if (!card) return json({ error: "Homologação não encontrada" });

    // Tracker model: param, or from configuration rule
    let tracker = p.rastreador ?? null;
    if (!tracker && card.configuration) {
      const { data: rule } = await supabase
        .from("automation_rules_extended")
        .select("tracker_model")
        .eq("configuration", card.configuration)
        .limit(1)
        .maybeSingle();
      tracker = rule?.tracker_model ?? null;
    }
    const template = pickTemplate(tracker);

    const { data: photos } = await supabase
      .from("homologation_photos")
      .select("id, file_name, file_path, content_type, photo_type, created_at")
      .eq("homologation_card_id", card.id)
      .order("created_at", { ascending: true });

    const withUrls = (photos ?? []).map((ph) => ({
      ...ph,
      photo_type: ph.photo_type && PHOTO_LABELS[ph.photo_type] ? ph.photo_type : "outros",
      url: supabase.storage.from("homologation-photos").getPublicUrl(ph.file_path).data.publicUrl,
    }));

    if (p.formato === "json") {
      return json({
        homologation_id: card.id,
        marca: card.brand, modelo: card.model, ano: card.year,
        configuracao: card.configuration, rastreador: tracker,
        fotos: withUrls.map((f) => ({ tipo: f.photo_type, rotulo: PHOTO_LABELS[f.photo_type], arquivo: f.file_name, url: f.url })),
      });
    }

    // ---- Build PDF ----
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const W = 595, H = 842, M = 40;
    const navy = rgb(0.06, 0.15, 0.32);
    const gray = rgb(0.35, 0.35, 0.4);

    let page: PDFPage = pdf.addPage([W, H]);
    let y = H - M;
    const newPage = () => { page = pdf.addPage([W, H]); y = H - M; };
    const ensure = (h: number) => { if (y - h < M) newPage(); };
    const text = (t: string, size = 10, f: PDFFont = font, color = rgb(0, 0, 0)) => {
      // simple word wrap
      const words = safe(t).split(" ");
      let line = "";
      const lines: string[] = [];
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (f.widthOfTextAtSize(test, size) > W - 2 * M) { lines.push(line); line = w; } else line = test;
      }
      if (line) lines.push(line);
      for (const l of lines) { ensure(size + 4); page.drawText(l, { x: M, y: y - size, size, font: f, color }); y -= size + 4; }
    };

    // Header
    page.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: navy });
    page.drawText(safe(template.title), { x: M, y: H - 42, size: 15, font: bold, color: rgb(1, 1, 1) });
    page.drawText(safe(`Gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`), { x: M, y: H - 60, size: 9, font, color: rgb(0.85, 0.88, 0.95) });
    y = H - 95;

    text("Dados do veículo e teste", 12, bold, navy); y -= 4;
    const rows: [string, unknown][] = [
      ["Marca", card.brand], ["Modelo", card.model], ["Ano", card.year],
      ["Chassi", card.chassis_info], ["Ano de fabricação", card.manufacture_year],
      ["Configuração", card.configuration], ["Modelo do rastreador", tracker],
      ["Técnico", card.test_technician], ["Local do teste", card.test_location],
      ["Data do teste", card.test_scheduled_date ? new Date(card.test_scheduled_date).toLocaleDateString("pt-BR") : null],
      ["Conexão elétrica", card.electrical_connection_type],
    ];
    for (const [k, v] of rows) {
      ensure(14);
      page.drawText(safe(k + ":"), { x: M, y: y - 10, size: 10, font: bold, color: gray });
      page.drawText(safe(v), { x: M + 130, y: y - 10, size: 10, font });
      y -= 15;
    }
    if (template.highlight) { y -= 4; text(template.highlight, 9, font, gray); }

    y -= 8;
    text("Checklist do teste", 12, bold, navy);
    const checklist = Array.isArray(card.test_checklist) ? card.test_checklist : [];
    if (!checklist.length) text("Sem checklist registrado.", 10, font, gray);
    for (const item of checklist) {
      text(`${item?.completed ? "[OK]" : "[  ]"} ${item?.label ?? item?.id ?? ""}`, 10);
    }
    y -= 6;
    text("Observações técnicas", 12, bold, navy);
    text(card.technical_observations || "Sem observações.", 10, font, card.technical_observations ? rgb(0, 0, 0) : gray);

    // Photos by template order
    const byType = new Map<string, typeof withUrls>();
    for (const f of withUrls) byType.set(f.photo_type, [...(byType.get(f.photo_type) ?? []), f]);
    const order = [...template.photoOrder, ...ALL_TYPES.filter((t) => !template.photoOrder.includes(t))];

    if (!withUrls.length) { y -= 10; text("Nenhuma foto registrada na execução de teste.", 10, font, gray); }

    for (const type of order) {
      const list = byType.get(type);
      if (!list?.length) continue;
      for (const f of list) {
        let img;
        try {
          const res = await fetch(f.url);
          if (res.ok) {
            const bytes = new Uint8Array(await res.arrayBuffer());
            const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
            const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8;
            img = isPng ? await pdf.embedPng(bytes) : isJpg ? await pdf.embedJpg(bytes) : undefined;
          }
        } catch (e) { console.error("photo fetch failed", f.file_path, e); }

        const maxW = W - 2 * M, maxH = 330;
        const dims = img ? img.scale(Math.min(maxW / img.width, maxH / img.height, 1)) : null;
        ensure((dims?.height ?? 30) + 40);
        y -= 10;
        text(`${PHOTO_LABELS[type]} - ${f.file_name}`, 11, bold, navy);
        if (img && dims) {
          page.drawImage(img, { x: M + (maxW - dims.width) / 2, y: y - dims.height, width: dims.width, height: dims.height });
          y -= dims.height + 6;
        } else {
          text(`Formato não suportado no PDF. Link: ${f.url}`, 8, font, gray);
        }
      }
    }

    const bytes = await pdf.save();
    const fname = `homologacao_${card.brand}_${card.model}_${card.year ?? ""}_${tracker ?? "padrao"}`
      .replace(/[^A-Za-z0-9_-]+/g, "_") + ".pdf";
    return new Response(bytes, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${fname}"` },
    });
  } catch (e) {
    console.error("homologation-test-pdf error", e);
    return json({ error: e instanceof Error ? e.message : "Erro interno" });
  }
});
