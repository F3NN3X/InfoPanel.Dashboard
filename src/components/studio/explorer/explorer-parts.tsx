import type { ReactNode } from "react";
import { Hash, Link2, List, Minus, ToggleLeft, Type, type LucideIcon } from "lucide-react";
import type { Health, PointType } from "@/lib/data-points";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<PointType, LucideIcon> = {
  number: Hash,
  text: Type,
  list: List,
  url: Link2,
  bool: ToggleLeft,
  empty: Minus,
};

export function TypeIcon({ type, className }: { type: PointType; className?: string }) {
  const Icon = TYPE_ICON[type];
  return <Icon className={cn("h-3.5 w-3.5 shrink-0 text-ui-4", className)} aria-hidden />;
}

export const HEALTH_LABEL: Record<Health, string> = {
  ok: "healthy",
  warn: "no data",
  off: "offline",
};

const HEALTH_COLOR: Record<Health, string> = {
  ok: "bg-ui-success",
  warn: "bg-ui-warning",
  off: "bg-[#5a5a63]",
};

export function StatusDot({ health, className }: { health: Health; className?: string }) {
  return (
    <span
      role="img"
      aria-label={HEALTH_LABEL[health]}
      title={HEALTH_LABEL[health]}
      className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", HEALTH_COLOR[health], className)}
    />
  );
}

/** A small bordered tag ("Temp", "number", "● Live"). */
export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded border border-ui-default bg-ui-app px-1.5 py-px font-ui text-[10.5px] text-ui-3",
        className
      )}
    >
      {children}
    </span>
  );
}

interface ToggleChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

/** A filter chip: pressed = on. */
export function ToggleChip({ active, onClick, children }: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 font-ui text-[11.5px] transition-colors",
        active
          ? "border-ui-accent/50 bg-ui-accent-soft text-ui-accent-text"
          : "border-ui-default text-ui-3 hover:bg-ui-hover hover:text-ui-1"
      )}
    >
      {children}
    </button>
  );
}

/** The sticky-header look shared by section captions. */
export const CAPTION = "font-ui text-[11px] font-medium uppercase tracking-wider text-ui-4";
