import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

/**
 * Loading System
 * --------------
 * A) PageLoader      — full-page skeleton (replicates app layout)
 * B) SectionLoader   — overlay with blur over a container, keeps content visible
 * C) InlineSpinner   — small spinner for buttons/actions
 *
 * Skeleton: <Skeleton /> (shimmer block with rounded-md)
 *
 * Timing rules (use useDelayedLoading):
 *  - <300ms   : do not show loader (avoid flicker)
 *  - 300–800ms: skeleton only
 *  - >800ms   : skeleton + contextual message
 */

// ────────────────────────────────────────────────────────────────────────────
// Hook: useDelayedLoading
// ────────────────────────────────────────────────────────────────────────────
export function useDelayedLoading(isLoading: boolean) {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowSkeleton(false);
      setShowMessage(false);
      return;
    }
    const skeletonTimer = setTimeout(() => setShowSkeleton(true), 300);
    const messageTimer = setTimeout(() => setShowMessage(true), 800);
    return () => {
      clearTimeout(skeletonTimer);
      clearTimeout(messageTimer);
    };
  }, [isLoading]);

  return { showSkeleton, showMessage };
}

// ────────────────────────────────────────────────────────────────────────────
// Skeleton primitive (shimmer)
// ────────────────────────────────────────────────────────────────────────────
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-shimmer h-4 w-full", className)}
      {...props}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────
// A) PageLoader — full screen skeleton
// ────────────────────────────────────────────────────────────────────────────
interface PageLoaderProps {
  message?: string;
  variant?: "dashboard" | "list" | "form" | "minimal";
  className?: string;
}

export function PageLoader({
  message = "Carregando dados...",
  variant = "dashboard",
  className,
}: PageLoaderProps) {
  if (variant === "minimal") {
    return (
      <div className={cn("min-h-[60vh] flex flex-col items-center justify-center gap-4 p-6 animate-fade-in", className)}>
        <div className="w-full max-w-sm space-y-3">
          <Skeleton className="h-6 w-1/2 mx-auto" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-2/3 mx-auto" />
        </div>
        <p className="text-sm text-muted-foreground mt-2">{message}</p>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("p-4 md:p-6 space-y-5 animate-fade-in", className)}>
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground pt-2">{message}</p>
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className={cn("p-4 md:p-6 max-w-2xl mx-auto space-y-6 animate-fade-in", className)}>
        <Skeleton className="h-8 w-1/3" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
        <p className="text-center text-xs text-muted-foreground">{message}</p>
      </div>
    );
  }

  // dashboard (default)
  return (
    <div className={cn("p-4 md:p-6 space-y-5 animate-fade-in", className)}>
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <p className="text-center text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// FullScreenLoader — for auth/route guards (no layout yet)
// ────────────────────────────────────────────────────────────────────────────
export function FullScreenLoader({
  message = "Carregando...",
}: {
  message?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background animate-fade-in">
      <div className="flex flex-col items-center gap-4 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-center text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// B) SectionLoader — overlay over a container
// ────────────────────────────────────────────────────────────────────────────
interface SectionLoaderProps {
  message?: string;
  show?: boolean;
}

export function SectionLoader({
  message,
  show = true,
}: SectionLoaderProps) {
  if (!show) return null;
  return (
    <div className="section-loading-overlay">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-card/95 border border-border rounded-lg shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        {message && (
          <span className="text-sm text-foreground font-medium">{message}</span>
        )}
      </div>
    </div>
  );
}

// SectionSkeleton — when there's no prior content to overlay
export function SectionSkeleton({
  rows = 4,
  message,
  className,
}: {
  rows?: number;
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3 p-4 animate-fade-in", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 rounded-lg" />
      ))}
      {message && (
        <p className="text-center text-xs text-muted-foreground pt-2">{message}</p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// C) InlineSpinner — small spinner for buttons/actions
// ────────────────────────────────────────────────────────────────────────────
export function InlineSpinner({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "xs" | "sm" | "md";
}) {
  const sizes = { xs: "h-3 w-3", sm: "h-4 w-4", md: "h-5 w-5" };
  return (
    <Loader2
      className={cn("animate-spin", sizes[size], className)}
    />
  );
}
