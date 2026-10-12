import { cn } from "@/lib/utils";
import { ArcGauge, tempColor, tempWord } from "@/lib/gauge";
import { ModernChrome, type ModernChrome as ModernChromeSpec } from "./modern-chrome";
import { makeSurface, type ModernStyle } from "./surfaces";
import { useElementSize } from "@/hooks/use-element-size";
import { byShape, flow, strokeOf, surfaceBox, ws } from "./widget-style";

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
 *
 * The standard style options apply through `ModernChrome` and the
 * `widget-style` helpers: it scales with the zone (designed for about
 * 560×220 wide, 300×420 tall), and alignment, spacing, value weight and
 * gauge thickness follow the user's choices.
 */

/**
 * The zone size each shape of the layout is designed for: the wide
 * three-column list reads well at about 560×220; the two-column card at
 * 300×420.
 */
const DESIGN = byShape({
  wide: { w: 560, h: 220 },
  tall: { w: 300, h: 420 },
  square: { w: 380, h: 300 },
});

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
  /** Dot color per reading kind ("" = the default). */
  kindColors?: Partial<Record<ModernHardwareRow["kind"], string>>;
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
  colors,
}: {
  row: ModernHardwareRow;
  small?: boolean;
  colors: Record<ModernHardwareRow["kind"], string>;
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
        style={{ background: colors[row.kind] }}
      />
      <span
        className={cn("min-w-0 truncate", small ? "text-[10px]" : "text-xs")}
        title={row.label}
      >
        {row.label}
      </span>
      <span
        className={cn("ml-auto shrink-0 tabular-nums", small ? "text-xs" : "text-sm")}
        style={{ fontWeight: ws.weight(600) }}
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
  stroke,
  showFans,
  box,
  muted,
  fanColor,
}: {
  temps: ModernHardwareRow[];
  fans: ModernHardwareRow[];
  size: number;
  stroke: number;
  showFans: boolean;
  box: React.CSSProperties;
  muted: string;
  fanColor: string;
}) {
  return (
    <div
      className="flex h-full w-full overflow-hidden"
      style={{
        ...box,
        ...flow("column", { x: "between", y: "center" }),
        gap: ws.gap(12),
        padding: ws.pad(16),
        borderRadius: ws.radius(20),
      }}
    >
      <div className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-3">
        {temps.map((r) => (
          <div key={r.label} className="flex flex-col items-center gap-1">
            <ArcGauge
              value={r.temp ?? 0}
              max={100}
              size={size}
              stroke={stroke}
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
                style={{ background: fanColor }}
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
  kindColors,
  layout = "auto",
  surfaceStyle = "glass",
  chrome,
  className,
}: ModernHardwareProps) {
  const { ref, w, h } = useElementSize();
  const sv = makeSurface(surfaceStyle, null);
  const v = pickVariant(w, h, layout);
  const colors = {
    temp: kindColors?.temp || KIND_COLOR.temp,
    fan: kindColors?.fan || KIND_COLOR.fan,
    power: kindColors?.power || KIND_COLOR.power,
    other: KIND_COLOR.other,
  };

  const box = {
    ...surfaceBox(sv, chrome),
  } as const;

  let body: React.ReactNode;
  if (v === "compact") {
    body = (
      <div
        className="flex h-full w-full overflow-hidden"
        style={{
          ...box,
          ...flow("row", { x: "start", y: "center" }),
          gap: ws.gap(8),
          paddingInline: ws.pad(16),
          borderRadius: ws.radius(999),
        }}
      >
        {rows.slice(0, 4).map((row) => (
          <Row key={row.label} row={row} small colors={colors} />
        ))}
      </div>
    );
  } else if (v === "simple") {
    body = (
      <div
        className="grid h-full w-full auto-rows-min grid-cols-1 overflow-hidden"
        style={{ ...box, gap: ws.gap(4), padding: ws.pad(12), borderRadius: ws.radius(12) }}
      >
        {rows.slice(0, 2).map((row) => (
          <Row key={row.label} row={row} small colors={colors} />
        ))}
      </div>
    );
  } else if (v === "card") {
    body = (
      <div
        className="grid h-full w-full auto-rows-min grid-cols-2 overflow-y-auto"
        style={{ ...box, gap: ws.gap(6), padding: ws.pad(16), borderRadius: ws.radius(20) }}
      >
        {rows.map((row) => (
          <Row key={row.label} row={row} colors={colors} />
        ))}
      </div>
    );
  } else {
    body = (
      <div
        className="grid h-full w-full auto-rows-min grid-cols-3 overflow-y-auto"
        style={{ ...box, gap: ws.gap(6), padding: ws.pad(16), borderRadius: ws.radius(12) }}
      >
        {rows.map((row) => (
          <Row key={row.label} row={row} colors={colors} />
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
        <TempsGrid
          temps={temps}
          fans={fans}
          size={size}
          stroke={strokeOf(chrome, size * 0.11)}
          showFans={showFans}
          box={box}
          muted={sv.muted}
          fanColor={colors.fan}
        />
      );
    }
  }

  return (
    <ModernChrome chrome={chrome} designSize={DESIGN} className={className}>
      <div ref={ref} className="h-full w-full">
        {body}
      </div>
    </ModernChrome>
  );
}
