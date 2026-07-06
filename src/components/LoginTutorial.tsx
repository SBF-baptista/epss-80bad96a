import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Mail,
  KeyRound,
  UserPlus,
  Lock,
  ShieldCheck,
  PartyPopper,
  ArrowLeft,
  ArrowRight,
  X,
  HelpCircle,
  Info,
  MousePointer2,
} from "lucide-react";

type Placement = "top" | "bottom" | "left" | "right" | "center";

interface Step {
  id: string;
  target?: string; // CSS selector; undefined = centered modal
  title: string;
  body: React.ReactNode;
  icon: React.ElementType;
  accent: "primary" | "warning" | "success" | "info";
  placement?: Placement;
}

const STEPS: Step[] = [
  {
    id: "welcome",
    title: "Bem-vindo! Vamos fazer seu primeiro acesso",
    body: (
      <>
        Este é um guia rápido de <strong>4 passos</strong> para você criar sua
        senha e entrar na plataforma pela primeira vez. Você pode pular a
        qualquer momento.
      </>
    ),
    icon: Sparkles,
    accent: "primary",
    placement: "center",
  },
  {
    id: "email",
    target: '[data-tutorial="email"]',
    title: "1. Digite seu e-mail corporativo",
    body: (
      <>
        Use exatamente o e-mail que o <strong>administrador</strong> cadastrou
        para você. É por ele que o sistema vai reconhecer sua conta e liberar a
        criação da senha.
      </>
    ),
    icon: Mail,
    accent: "primary",
    placement: "right",
  },
  {
    id: "first-access",
    target: '[data-tutorial="first-access"]',
    title: "2. Clique em “Primeiro acesso”",
    body: (
      <>
        Com o e-mail preenchido, clique neste botão. O sistema vai identificar
        sua conta e abrir automaticamente a tela para você{" "}
        <strong>cadastrar a sua senha</strong>.
      </>
    ),
    icon: UserPlus,
    accent: "warning",
    placement: "top",
  },
  {
    id: "password-setup",
    target: '[data-tutorial="password"]',
    title: "3. Cadastre sua senha",
    body: (
      <>
        Na próxima tela, crie uma senha que atenda a estas regras:
        <ul className="mt-2 space-y-1 text-xs">
          <li className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-primary" /> Mínimo de 8 caracteres
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-primary" /> Ao menos 1 letra maiúscula
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-primary" /> Ao menos 1 número
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-primary" /> Ao menos 1 caractere especial (!@#$%)
          </li>
        </ul>
        Confirme a senha e clique em <strong>“Cadastrar senha”</strong>.
      </>
    ),
    icon: KeyRound,
    accent: "warning",
    placement: "right",
  },
  {
    id: "done",
    title: "4. Pronto! Você já pode entrar",
    body: (
      <>
        Depois de cadastrar a senha, você volta para esta tela e entra
        normalmente com <strong>e-mail + senha</strong>. Se um dia esquecer,
        use o link <strong>“Esqueci minha senha”</strong> logo abaixo do
        formulário.
      </>
    ),
    icon: PartyPopper,
    accent: "success",
    placement: "center",
  },
];

const ACCENT: Record<Step["accent"], { bg: string; text: string; ring: string; dot: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/40", dot: "bg-primary" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/40", dot: "bg-amber-500" },
  success: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/40", dot: "bg-emerald-500" },
  info: { bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", ring: "ring-sky-500/40", dot: "bg-sky-500" },
};

const STORAGE_KEY = "opm_login_tutorial_v1_seen";
const CARD_W = 340;
const CARD_H_ESTIMATE = 220;
const GAP = 16;

function computePosition(
  rect: DOMRect | null,
  placement: Placement = "bottom",
  vw: number,
  vh: number,
): { top: number; left: number; arrow: Placement } {
  if (!rect || placement === "center") {
    return {
      top: Math.max(24, vh / 2 - CARD_H_ESTIMATE / 2),
      left: Math.max(24, vw / 2 - CARD_W / 2),
      arrow: "center",
    };
  }

  // Try requested placement first, then fall back based on available space.
  const candidates: Placement[] = [placement, "bottom", "top", "right", "left"];
  for (const p of candidates) {
    if (p === "bottom") {
      const top = rect.bottom + GAP;
      const left = Math.min(Math.max(16, rect.left + rect.width / 2 - CARD_W / 2), vw - CARD_W - 16);
      if (top + CARD_H_ESTIMATE < vh - 16) return { top, left, arrow: "top" };
    }
    if (p === "top") {
      const top = rect.top - GAP - CARD_H_ESTIMATE;
      const left = Math.min(Math.max(16, rect.left + rect.width / 2 - CARD_W / 2), vw - CARD_W - 16);
      if (top > 16) return { top, left, arrow: "bottom" };
    }
    if (p === "right") {
      const left = rect.right + GAP;
      const top = Math.min(Math.max(16, rect.top + rect.height / 2 - CARD_H_ESTIMATE / 2), vh - CARD_H_ESTIMATE - 16);
      if (left + CARD_W < vw - 16) return { top, left, arrow: "left" };
    }
    if (p === "left") {
      const left = rect.left - GAP - CARD_W;
      const top = Math.min(Math.max(16, rect.top + rect.height / 2 - CARD_H_ESTIMATE / 2), vh - CARD_H_ESTIMATE - 16);
      if (left > 16) return { top, left, arrow: "right" };
    }
  }

  return {
    top: Math.max(16, vh / 2 - CARD_H_ESTIMATE / 2),
    left: Math.max(16, vw / 2 - CARD_W / 2),
    arrow: "center",
  };
}

export function LoginTutorial() {
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  const step = STEPS[stepIdx];
  const accent = ACCENT[step.accent];
  const isLast = stepIdx === STEPS.length - 1;
  const isFirst = stepIdx === 0;

  // Auto-open once per browser
  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        const t = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch { /* ignore */ }
  }, []);

  const measure = useCallback(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight });
    if (!step.target) { setRect(null); return; }
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      // Wait a frame so scroll settles before measuring.
      requestAnimationFrame(() => setRect(el.getBoundingClientRect()));
    } else {
      setRect(null);
    }
  }, [step]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, measure]);

  // Keyboard controls
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stepIdx]);

  const close = () => {
    setOpen(false);
    setStepIdx(0);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
  };
  const start = () => { setStepIdx(0); setOpen(true); };
  const next = () => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  const prev = () => setStepIdx((i) => Math.max(0, i - 1));

  const pos = computePosition(rect, step.placement, viewport.w || 1200, viewport.h || 800);
  const spotlightPad = 8;

  const overlay = open ? (
    <AnimatePresence mode="wait">
      <motion.div
        key="tutorial-root"
        className="fixed inset-0 z-[100]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Backdrop with spotlight cutout via massive box-shadow */}
        <div
          className="absolute inset-0"
          onClick={close}
        >
          {rect ? (
            <motion.div
              key={step.id + "-spot"}
              layout
              initial={false}
              animate={{
                top: rect.top - spotlightPad,
                left: rect.left - spotlightPad,
                width: rect.width + spotlightPad * 2,
                height: rect.height + spotlightPad * 2,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="absolute rounded-xl ring-2 ring-primary/70"
              style={{
                boxShadow:
                  "0 0 0 9999px hsl(var(--background) / 0.72), 0 0 40px 4px hsl(var(--primary) / 0.45)",
              }}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: "hsl(var(--background) / 0.72)" }}
            />
          )}
        </div>

        {/* Animated click indicator pointing to the target */}
        {rect && (
          <motion.div
            key={step.id + "-pointer"}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: "spring", stiffness: 240, damping: 20 }}
            className="pointer-events-none absolute z-[110]"
            style={{
              top: rect.top + rect.height / 2 - 6,
              left: rect.left + rect.width / 2 - 6,
            }}
          >
            {/* Pulsing ripple rings emanating from click point */}
            <span className="absolute -inset-3 flex items-center justify-center">
              <motion.span
                className="absolute h-8 w-8 rounded-full bg-primary/30"
                animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.span
                className="absolute h-8 w-8 rounded-full bg-primary/30"
                animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", delay: 0.7 }}
              />
              <span className="relative h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
            </span>

            {/* Animated cursor arrow tapping the target */}
            <motion.div
              className="absolute"
              style={{ top: 10, left: 10 }}
              animate={{ x: [0, -6, 0], y: [0, -6, 0], scale: [1, 0.88, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="relative">
                <MousePointer2
                  className="h-7 w-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
                  strokeWidth={1.5}
                  fill="hsl(var(--primary))"
                />
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg">
                  Clique aqui
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Floating card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="absolute"
            style={{ top: pos.top, left: pos.left, width: CARD_W }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`relative rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/20 ring-1 ${accent.ring}`}>
              {/* Arrow */}
              {pos.arrow !== "center" && (
                <div
                  className="absolute h-3 w-3 rotate-45 border border-border/60 bg-card"
                  style={{
                    ...(pos.arrow === "top" && { top: -6, left: "50%", transform: "translateX(-50%) rotate(45deg)", borderRight: "none", borderBottom: "none" }),
                    ...(pos.arrow === "bottom" && { bottom: -6, left: "50%", transform: "translateX(-50%) rotate(45deg)", borderLeft: "none", borderTop: "none" }),
                    ...(pos.arrow === "left" && { left: -6, top: "50%", transform: "translateY(-50%) rotate(45deg)", borderRight: "none", borderTop: "none" }),
                    ...(pos.arrow === "right" && { right: -6, top: "50%", transform: "translateY(-50%) rotate(45deg)", borderLeft: "none", borderBottom: "none" }),
                  }}
                />
              )}

              {/* Header */}
              <div className="flex items-start justify-between gap-3 p-4 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent.bg}`}>
                    <step.icon className={`h-4.5 w-4.5 ${accent.text}`} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Passo {stepIdx + 1} de {STEPS.length}
                    </p>
                    <h3 className="text-sm font-bold text-foreground leading-tight">
                      {step.title}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={close}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Fechar tutorial"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed">
                {step.body}
              </div>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5 pb-3">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStepIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === stepIdx
                        ? `w-6 ${accent.dot}`
                        : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                    aria-label={`Ir para passo ${i + 1}`}
                  />
                ))}
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between gap-2 border-t border-border/60 p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={close}
                  className="text-xs text-muted-foreground hover:text-foreground h-8"
                >
                  Pular
                </Button>
                <div className="flex items-center gap-2">
                  {!isFirst && (
                    <Button variant="outline" size="sm" onClick={prev} className="h-8 gap-1">
                      <ArrowLeft className="h-3.5 w-3.5" /> Anterior
                    </Button>
                  )}
                  {!isLast ? (
                    <Button size="sm" onClick={next} className="h-8 gap-1">
                      Próximo <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button size="sm" onClick={close} className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-600/90 text-white">
                      Concluir <PartyPopper className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  ) : null;

  return (
    <>
      {/* Trigger button below login card */}
      <div className="mt-4 flex items-center justify-center">
        <button
          type="button"
          onClick={start}
          className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-foreground hover:shadow-md"
        >
          <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
            <HelpCircle className="h-3 w-3 text-primary" />
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          </span>
          Ver tutorial guiado de primeiro acesso
          <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
        </button>
      </div>

      {/* Small helper hint (persistent) */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60">
        <Info className="h-3 w-3" />
        <span>Primeira vez aqui? O tutorial abre automaticamente.</span>
      </div>

      {typeof document !== "undefined" && createPortal(overlay, document.body)}
    </>
  );
}
