import { cn } from "@/lib/utils";

/** ok = connected, idle = not set up or signed out, warn = waiting or not connected. */
export type StatusTone = "ok" | "idle" | "warn";

const DOT: Record<StatusTone, string> = { ok: "bg-s-green", idle: "bg-s-faint", warn: "bg-s-amber" };

/** A connection's state in its card header: a dot for the tone and the state in words (the dot is never the only cue). */
export function ConnectionStatus({ tone, children }: { tone: StatusTone; children: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-s-divider px-2.5 py-0.5 text-micro font-normal text-ui-2">
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", DOT[tone])} />
      {children}
    </span>
  );
}
