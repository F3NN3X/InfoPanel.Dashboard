import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatusTone = "ok" | "warn" | "danger" | "neutral";

const CHIP: Readonly<Record<StatusTone, string>> = {
  ok: "bg-ui-ok/12 text-ui-ok",
  warn: "bg-ui-warn/12 text-ui-warn",
  danger: "bg-ui-danger/12 text-ui-danger",
  neutral: "border border-ui-strong text-ui-2",
};

const DOT: Readonly<Record<StatusTone, string>> = {
  ok: "bg-ui-ok",
  warn: "bg-ui-warn",
  danger: "bg-ui-danger",
  neutral: "bg-ui-hint",
};

/** The status dot on its own: 6 px, and the green one only where something is live right now. */
export function StatusDot({ tone, className }: { tone: StatusTone; className?: string }) {
  return <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[tone], className)} />;
}

/** A status pill: a dot and a word (never colour alone), the status colour at 12 % behind it. */
export function StatusChip({ tone, dot = true, children, className }: { tone: StatusTone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-caption font-medium", CHIP[tone], className)}>
      {dot && <StatusDot tone={tone} />}
      {children}
    </span>
  );
}
