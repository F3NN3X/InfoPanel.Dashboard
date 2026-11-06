import { InheritDot } from "@/components/ui/setting-row";
import { cn } from "@/lib/utils";
import { TEXT_MIN, type RoleRow } from "./theme-contrast";

interface ColourRolesProps {
  rows: readonly RoleRow[];
  /** What the unset dots follow ("Field Kit"). */
  from: string;
  /** Whether the level holds a value of its own for one of a row's keys. */
  isSet: (keys: readonly string[]) => boolean;
  onReset: (keys: readonly string[]) => void;
  /** "Field Kit's cards": what the ratios are against. */
  against: string;
}

/** The Colours section's roles: a dot, the colour, and its contrast on the theme's cards, so a low one shows as the colour is picked. */
export function ColourRoles({ rows, from, isSet, onReset, against }: ColourRolesProps) {
  return (
    <div aria-label="Colour roles" role="group" className="flex flex-col px-5 pb-1">
      {rows.map((r) => (
        <div key={r.id} className="flex min-h-9 items-center gap-2" data-role={r.id}>
          <InheritDot from={from} set={isSet(r.keys)} onReset={() => onReset(r.keys)} />
          <span className="min-w-0 flex-1 truncate text-body text-ui-2">{r.label}</span>
          <span className="flex items-center gap-1">
            {r.swatches.map((c, i) => (
              <span key={i} aria-hidden className="h-4 w-4 rounded-ui-sm border border-ui-strong" style={{ background: c }} />
            ))}
          </span>
          <span className={cn("w-12 text-right font-ui-mono text-caption", r.ratio && Number.parseFloat(r.ratio) < (r.id === "status" ? 3 : TEXT_MIN) ? "text-ui-warn" : "text-ui-2")}>{r.id === "series" ? "graphs" : r.ratio}</span>
        </div>
      ))}
      <p className="pt-1 text-caption text-ui-3">Contrast against {against}. Text needs {TEXT_MIN}:1, large numbers 3:1</p>
    </div>
  );
}
