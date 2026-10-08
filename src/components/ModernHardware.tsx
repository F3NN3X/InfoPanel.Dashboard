import { cn } from "@/lib/utils";
import { ArcGauge, tempColor, tempWord } from "@/lib/gauge";
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
  /** Numeric temp (°C) when the reading is a temperature. */
  temp?: number;
  /** Numeric fan speed (RPM) when the reading is a fan. */
  fan?: number;
}

export interface ModernHardwareProps {
  rows: ModernHardwareRow[];
  /** Render the top temperatures as arc gauges (the "temps" view). */
  gauges?: boolean;
  /** Show a row of fan readings under the temp gauges. */
  showFans?: boolean;
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

/**
 * The "temps" view — the top temperature readings as 270° arc gauges
 * (colored by threshold) with a fan-reading chip row underneath.
 */
function TempsGrid({
  temps,
  fans,
  size,
  showFans,
  box,
  muted,
}: {
  temps: ModernHardwareRow[];
  fans: ModernHardwareRow[];
  size: number;
  showFans: boolean;
  box: React.CSSProperties;
  muted: string;
}) {
  return (
    <div
      className="flex h-full w-full flex-col justify-center gap-3 overflow-hidden rounded-[20px] p-4"
      style={box}
    >
      <div className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-3">
        {temps.map((r) => (
          <div key={r.label} className="flex flex-col items-center gap-1">
            <ArcGauge
              value={r.temp ?? 0}
              max={100}
              size={size}
              stroke={size * 0.11}
              color={tempColor(r.temp ?? 0)}
              display={`${Math.round(r.temp ?? 0)}°`}
              sublabel={tempWord(r.temp ?? 0)}
            />
            <div
              className="max-w-[96px] truncate text-[11px]"
              title={r.label}
              style={{ color: muted }}
            >
              {r.label}
            </div>
          </div>
        ))}
      </div>
      {showFans && fans.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {fans.map((r) => (
            <div
              key={r.label}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
              style={{ background: "rgba(128,128,140,0.14)" }}
              title={r.label}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: KIND_COLOR.fan }}
              />
              <span className="max-w-[120px] truncate" style={{ color: muted }}>
                {r.label}
              </span>
              <span className="font-semibold tabular-nums">{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ModernHardware({
  rows,
  gauges = false,
  showFans = true,
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

  // The "temps" view overrides the list with arc gauges (when any temp
  // reading exists; otherwise fall back to the list above).
  if (gauges) {
    const temps = rows
      .filter((r) => r.temp !== undefined)
      .sort((a, b) => (b.temp ?? 0) - (a.temp ?? 0))
      .slice(0, 4);
    const fans = rows.filter((r) => r.fan !== undefined).slice(0, 4);
    if (temps.length > 0) {
      const size = Math.min(96, Math.max(44, h * 0.24));
      body = (
        <TempsGrid temps={temps} fans={fans} size={size} showFans={showFans} box={box} muted={sv.muted} />
      );
    }
  }

  return (
    <div ref={ref} className={cn("h-full w-full", className)}>
      <ModernChrome chrome={chrome}>{body}</ModernChrome>
    </div>
  );
}
