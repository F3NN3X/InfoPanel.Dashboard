import { cn } from "@/lib/utils";
import { ModernChrome, type ModernChrome as ModernChromeSpec } from "./modern-chrome";
import {
  makeSurface,
  useElementSize,
  type ModernStyle,
} from "./ModernNowPlaying";

/**
 * Modern hardware widget.
 *
 * Key readings from the LibreHardwareMonitor / HWiNFO exports (temps,
 * fans, power, voltages) as a modern list: colored kind-dot, label left,
 * value right. One component, four layouts picked from the zone's
 * measured size:
 *
 * - `card`     — tall/portrait zones: two-column list, scrolls
 * - `standard` — wide zones: three-column list
 * - `compact`  — very short zones: one row of the top values
 * - `simple`   — small zones: two rows
 */

export type HardwareVariant = "card" | "standard" | "compact" | "simple";

export interface ModernHardwareRow {
  label: string;
  value: string;
  kind: "temp" | "fan" | "power" | "other";
}

export interface ModernHardwareProps {
  rows: ModernHardwareRow[];
  layout?: HardwareVariant | "auto";
  surfaceStyle?: ModernStyle;
  /** Standard chrome: custom title / icon / accent / background image. */
  chrome?: ModernChromeSpec;
  className?: string;
}

function pickVariant(
  w: number,
  h: number,
  forced: HardwareVariant | "auto"
): HardwareVariant {
  if (forced !== "auto") return forced;
  if (!w || !h) return "standard";
  if (h <= 72) return "compact";
  if (w < 300 && h < 150) return "simple";
  if (h >= w * 0.72) return "card";
  return "standard";
}

const KIND_COLOR: Record<ModernHardwareRow["kind"], string> = {
  temp: "#f87171",
  fan: "#38bdf8",
  power: "#fbbf24",
  other: "var(--wp-accent, #a1a1aa)",
};

function Row({
  row,
  small,
}: {
  row: ModernHardwareRow;
  small?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-lg",
        small ? "px-2 py-0.5" : "px-2.5 py-1.5"
      )}
      style={{ background: "rgba(128,128,140,0.1)" }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: KIND_COLOR[row.kind] }}
      />
      <span
        className={cn("min-w-0 truncate", small ? "text-[10px]" : "text-xs")}
        title={row.label}
      >
        {row.label}
      </span>
      <span
        className={cn(
          "ml-auto shrink-0 font-semibold tabular-nums",
          small ? "text-xs" : "text-sm"
        )}
      >
        {row.value}
      </span>
    </div>
  );
}

export function ModernHardware({
  rows,
  layout = "auto",
  surfaceStyle = "glass",
  chrome,
  className,
}: ModernHardwareProps) {
  const { ref, w, h } = useElementSize();
  const sv = makeSurface(surfaceStyle, null);
  const v = pickVariant(w, h, layout);

  const box = {
    background: sv.background,
    color: sv.fg,
    boxShadow: `inset 0 0 0 1px ${sv.ring}`,
  } as const;

  let body: React.ReactNode;
  if (v === "compact") {
    body = (
      <div
        className="flex h-full w-full items-center gap-2 overflow-hidden rounded-full px-4"
        style={box}
      >
        {rows.slice(0, 4).map((row) => (
          <Row key={row.label} row={row} small />
        ))}
      </div>
    );
  } else if (v === "simple") {
    body = (
      <div
        className="grid h-full w-full auto-rows-min grid-cols-1 gap-1 overflow-hidden rounded-xl p-3"
        style={box}
      >
        {rows.slice(0, 2).map((row) => (
          <Row key={row.label} row={row} small />
        ))}
      </div>
    );
  } else if (v === "card") {
    body = (
      <div
        className="grid h-full w-full auto-rows-min grid-cols-2 gap-1.5 overflow-y-auto rounded-[20px] p-4"
        style={box}
      >
        {rows.map((row) => (
          <Row key={row.label} row={row} />
        ))}
      </div>
    );
  } else {
    body = (
      <div
        className="grid h-full w-full auto-rows-min grid-cols-3 gap-1.5 overflow-y-auto rounded-xl p-4"
        style={box}
      >
        {rows.map((row) => (
          <Row key={row.label} row={row} />
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("h-full w-full", className)}>
      <ModernChrome chrome={chrome}>{body}</ModernChrome>
    </div>
  );
}
