import { useEffect, useRef, useState } from "react";
import type { SensorMap } from "@/modules/types";
import type {
  IPBarItem,
  IPCalendarItem,
  IPClockItem,
  IPDonutItem,
  IPGraphItem,
  IPGroupItem,
  IPGaugeItem,
  IPHttpImageItem,
  IPImageItem,
  IPItem,
  IPProfile,
  IPSensorImageItem,
  IPSensorItem,
  IPShapeItem,
  IPTableItem,
  IPTextItem,
} from "@/lib/ip/types";
import { bindingText, bindingValue, liveSensor } from "@/lib/ip/libre";
import { useIPQueue } from "@/lib/ip/history";
import { formatDotNetDate, sensorNumber, sensorText } from "@/lib/ip/format";
import type { IPTextBlock } from "@/lib/ip/types";

interface Ctx {
  profile: IPProfile;
  sensors: SensorMap;
  assetBase: string;
  /** In-memory assets (data URLs) for profiles imported via .infopanel. */
  assetData?: Record<string, string>;
  now: Date;
}

/** Resolve an asset file name: in-memory import data first, else the
 *  served `/assets/ip/<slug>/` folder. */
export function assetUrl(c: Ctx, file: string): string {
  return c.assetData?.[file] ?? `${c.assetBase}/${file}`;
}

/* ------------------------------------------------------------------ *
 * Shared helpers
 * ------------------------------------------------------------------ */

/**
 * Parse an InfoPanel color. They are .NET `#AARRGGBB` (8 digits, alpha
 * first) — CSS reads 8-digit hex as `#RRGGBBAA`, so they must be
 * converted before application. 3/6-digit `#RRGGBB` parses as opaque.
 */
function netColor(
  hex: string | undefined
): { r: number; g: number; b: number; a: number } | null {
  if (!hex) return null;
  const m8 = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (m8) {
    const h = m8[2];
    return {
      a: parseInt(m8[1], 16) / 255,
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  const m6 = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (m6) {
    const h = m6[1];
    return {
      a: 1,
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  return null;
}

/** .NET `#AARRGGBB` / `#RRGGBB` → CSS-safe color (rgba() when semi-transparent). */
export function cssColor(hex: string | undefined): string | undefined {
  if (!hex) return undefined;
  const p = netColor(hex);
  if (!p) return hex; // not a hex literal — pass through
  return p.a >= 1 ? `rgb(${p.r},${p.g},${p.b})` : `rgba(${p.r},${p.g},${p.b},${Number(p.a.toFixed(3))})`;
}

function hexToRgba(hex: string, alpha: number): string {
  const p = netColor(hex);
  if (!p) return hex;
  return `rgba(${p.r},${p.g},${p.b},${alpha})`;
}

/** InfoPanel text rendering size = fontSize × profile fontScale. */
function textFont(tb: IPTextBlock, c: Ctx) {
  // C# resolves the family from system fonts (Skia fallback = default face);
  // mirror with an explicit fallback chain.
  const family = tb.font || c.profile.font || "sans-serif";
  return {
    fontFamily: family === "sans-serif" ? family : `${family}, Arial, sans-serif`,
    fontSize: Math.max(1, tb.fontSize * c.profile.fontScale),
    fontWeight: tb.bold ? 700 : 400,
    fontStyle: tb.italic ? "italic" : undefined,
    textDecoration: tb.underline || tb.strikeout ? (tb.underline && tb.strikeout ? "underline line-through" : tb.underline ? "underline" : "line-through") : undefined,
    textTransform: tb.uppercase ? ("uppercase" as const) : undefined,
    color: cssColor(tb.color || c.profile.color),
    textShadow: tb.glowEnabled ? `0 0 ${tb.glowRadius ?? 8}px ${hexToRgba(tb.glowColor || "#000000", 0.6)}` : undefined,
  };
}

/** Position wrapper — absolute (x,y); rotation about center; align shifts. */
function place(item: { x: number; y: number; rotation: number }, content: React.ReactNode, extra?: React.CSSProperties) {
  const transform = [
    item.rotation ? `rotate(${item.rotation}deg)` : null,
    extra?.transform,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      style={{
        position: "absolute",
        left: item.x,
        top: item.y,
        transform: transform || undefined,
        transformOrigin: item.rotation ? "center" : undefined,
        ...extra,
      }}
    >
      {content}
    </div>
  );
}

function thresholdColor(
  v: number | undefined,
  b: { threshold1?: number; threshold1Color?: string; threshold2?: number; threshold2Color?: string }
): string | undefined {
  if (v === undefined) return undefined;
  // C# `EvaluateColor`: thresholds are active only when > 0, compare >=, t2 wins.
  if ((b.threshold2 ?? 0) > 0 && v >= (b.threshold2 as number)) return b.threshold2Color;
  if ((b.threshold1 ?? 0) > 0 && v >= (b.threshold1 as number)) return b.threshold1Color;
  return undefined;
}

/** The text box (no positioning) — shared by every text-shaped item. */
function textContent(
  item: IPTextItem | IPClockItem | IPCalendarItem | IPSensorItem | IPTableItem,
  c: Ctx,
  value: string,
  boxWidth?: number
) {
  const align = item.centerAlign ? "center" : item.rightAlign ? "right" : "left";
  // C# RichTextKit: Wrap=true (default) → single line (MaxLines=1);
  // Wrap=false → multi-line. Ellipsis clips at a set width.
  const singleLine = item.wrap !== false;
  return (
    <div
      style={{
        ...textFont(item, c),
        width: boxWidth,
        textAlign: boxWidth ? align : undefined,
        whiteSpace: singleLine ? "nowrap" : undefined,
        overflow: singleLine && item.ellipsis && boxWidth ? "hidden" : undefined,
        textOverflow: singleLine && item.ellipsis && boxWidth ? "ellipsis" : undefined,
        lineHeight: 1.2,
      }}
    >
      {value}
    </div>
  );
}

/** Placed text box (positions the item; right/center align shifts the origin). */
function TextShell({
  item,
  c,
  value,
  width,
}: {
  item: IPTextItem | IPClockItem | IPCalendarItem | IPSensorItem | IPTableItem;
  c: Ctx;
  value: string;
  width?: number;
}) {
  const boxWidth = width && width > 0 ? width : undefined;
  const shift = item.centerAlign ? "-50%" : item.rightAlign ? "-100%" : undefined;
  return place(
    item,
    textContent(item, c, value, boxWidth),
    {
      transform: shift ? `translateX(${shift})` : undefined,
      width: boxWidth,
      height: item.height > 0 ? item.height : undefined,
    }
  );
}

/* ------------------------------------------------------------------ *
 * Text / Clock / Calendar / Sensor
 * ------------------------------------------------------------------ */

export function IPTextItemView({ item, c }: { item: IPTextItem; c: Ctx }) {
  return <TextShell item={item} c={c} value={item.text} />;
}

export function IPClockItemView({ item, c }: { item: IPClockItem; c: Ctx }) {
  return <TextShell item={item} c={c} value={formatDotNetDate(item.format, c.now)} />;
}

export function IPCalendarItemView({ item, c }: { item: IPCalendarItem; c: Ctx }) {
  return <TextShell item={item} c={c} value={formatDotNetDate(item.format, c.now)} />;
}

export function IPSensorItemView({ item, c }: { item: IPSensorItem; c: Ctx }) {
  const b = item.sensor;
  const live = liveSensor(c.sensors, b);
  const v = bindingValue(c.sensors, b);
  let text: string;
  const liveText = live?.text?.trim();
  if (liveText && liveText !== "-") {
    // C# ValueText path — text used as-is, unit + name still applied.
    text = liveText;
    if (b.showUnit) text += b.overrideUnit ? (b.unit ?? "") : (live?.unit ?? "");
  } else if (v !== undefined) {
    text = sensorText(v, b, live?.unit);
  } else {
    // C# returns "-" when the reading is absent.
    text = "-";
  }
  // C# ShowName prepends the name in the same text run (only for live readings).
  if (text !== "-" && b.showName && b.sensorName) text = b.sensorName + " " + text;
  const override = v === undefined ? undefined : thresholdColor(sensorNumber(v, b), b);
  const boxWidth = item.width > 0 ? item.width : undefined;
  const shift = item.centerAlign ? "-50%" : item.rightAlign ? "-100%" : undefined;
  return place(
    item,
    <div style={{ width: boxWidth, textAlign: boxWidth ? (item.centerAlign ? "center" : item.rightAlign ? "right" : "left") : undefined, color: cssColor(override) }}>
      {textContent(item, c, text, boxWidth)}
    </div>,
    { transform: shift ? `translateX(${shift})` : undefined, width: boxWidth }
  );
}

/* ------------------------------------------------------------------ *
 * Table
 * ------------------------------------------------------------------ */

function parseTableFormat(fmt: string): number[] {
  return fmt
    .split("|")
    .map((part) => parseInt(part.split(":")[1] ?? "100", 10))
    .filter((n) => !isNaN(n));
}

export function IPTableItemView({ item, c }: { item: IPTableItem; c: Ctx }) {
  const raw = bindingText(c.sensors, item.sensor);
  const lines = (raw ? raw.split("\n") : []).slice(0, item.maxRows > 0 ? item.maxRows : undefined);
  const cols = parseTableFormat(item.tableFormat);
  if (lines.length === 0) return null;
  const rows = item.showHeader ? [lines[0], ...lines.slice(1)] : lines;
  return place(
    item,
    <div style={{ ...textFont(item, c), fontSize: (textFont(item, c).fontSize as number) }}>
      {rows.map((line, r) => {
        const cells = line.split(",");
        return (
          <div key={r} style={{ display: "grid", gridTemplateColumns: cols.map((w) => `${w}px`).join(" "), gap: 0 }}>
            {cols.map((_, ci) => (
              <span key={ci} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: r === 0 && item.showHeader ? 700 : undefined, opacity: r === 0 && item.showHeader ? 0.7 : 1 }}>
                {cells[ci] ?? ""}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Chart base (graph / bar / donut)
 * ------------------------------------------------------------------ */

function chartSurface(
  item: IPGraphItem | IPBarItem | IPDonutItem
): React.CSSProperties {
  return {
    width: item.width,
    height: item.height,
    background: item.background ? cssColor(item.backgroundColor) : undefined,
    border: item.frame ? `1px solid ${cssColor(item.frameColor)}` : undefined,
    borderRadius: item.kind === "bar" ? item.cornerRadius : undefined,
    overflow: "hidden",
  };
}

function chartRange(item: { min: number; max: number; autoValue: boolean }, q: number[]) {
  let min = item.min;
  let max = item.max;
  if (item.autoValue && q.length > 1) {
    min = Math.min(...q);
    max = Math.max(...q);
    if (min === max) {
      min -= 1;
      max += 1;
    }
  }
  return [min, max] as const;
}

export function IPGraphItemView({ item }: { item: IPGraphItem; c: Ctx }) {
  const q = useIPQueue(item.sensor);
  const [min, max] = chartRange(item, q);
  const W = item.width;
  const H = item.height;
  const t = item.thickness;

  // C# LINE: visible window = W/step samples (oldest first); sample i sits at
  // x = W − i·step, so data scrolls right→left (newest at the left edge).
  const step = Math.max(1, item.step);
  let size = Math.floor(W / step);
  if (size * step !== W) size += 2;
  else size += 1;
  size = Math.min(size, q.length);
  const values = q.slice(q.length - size);
  const scale = max - min;

  const pts = values.map((rv, i) => {
    let value = Math.max(rv - min, 0);
    value = Math.min(value, max);
    value = scale <= 0 ? 0 : (value / scale) * (H - t);
    const x = W - i * step;
    const y = H - (value + t / 2);
    return [x, y] as const;
  });

  const line =
    pts.length > 0
      ? pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
      : "";
  const lastX = pts.length > 0 ? pts[pts.length - 1][0] : 0;
  // C# fill: (W+t, H+t) → points → (lastX−t, H+t).
  const area =
    pts.length > 1
      ? `M${W + t},${H + t} ${pts
          .map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`)
          .join(" ")} L${lastX - t},${H + t} Z`
      : "";

  return place(
    item,
    <svg
      width={W}
      height={H}
      style={{ ...chartSurface(item), transform: item.flipX ? "scaleX(-1)" : undefined }}
    >
      {item.fill && area && <path d={area} fill={cssColor(item.fillColor)} />}
      {line && <path d={line} fill="none" stroke={cssColor(item.color)} strokeWidth={t} />}
    </svg>
  );
}

export function IPBarItemView({ item, c }: { item: IPBarItem; c: Ctx }) {
  const q = useIPQueue(item.sensor);
  // C# bar: fill from the LIVE value; auto min/max come from the sample queue.
  const v = bindingValue(c.sensors, item.sensor);
  const [min, max] = chartRange(item, q);
  const span = Math.max(1e-6, max - min);
  let ratio = v === undefined ? 0 : Math.max(0, Math.min(1, (v - min) / span));
  // C# flips the whole bitmap: only meaningful for horizontal bars.
  const vertical = item.height > item.width;
  if (item.flipX && !vertical) ratio = 1 - ratio;
  const fillStyle: React.CSSProperties = item.gradient
    ? { background: `linear-gradient(${vertical ? "0deg" : "90deg"}, ${cssColor(item.color)}, ${cssColor(item.gradientColor)})` }
    : { background: cssColor(item.color) };
  return place(
    item,
    <div style={chartSurface(item)}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: vertical ? `${ratio * 100}%` : undefined,
          width: vertical ? undefined : `${ratio * 100}%`,
          borderRadius: item.frame ? Math.max(0, item.cornerRadius - 1) : item.cornerRadius,
          // Approximates C# InterpolateWithCycles smoothing between samples.
          transition: "height 1.5s linear, width 1.5s linear",
          ...fillStyle,
        }}
      />
    </div>
  );
}

export function IPDonutItemView({ item }: { item: IPDonutItem; c?: Ctx }) {
  const q = useIPQueue(item.sensor);
  const [min, max] = chartRange(item, q);
  const span = Math.max(1e-6, max - min);
  // C# donut: value = LAST queue sample (0 when empty), not the live value.
  const last = q.length > 0 ? q[q.length - 1] : 0;
  const ratio = Math.max(0, Math.min(1, (last - min) / span));
  // C# FillDonut: radius from the WIDTH (W/2 − 1), arc starts at 3 o'clock.
  const rOuter = Math.max(1, item.width / 2 - 1);
  const thickness = Math.max(0, Math.min(item.thickness, rOuter));
  const r = rOuter - thickness / 2;
  const C = 2 * Math.PI * r;
  const spanFrac = (item.span ?? 360) / 360;
  const arcLen = C * spanFrac;
  const dashFg = arcLen * ratio;
  const cx = item.width / 2;
  const cy = item.height / 2;
  return place(
    item,
    <svg width={item.width} height={item.height} style={chartSurface(item)}>
      {item.background && (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={cssColor(item.backgroundColor)}
          strokeWidth={thickness}
          strokeDasharray={item.span === 360 ? undefined : `${arcLen} ${C}`}
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={cssColor(item.color)}
        strokeWidth={thickness}
        strokeDasharray={`${dashFg} ${C}`}
        style={{ transition: "stroke-dasharray 1.5s linear" }}
      />
      {item.frame && (
        <>
          <circle cx={cx} cy={cy} r={rOuter - 0.5} fill="none" stroke={cssColor(item.frameColor)} strokeWidth={1} />
          <circle cx={cx} cy={cy} r={Math.max(0.5, rOuter - thickness + 0.5)} fill="none" stroke={cssColor(item.frameColor)} strokeWidth={1} />
        </>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Gauge (sprite frames)
 * ------------------------------------------------------------------ */

export function IPGaugeItemView({ item, c }: { item: IPGaugeItem; c: Ctx }) {
  const frames = item.images;
  const v = bindingValue(c.sensors, item.sensor);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const probeRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (frames.length === 0) return;
    const img = new Image();
    img.onload = () => setNat({ w: img.naturalWidth || 100, h: img.naturalHeight || 100 });
    img.src = assetUrl(c, frames[0].filePath);
    probeRef.current = img;
  }, [c.assetBase, frames.length > 0 ? frames[0].filePath : ""]);

  const n = frames.length;
  const span = Math.max(1e-6, item.maxValue - item.minValue);
  const target = v === undefined ? 0 : Math.max(0, Math.min(1, (v - item.minValue) / span)) * (n - 1);

  // Animation: ease toward target at animationSpeed frame-units/sec.
  const [idx, setIdx] = useState(target);
  useEffect(() => {
    if (item.animationSpeed <= 0) {
      setIdx(target);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      setIdx((cur) => {
        const d = target - cur;
        if (Math.abs(d) < 0.01) return target;
        const move = item.animationSpeed * dt;
        return Math.abs(d) <= move ? target : cur + Math.sign(d) * move;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, item.animationSpeed]);

  if (n === 0) return null;
  const cur = Math.max(0, Math.min(n - 1, Math.floor(idx)));
  const next = Math.min(n - 1, cur + 1);
  const frac = idx - cur;
  // C#: per dimension — Width/Height when set, else the frame's natural size;
  // each × Scale/100.
  const f = (item.scale > 0 ? item.scale : 100) / 100;
  const w = Math.floor((item.width > 0 ? item.width : nat?.w ?? 100) * f);
  const h = Math.floor((item.height > 0 ? item.height : nat?.h ?? 100) * f);
  return place(
    item,
    <div style={{ position: "relative", width: w, height: h }}>
      {next !== cur && <img src={assetUrl(c, frames[next].filePath)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: frac, transform: item.flipX ? "scaleX(-1)" : undefined, imageRendering: "auto" }} alt="" />}
      <img src={assetUrl(c, frames[cur].filePath)} style={{ width: "100%", height: "100%", opacity: next !== cur ? 1 - frac : 1, transform: item.flipX ? "scaleX(-1)" : undefined }} alt="" />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Image / HttpImage / SensorImage
 * ------------------------------------------------------------------ */

/** C# `EvaluateSize`: each dimension falls back to the natural size, each
 *  non-zero dimension × Scale/100 independently. */
function imageSize(
  item: IPImageItem | IPHttpImageItem,
  natural?: { w: number; h: number }
): { w?: number; h?: number } {
  const f = (item.scale > 0 ? item.scale : 100) / 100;
  if (item.width > 0) {
    return {
      w: item.width * f,
      h: item.height > 0 ? item.height * f : natural ? natural.h * f : undefined,
    };
  }
  if (natural) return { w: natural.w * f, h: natural.h * f };
  return { w: undefined, h: undefined };
}

export function IPImageItemView({ item, c }: { item: IPImageItem; c: Ctx }) {
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const src = item.type === "URL" ? item.httpUrl || item.filePath : assetUrl(c, item.filePath);
  const size = imageSize(item, nat ?? undefined);
  return place(
    item,
    <div style={{ position: "relative" }}>
      <img
        src={src}
        style={{ width: size.w, height: size.h, display: "block" }}
        alt={item.name}
        onLoad={(e) => {
          const img = e.target as HTMLImageElement;
          setNat({ w: img.naturalWidth, h: img.naturalHeight });
        }}
      />
      {item.layer && (
        <div style={{ position: "absolute", inset: 0, background: cssColor(item.layerColor) }} />
      )}
      {item.showPanel && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 40, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: 8, padding: "0 8px", fontSize: 12, color: "#fff" }}>
          <span style={{ color: "#f00", fontWeight: 700 }}>LIVE</span>
          <span style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.3)", borderRadius: 2 }} />
          <span>{item.volume >= 80 ? "🔊" : item.volume >= 40 ? "🔉" : item.volume > 0 ? "🔈" : "🔇"}</span>
        </div>
      )}
    </div>
  );
}

export function IPHttpImageItemView({ item, c }: { item: IPHttpImageItem; c: Ctx }) {
  const live = bindingText(c.sensors, item.sensor);
  const src = live || item.httpUrl;
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const size = imageSize(item, nat ?? undefined);
  if (!src) {
    return place(item, <div style={{ width: item.width || 100, height: item.height || 100, border: "1px dashed #555" }} />);
  }
  return place(
    item,
    <div style={{ position: "relative" }}>
      <img
        src={src}
        style={{ width: size.w, height: size.h, display: "block", objectFit: "cover" }}
        alt={item.name}
        onLoad={(e) => {
          const img = e.target as HTMLImageElement;
          setNat({ w: img.naturalWidth, h: img.naturalHeight });
        }}
      />
      {item.layer && <div style={{ position: "absolute", inset: 0, background: cssColor(item.layerColor) }} />}
    </div>
  );
}

export function IPSensorImageItemView({ item, c }: { item: IPSensorImageItem; c: Ctx }) {
  const v = bindingValue(c.sensors, item.sensor);
  // C# ShouldShow(): visible while the value sits inside [t1, t2].
  const show = v === undefined || (v >= item.threshold1 && v <= item.threshold2);
  if (!show || !item.filePath) return null;
  return place(
    item,
    <img src={assetUrl(c, item.filePath)} style={{ width: item.scale > 0 ? item.scale : undefined, display: "block" }} alt={item.name} />
  );
}

/* ------------------------------------------------------------------ *
 * Shape
 * ------------------------------------------------------------------ */

function shapePath(s: IPShapeItem): string {
  const { width: W, height: H } = s;
  const c = s.cornerRadius;
  switch (s.shapeType) {
    case "Rectangle":
      return `M0,0 H${W} V${H} H0 Z`;
    case "RoundedRect":
      return `M${c},0 H${W - c} A${c},${c} 0 0 1 ${W},${c} V${H - c} A${c},${c} 0 0 1 ${W - c},${H} H${c} A${c},${c} 0 0 1 0,${H - c} V${c} A${c},${c} 0 0 1 ${c},0 Z`;
    case "Ellipse":
      return `M${W / 2},${0} A${W / 2},${H / 2} 0 1 1 ${W / 2},${H} A${W / 2},${H / 2} 0 1 1 ${W / 2},0 Z`;
    case "Triangle":
      return `M${W / 2},0 L${W},${H} L0,${H} Z`;
    case "Capsule": {
      const r = Math.min(c, H / 2);
      return `M${r},0 H${W - r} A${r},${r} 0 0 1 ${W - r},${H} H${r} A${r},${r} 0 0 1 ${r},0 Z`;
    }
    case "Star": {
      const inner = 0.382;
      const cx = W / 2;
      const cy = H / 2;
      let d = "";
      for (let i = 0; i < 10; i++) {
        const rad = (i % 2 === 0 ? 1 : inner) * (i < 8 ? 1 : 1);
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rr = rad * (i % 2 === 0 ? Math.min(W, H) / 2 : (Math.min(W, H) / 2) * inner);
        d += `${i === 0 ? "M" : "L"}${cx + Math.cos(a) * rr * (W >= H ? 1.4 : 1)},${cy + Math.sin(a) * rr} `;
      }
      return d + "Z";
    }
    case "Plus": {
      const t = Math.min(W, H) / 3;
      return `M${(W - t) / 2},0 H${(W + t) / 2} V${(H - t) / 2} H${W} V${(H + t) / 2} H${(W + t) / 2} V${H} H${(W - t) / 2} V${(H + t) / 2} H0 V${(H - t) / 2} H${(W - t) / 2} Z`;
    }
    case "Arrow": {
      const head = H * 0.4;
      const shaft = W * 0.5;
      return `M0,${(H - head) / 2} H${shaft} V0 L${W},${H / 2} L${shaft},${H} V${(H + head) / 2} H0 Z`;
    }
    case "Trapezoid": {
      const inset = W * 0.2;
      return `M${inset},0 H${W - inset} L${W},${H} L0,${H} Z`;
    }
    case "Parallelogram": {
      const skew = W * 0.25;
      return `M${skew},0 H${W} L${W - skew},${H} L0,${H} Z`;
    }
    case "Hexagon":
      return `M${W * 0.25},0 H${W * 0.75} L${W},${H / 2} L${W * 0.75},${H} H${W * 0.25} L0,${H / 2} Z`;
    default:
      return `M0,0 H${W} V${H} H0 Z`;
  }
}

export function IPShapeItemView({ item }: { item: IPShapeItem; c: Ctx }) {
  return place(
    item,
    <svg width={item.width} height={item.height} style={{ overflow: "visible" }}>
      <path
        d={shapePath(item)}
        fill={item.showGradient ? "url(#grad-" + item.id + ")" : item.showFill ? cssColor(item.fillColor) : "none"}
        stroke={item.showFrame ? cssColor(item.frameColor) : undefined}
        strokeWidth={item.showFrame ? item.frameThickness : undefined}
      />
      {item.showGradient && (
        <defs>
          <linearGradient id={"grad-" + item.id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={cssColor(item.gradientColor)} />
            <stop offset="100%" stopColor={cssColor(item.gradientColor2)} />
          </linearGradient>
        </defs>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Group — draws nothing; children are absolute and splice in place.
 * ------------------------------------------------------------------ */

export function IPGroupItemView({ item, render }: { item: IPGroupItem; c: Ctx; render: (child: IPItem) => React.ReactNode }) {
  if (item.hidden) return null;
  return <>{item.children.map((child) => render(child))}</>;
}

/* ------------------------------------------------------------------ *
 * Dispatcher
 * ------------------------------------------------------------------ */

export function renderItem(item: IPItem, c: Ctx): React.ReactNode {
  switch (item.kind) {
    case "text":
      return <IPTextItemView item={item} c={c} />;
    case "clock":
      return <IPClockItemView item={item} c={c} />;
    case "calendar":
      return <IPCalendarItemView item={item} c={c} />;
    case "sensor":
      return <IPSensorItemView item={item} c={c} />;
    case "table":
      return <IPTableItemView item={item} c={c} />;
    case "image":
      return <IPImageItemView item={item} c={c} />;
    case "httpImage":
      return <IPHttpImageItemView item={item} c={c} />;
    case "sensorImage":
      return <IPSensorImageItemView item={item} c={c} />;
    case "graph":
      return <IPGraphItemView item={item} c={c} />;
    case "bar":
      return <IPBarItemView item={item} c={c} />;
    case "donut":
      return <IPDonutItemView item={item} c={c} />;
    case "gauge":
      return <IPGaugeItemView item={item} c={c} />;
    case "shape":
      return <IPShapeItemView item={item} c={c} />;
    case "group":
      return <IPGroupItemView item={item} c={c} render={(child) => renderItem(child, c)} />;
    default:
      return null;
  }
}


