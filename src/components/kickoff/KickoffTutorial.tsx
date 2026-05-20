import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, X, Sparkles, GraduationCap } from "lucide-react";

export interface TutorialStep {
  target: string; // CSS selector — pass null/empty for centered welcome
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
}

interface KickoffTutorialProps {
  open: boolean;
  steps: TutorialStep[];
  onClose: () => void;
  storageKey?: string;
}

const PADDING = 8;
const TOOLTIP_W = 360;
const TOOLTIP_GAP = 16;

export function KickoffTutorial({ open, steps, onClose, storageKey }: KickoffTutorialProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[index];

  // Measure target
  useLayoutEffect(() => {
    if (!open || !step) return;
    const measure = () => {
      if (!step.target || step.placement === "center") {
        setRect(null);
        return;
      }
      const el = document.querySelector(step.target) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // small delay so scroll settles before measuring
      requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        setRect(r);
      });
    };
    measure();
    const id = window.setTimeout(measure, 350);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) setIndex(0);
  }, [open]);

  if (!open || !step) return null;

  const finish = () => {
    if (storageKey) localStorage.setItem(storageKey, "1");
    onClose();
  };

  const next = () => (index === steps.length - 1 ? finish() : setIndex(index + 1));
  const prev = () => setIndex(Math.max(0, index - 1));

  // Compute tooltip position
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let tipStyle: React.CSSProperties = {
    position: "fixed",
    width: Math.min(TOOLTIP_W, vw - 32),
    zIndex: 10000,
  };
  const isCenter = !rect || step.placement === "center";

  if (isCenter) {
    tipStyle = { ...tipStyle, top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else if (rect) {
    const placement: TutorialStep["placement"] =
      step.placement ||
      (rect.bottom + 180 < vh ? "bottom" : rect.top > 200 ? "top" : "bottom");
    let top = 0;
    let left = Math.min(
      Math.max(16, rect.left + rect.width / 2 - TOOLTIP_W / 2),
      vw - TOOLTIP_W - 16
    );
    if (placement === "bottom") top = rect.bottom + TOOLTIP_GAP;
    else if (placement === "top") top = Math.max(16, rect.top - TOOLTIP_GAP - 180);
    else if (placement === "right") {
      top = Math.max(16, rect.top);
      left = Math.min(rect.right + TOOLTIP_GAP, vw - TOOLTIP_W - 16);
    } else if (placement === "left") {
      top = Math.max(16, rect.top);
      left = Math.max(16, rect.left - TOOLTIP_GAP - TOOLTIP_W);
    }
    tipStyle = { ...tipStyle, top, left };
  }

  const spotlight = rect
    ? {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Backdrop with spotlight via SVG mask */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={finish}>
        <defs>
          <mask id="kickoff-tutorial-mask">
            <rect width="100%" height="100%" fill="white" />
            {spotlight && (
              <rect
                x={spotlight.left}
                y={spotlight.top}
                width={spotlight.width}
                height={spotlight.height}
                rx={12}
                ry={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(2, 6, 23, 0.72)"
          mask="url(#kickoff-tutorial-mask)"
        />
      </svg>

      {/* Highlighted ring */}
      {spotlight && (
        <motion.div
          layout
          initial={false}
          animate={spotlight}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          className="absolute rounded-xl ring-2 ring-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.25)] pointer-events-none"
          style={{ position: "fixed" }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          style={tipStyle}
          className="pointer-events-auto bg-card border border-border rounded-xl shadow-2xl p-5"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Passo {index + 1} de {steps.length}
              </span>
            </div>
            <button
              onClick={finish}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar tutorial"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h3 className="text-base font-semibold text-foreground mb-1.5">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {step.description}
          </p>

          {/* Progress bar */}
          <div className="flex gap-1 mb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= index ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={finish} className="text-muted-foreground">
              Pular
            </Button>
            <div className="flex items-center gap-2">
              {index > 0 && (
                <Button variant="outline" size="sm" onClick={prev}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Voltar
                </Button>
              )}
              <Button size="sm" onClick={next}>
                {index === steps.length - 1 ? (
                  <>
                    <GraduationCap className="h-3.5 w-3.5 mr-1" />
                    Concluir
                  </>
                ) : (
                  <>
                    Próximo
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}
