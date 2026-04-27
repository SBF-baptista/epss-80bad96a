import { motion } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";

interface SimulatorLoadingScreenProps {
  /** 0-100 */
  progress: number;
  /** total rows being processed (for context) */
  total?: number;
}

const STEPS = [
  { threshold: 0, label: "Lendo planilha e normalizando dados" },
  { threshold: 15, label: "Validando dispositivos compatíveis" },
  { threshold: 70, label: "Consolidando resultado da simulação" },
];

export function SimulatorLoadingScreen({ progress, total }: SimulatorLoadingScreenProps) {
  const currentStepIndex = STEPS.reduce(
    (acc, s, i) => (progress >= s.threshold ? i : acc),
    0
  );
  const currentStep = STEPS[currentStepIndex];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Processando simulação de compatibilidade"
      className="fixed inset-0 z-[60] overflow-y-auto bg-[#F5F7FA] dark:bg-[#0B1220]"
    >
      <div className="container mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Skeleton: header */}
        <div className="space-y-2">
          <Shimmer className="h-7 w-56 rounded-md" />
          <Shimmer className="h-3 w-72 rounded-md" />
        </div>

        {/* Skeleton: KPIs (mirror result page grid) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`rounded-lg border bg-white dark:bg-slate-900/40 p-3 sm:p-6 space-y-2 ${
                i === 1
                  ? "border-[rgba(34,197,94,0.3)] shadow-[0_4px_14px_rgba(34,197,94,0.10)]"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <Shimmer className="h-7 sm:h-8 w-12 rounded-md" />
              <Shimmer className="h-3 w-20 rounded-md" />
            </div>
          ))}
        </div>

        {/* Skeleton: tabs strip */}
        <div className="flex gap-2">
          {[60, 80, 90].map((w, i) => (
            <Shimmer key={i} className="h-8 rounded-md" style={{ width: w }} />
          ))}
        </div>

        {/* Skeleton: result cards */}
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden"
            >
              <div className="bg-slate-100/70 dark:bg-slate-800/40 px-3 sm:px-6 py-3 flex items-center gap-3">
                <Shimmer className="h-5 w-5 rounded-full" />
                <Shimmer className="h-4 w-48 rounded-md" />
                <div className="ml-auto">
                  <Shimmer className="h-6 w-24 rounded-full" />
                </div>
              </div>
              <div className="p-3 sm:p-6 space-y-3">
                <Shimmer className="h-3 w-24 rounded-md" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Shimmer className="h-14 rounded-lg" />
                  <Shimmer className="h-14 rounded-lg" />
                  <Shimmer className="h-14 rounded-lg" />
                </div>
                <Shimmer className="h-20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Centered floating message card — keeps skeleton visible behind */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 flex items-center justify-center pointer-events-none px-4"
      >
        <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)] p-6 sm:p-7 space-y-5">
          {/* Custom minimal spinner with brand blue */}
          <div className="flex items-center justify-center">
            <div className="relative h-14 w-14 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-pulse" />
              <Loader2 className="h-9 w-9 animate-spin text-[#2563EB]" strokeWidth={2.25} />
            </div>
          </div>

          <div className="text-center space-y-1.5">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
              Processando simulação de compatibilidade…
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Isso pode levar alguns segundos
              {total ? ` · ${total} ${total === 1 ? "veículo" : "veículos"}` : ""}
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#2563EB]"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(2, Math.min(100, progress))}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>
                Etapa {currentStepIndex + 1} de {STEPS.length}
              </span>
              <span className="tabular-nums font-medium">{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Step list */}
          <ul className="space-y-2">
            {STEPS.map((step, i) => {
              const done = i < currentStepIndex;
              const active = i === currentStepIndex;
              return (
                <li
                  key={step.label}
                  className={`flex items-center gap-2.5 text-xs sm:text-sm transition-colors ${
                    done
                      ? "text-slate-700 dark:text-slate-300"
                      : active
                      ? "text-slate-900 dark:text-slate-100 font-medium"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#2563EB] shrink-0" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                  )}
                  <span className="truncate">{step.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </motion.div>
    </div>
  );
}

function Shimmer({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`relative overflow-hidden bg-slate-200/70 dark:bg-slate-800/60 ${className}`}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent"
        style={{ backgroundSize: "200% 100%" }}
      />
    </div>
  );
}

export default SimulatorLoadingScreen;
