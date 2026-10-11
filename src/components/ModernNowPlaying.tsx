import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Music2, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModernChrome, type ModernChrome as ModernChromeSpec } from "./modern-chrome";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { BarVisualizer } from "@/components/ui/bar-visualizer";
import type { BarIdle } from "@/lib/audio/bar-levels";
import type { Orientation } from "@/lib/audio/types";
import { useSensorVisualSource } from "@/hooks/use-sensor-visual-source";
import { IMAGE_PROXY_URL } from "@/lib/dashboard-server";
import { trackPeaks } from "@/lib/waveform-peaks";
import { CaptureVisualizerRow } from "@/components/CaptureVisualizerRow";

/**
 * Modern now-playing widget.
 *
 * Renders one of four layouts and picks automatically from the zone's
 * measured size:
 *
 * - `card`     — tall/portrait zones: big cover art on top, centered title,
 *                progress at the bottom (the "CARD" reference)
 * - `standard` — wide zones: art on the left, title/artist and a progress
 *                row with times (the "STANDARD" reference)
 * - `compact`  — very short zones: full-width pill whose fill IS the
 *                progress (the "COMPACT" reference)
 * - `simple`   — small zones: small art + stacked text (the "SIMPLE" reference)
 *
 * The surface can be tinted with the cover art's dominant color (a
 * Vibrant-style palette sampled on a small canvas through the dashboard
 * image proxy; cross-origin art the proxy cannot reach degrades to an
 * untinted surface).
 */

export type ModernVariant = "card" | "standard" | "compact" | "simple";
export type ModernStyle = "glass" | "matte-light" | "matte-dark";

export interface ModernNowPlayingProps {
  track?: string;
  artist?: string;
  artUrl?: string;
  /** 0–100 */
  progress?: number;
  elapsed?: string;
  remaining?: string;
  isPlaying?: boolean;
  /** Forced layout; "auto" adapts to the zone size. */
  variant?: ModernVariant | "auto";
  style?: ModernStyle;
  /** Tint the surface with the cover art's dominant color. */
  tint?: boolean;
  /**
   * Use the cover art as a blurred, darkened full-bleed background behind the
   * content (the nutty.gg now-playing look). The semi-transparent glass
   * surface lets it show through; opaque matte surfaces cover it.
   */
  artBackground?: boolean;
  showTimes?: boolean;
  showProgress?: boolean;
  /**
   * Render the audiocn LiveWaveform in place of the progress bar (card +
   * standard layouts). It animates live: the level comes from
   * `liveLevel` (a system audio level), the bar *shape* is a stable
   * decorative per-track shape (`trackPeaks`). `visualizer` takes
   * precedence when both are on.
   */
  waveform?: boolean;
  waveformVariant?: "bars" | "line" | "mirror";
  /** `scrolling` shows the level history; `static` the current bands. */
  waveformMode?: "scrolling" | "static";
  waveformBarWidth?: number;
  waveformBarGap?: number;
  waveformBarRadius?: number;
  waveformMinBarHeight?: number;
  waveformLineWidth?: number;
  waveformFadeEdges?: boolean;
  waveformFadeWidth?: number;
  /** When false, shows the idle dotted line. */
  waveformActive?: boolean;
  /** Visual gain. */
  waveformSensitivity?: number;
  /** Render the audiocn BarVisualizer in place of the progress bar. */
  visualizer?: boolean;
  visualizerBarCount?: number;
  visualizerAlign?: "center" | "start" | "end";
  visualizerMirrored?: boolean;
  /** Resting bar size, 0..1. */
  visualizerMinLevel?: number;
  /** What the bars do with no signal. */
  visualizerIdle?: BarIdle;
  /** Runs a sweep animation (connecting / thinking state). */
  visualizerLoading?: boolean;
  visualizerOrientation?: Orientation;
  /**
   * Live system audio level, 0..1 (the audio-level-meter's `audio-level`
   * value / 100). Feeds both visualizers; undefined = no live data (the
   * idle states show instead).
   */
  liveLevel?: number;
  /**
   * Pinned Web Audio capture devices (stable `enumerateDevices()` ids). When
   * non-empty and a visualizer view is on, each device renders its own
   * labeled live row (stacked), fed by real-time Web Audio capture —
   * independent of the bridge's ~1 Hz sensor ceiling. Empty/undefined falls
   * back to the single `liveLevel` sensor row.
   */
  captureDeviceIds?: string[];
  /** Standard chrome: custom title / icon / accent / background image. */
  chrome?: ModernChromeSpec;
  className?: string;
}

export type RGB = [number, number, number];

const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];
const lighten = (c: RGB, t: number) => mix(c, [255, 255, 255], t);
const darken = (c: RGB, t: number) => mix(c, [0, 0, 0], t);
const rgba = (c: RGB, a = 1) =>
  a >= 1 ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

export interface Surface {
  background: string;
  fg: string;
  muted: string;
  track: string;
  fill: string;
  ring: string;
}

/** Shared surface builder (glass / matte light / matte dark) for the modern widgets. */
export function makeSurface(style: ModernStyle, tint: RGB | null): Surface {
  if (style === "matte-light") {
    const base = tint ? lighten(tint, 0.74) : ([244, 244, 245] as RGB);
    return {
      background: rgba(base),
      fg: "rgb(24, 24, 27)",
      muted: "rgba(24, 24, 27, 0.6)",
      track: "rgba(24, 24, 27, 0.16)",
      fill: rgba(tint ? darken(tint, 0.12) : ([113, 113, 122] as RGB)),
      ring: "rgba(255, 255, 255, 0.4)",
    };
  }
  if (style === "matte-dark") {
    const base = tint ? darken(tint, 0.72) : ([24, 24, 27] as RGB);
    return {
      background: rgba(base),
      fg: "rgb(250, 250, 250)",
      muted: "rgba(250, 250, 250, 0.6)",
      track: "rgba(255, 255, 255, 0.14)",
      fill: rgba(tint ? lighten(tint, 0.4) : ([161, 161, 170] as RGB)),
      ring: "rgba(255, 255, 255, 0.1)",
    };
  }
  // glass
  if (tint) {
    return {
      background: `linear-gradient(155deg, ${rgba(lighten(tint, 0.15), 0.45)} 0%, ${rgba(
        darken(tint, 0.6),
        0.8
      )} 100%)`,
      fg: "rgb(250, 250, 250)",
      muted: "rgba(250, 250, 250, 0.65)",
      track: "rgba(255, 255, 255, 0.16)",
      fill: rgba(lighten(tint, 0.3)),
      ring: "rgba(255, 255, 255, 0.12)",
    };
  }
  return {
    background:
      "linear-gradient(155deg, rgba(24, 24, 27, 0.85) 0%, rgba(24, 24, 27, 0.55) 100%)",
    fg: "rgb(250, 250, 250)",
    muted: "rgba(250, 250, 250, 0.6)",
    track: "rgba(255, 255, 255, 0.14)",
    fill: "rgb(52, 211, 153)",
    ring: "rgba(255, 255, 255, 0.1)",
  };
}

/**
 * A Vibrant-style palette of roles sampled from the cover art: the dominant
 * saturated color (`vibrant`, the accent) plus its light/dark variants for
 * the surface base. Built saturation-weighted (see `computeArtTint`), not a
 * flat pixel average, so a cover with one strong color tints with that
 * color instead of a muddy gray average.
 */
export interface ArtTint {
  vibrant: RGB;
  light: RGB;
  dark: RGB;
}

/**
 * The surface built from the cover-art palette roles — the same mixes as
 * `makeSurface`, driven by the palette instead of a single average color.
 */
export function makeSurfacePalette(style: ModernStyle, tint: ArtTint): Surface {
  if (style === "matte-light") {
    return {
      background: rgba(tint.light),
      fg: "rgb(24, 24, 27)",
      muted: "rgba(24, 24, 27, 0.6)",
      track: "rgba(24, 24, 27, 0.16)",
      fill: rgba(darken(tint.vibrant, 0.12)),
      ring: "rgba(255, 255, 255, 0.4)",
    };
  }
  if (style === "matte-dark") {
    return {
      background: rgba(tint.dark),
      fg: "rgb(250, 250, 250)",
      muted: "rgba(250, 250, 250, 0.6)",
      track: "rgba(255, 255, 255, 0.14)",
      fill: rgba(lighten(tint.vibrant, 0.4)),
      ring: "rgba(255, 255, 255, 0.1)",
    };
  }
  // glass
  return {
    background: `linear-gradient(155deg, ${rgba(lighten(tint.vibrant, 0.15), 0.45)} 0%, ${rgba(
      tint.dark,
      0.8
    )} 100%)`,
    fg: "rgb(250, 250, 250)",
    muted: "rgba(250, 250, 250, 0.65)",
    track: "rgba(255, 255, 255, 0.16)",
    fill: rgba(lighten(tint.vibrant, 0.3)),
    ring: "rgba(255, 255, 255, 0.12)",
  };
}

const rgbToHsl = (
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
};

const hslToRgb = (h: number, s: number, l: number): RGB => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
};

/**
 * Vibrant-style palette from the art's pixels: the hue bin whose pixels
 * carry the most saturation-weighted mass becomes the accent. Near-gray art
 * (no saturated mass) returns null, so the surface stays untinted rather
 * than muddy.
 */
export function computeArtTint(data: Uint8ClampedArray): ArtTint | null {
  const bins = 36;
  const weight = new Float64Array(bins);
  const hSum = new Float64Array(bins);
  const sSum = new Float64Array(bins);
  const lSum = new Float64Array(bins);
  let saturatedMass = 0;
  let pixels = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    pixels += 1;
    const { h, s, l } = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (s < 0.12) continue;
    const bin = Math.min(bins - 1, Math.floor(h / (360 / bins)));
    const w = s * s * (1 - Math.abs(l - 0.5));
    weight[bin] += w;
    hSum[bin] += w * h;
    sSum[bin] += w * s;
    lSum[bin] += w * l;
    saturatedMass += w;
  }
  if (pixels === 0 || saturatedMass < 0.02 * pixels) return null;
  let best = 0;
  for (let b = 1; b < bins; b += 1) if (weight[b] > weight[best]) best = b;
  if (weight[best] <= 0) return null;
  const h = hSum[best] / weight[best];
  const s = Math.max(0.45, sSum[best] / weight[best]);
  const l = Math.min(0.62, Math.max(0.38, lSum[best] / weight[best]));
  const vibrant = hslToRgb(h, s, l);
  return {
    vibrant,
    light: lighten(vibrant, 0.74),
    dark: darken(vibrant, 0.72),
  };
}

/** Measure the rendered size of an element (for the auto layout pick). */
export function useElementSize() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r)
        setSize((s) =>
          s.w === r.width && s.h === r.height ? s : { w: r.width, h: r.height }
        );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w: size.w, h: size.h };
}

const loadImageFrom = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });

/**
 * Load the cover art for pixel sampling. The local cover-art server sends no
 * CORS headers, so a direct cross-origin load taints the canvas and
 * `getImageData` throws. First fetch the bytes through the dashboard server's
 * same-origin image proxy (blob URLs stay untainted); when the server is
 * offline, fall back to a direct load (it works for same-origin or
 * CORS-enabled art, and degrades to no tint otherwise).
 */
async function loadTintableImage(url: string): Promise<HTMLImageElement | null> {
  try {
    const res = await fetch(
      `${IMAGE_PROXY_URL}?url=${encodeURIComponent(url)}`
    );
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) {
        const objectUrl = URL.createObjectURL(blob);
        try {
          return await loadImageFrom(objectUrl);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      }
    }
  } catch {
    /* bridge offline — fall through to the direct load */
  }
  try {
    return await loadImageFrom(url);
  } catch {
    return null;
  }
}

/**
 * Vibrant-style cover-art palette (the `vibrant` accent + light/dark base
 * roles), sampled through the bridge image proxy. Art the proxy cannot
 * fetch (and that is not same-origin/CORS itself), or near-gray art with no
 * saturated accent, yields null — the surface then stays untinted.
 */
export function useArtTint(url: string | undefined, enabled: boolean): ArtTint | null {
  const [tint, setTint] = useState<ArtTint | null>(null);
  useEffect(() => {
    setTint(null);
    if (!url || !enabled) return;
    let cancelled = false;
    void (async () => {
      const img = await loadTintableImage(url);
      if (!img || cancelled) return;
      try {
        const n = 16;
        const canvas = document.createElement("canvas");
        canvas.width = n;
        canvas.height = n;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, n, n);
        let data: Uint8ClampedArray;
        try {
          data = ctx.getImageData(0, 0, n, n).data;
        } catch {
          return; // tainted canvas (direct cross-origin load): no tint
        }
        const palette = computeArtTint(data);
        if (!cancelled) setTint(palette);
      } catch {
        /* sampling failed: no tint */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, enabled]);
  return tint;
}

function pickVariant(
  w: number,
  h: number,
  forced: ModernVariant | "auto"
): ModernVariant {
  if (forced !== "auto") return forced;
  if (!w || !h) return "standard";
  if (h <= 72) return "compact";
  if (w < 300 && h < 150) return "simple";
  if (h >= w * 0.72) return "card";
  return "standard";
}

function Art({
  url,
  size,
  radius,
  fg,
  idle,
}: {
  url?: string;
  size: number;
  radius: number;
  fg: string;
  idle: boolean;
}) {
  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "rgba(0, 0, 0, 0.25)",
      }}
    >
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center" style={{ color: fg }}>
          <Music2 style={{ width: size * 0.45, height: size * 0.45, opacity: idle ? 0.5 : 0.7 }} />
        </div>
      )}
    </div>
  );
}

function ProgressRow({
  pct,
  sv,
  elapsed,
  remaining,
  showTimes,
}: {
  pct: number;
  sv: Surface;
  elapsed?: string;
  remaining?: string;
  showTimes: boolean;
}) {
  return (
    <div className="flex w-full items-center gap-2">
      {showTimes && elapsed ? (
        <span className="shrink-0 text-[10px] tabular-nums" style={{ color: sv.muted }}>
          {elapsed}
        </span>
      ) : null}
      <div
        className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full"
        style={{ background: sv.track }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: sv.fill }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
          style={{
            left: `calc(${pct}% - 6px)`,
            background: sv.fill,
            boxShadow: "0 1px 4px rgba(0, 0, 0, 0.4)",
          }}
        />
      </div>
      {showTimes && remaining ? (
        <span className="shrink-0 text-[10px] tabular-nums" style={{ color: sv.muted }}>
          {remaining}
        </span>
      ) : null}
    </div>
  );
}

export function ModernNowPlaying({
  track,
  artist,
  artUrl,
  progress = 0,
  elapsed,
  remaining,
  isPlaying = false,
  variant = "auto",
  style = "glass",
  tint = true,
  artBackground = false,
  showTimes = true,
  showProgress = true,
  waveform = false,
  waveformVariant = "bars",
  waveformMode = "scrolling",
  waveformBarWidth = 3,
  waveformBarGap = 1,
  waveformBarRadius = 1.5,
  waveformMinBarHeight = 4,
  waveformLineWidth = 1.5,
  waveformFadeEdges = true,
  waveformFadeWidth = 24,
  waveformActive = true,
  waveformSensitivity = 1,
  visualizer = false,
  visualizerBarCount = 24,
  visualizerAlign = "center",
  visualizerMirrored = false,
  visualizerMinLevel = 0.08,
  visualizerIdle = "static",
  visualizerLoading = false,
  visualizerOrientation = "horizontal",
  liveLevel,
  captureDeviceIds,
  chrome,
  className,
}: ModernNowPlayingProps) {
  const { ref, w, h } = useElementSize();
  const artTint = useArtTint(artUrl, tint);
  const v = pickVariant(w, h, variant);
  const sv = artTint ? makeSurfacePalette(style, artTint) : makeSurface(style, null);
  /** Accent color (standard option) overrides the surface's fill. */
  const fill = chrome?.accent || sv.fill;
  const pct = Math.min(100, Math.max(0, progress));
  const idle = !track && !artUrl;
  const trackLabel = track ?? "Nothing playing";
  const artistLabel = artist ?? "—";
  const hasTimes = Boolean(elapsed || remaining);

  /**
   * Live visualizers. Both the LiveWaveform (`waveform` view) and the
   * BarVisualizer (`visualizer` view) are fed by the same sensor level
   * source: the system audio level smoothed at 20 fps (fast attack, slow
   * release), so they animate between the ~1 Hz sensor pushes. The band
   * *shape* is a stable decorative per-track shape (`trackPeaks`); the
   * scrolling waveform scrolls the smoothed level history.
   */
  const visual = Boolean(waveform || visualizer);
  const liveSource = useSensorVisualSource({
    level: liveLevel ?? 0,
    shape: trackPeaks(track, artist),
    enabled: visual,
  });

  const timesSpan = (text?: string) =>
    text ? (
      <span className="shrink-0 text-[10px] tabular-nums" style={{ color: sv.muted }}>
        {text}
      </span>
    ) : null;

  const WaveformRow =
    waveform && !visualizer ? (
      <div className="flex w-full items-center gap-2">
        {showTimes ? timesSpan(elapsed) : null}
        <LiveWaveform
          source={liveSource}
          mode={waveformMode}
          variant={waveformVariant}
          barWidth={waveformBarWidth}
          barGap={waveformBarGap}
          barRadius={waveformBarRadius}
          minBarHeight={waveformMinBarHeight}
          lineWidth={waveformLineWidth}
          fadeEdges={waveformFadeEdges}
          fadeWidth={waveformFadeWidth}
          active={waveformActive}
          sensitivity={waveformSensitivity}
          aria-label="Live audio level"
          className="h-9 min-w-0 flex-1"
          style={{ color: fill }}
        />
        {showTimes ? timesSpan(remaining) : null}
      </div>
    ) : null;

  const VisualizerRow = visualizer ? (
    <div className="flex w-full items-center gap-2">
      {showTimes ? timesSpan(elapsed) : null}
      <BarVisualizer
        source={liveSource}
        barCount={visualizerBarCount}
        align={visualizerAlign}
        mirrored={visualizerMirrored}
        minLevel={visualizerMinLevel}
        idle={visualizerIdle}
        loading={visualizerLoading}
        orientation={visualizerOrientation}
        aria-label="Live audio level"
        className="h-9 min-w-0 flex-1"
        style={{ color: fill }}
      />
      {showTimes ? timesSpan(remaining) : null}
    </div>
  ) : null;

  /**
   * Pinned capture devices: one labeled live row each, stacked. Each row owns
   * its own Web Audio capture (real-time), so several sources show at once.
   * Shown only while a visualizer view is on.
   */
  const captureRows =
    captureDeviceIds && captureDeviceIds.length > 0 && visual ? (
      <div className="flex w-full flex-col gap-1.5">
        {captureDeviceIds.map((id) => (
          <CaptureVisualizerRow
            key={id}
            deviceId={id}
            waveform={waveform}
            visualizer={visualizer}
            waveformVariant={waveformVariant}
            waveformMode={waveformMode}
            waveformBarWidth={waveformBarWidth}
            waveformBarGap={waveformBarGap}
            waveformBarRadius={waveformBarRadius}
            waveformMinBarHeight={waveformMinBarHeight}
            waveformLineWidth={waveformLineWidth}
            waveformFadeEdges={waveformFadeEdges}
            waveformFadeWidth={waveformFadeWidth}
            waveformSensitivity={waveformSensitivity}
            visualizerBarCount={visualizerBarCount}
            visualizerAlign={visualizerAlign}
            visualizerMirrored={visualizerMirrored}
            visualizerMinLevel={visualizerMinLevel}
            visualizerIdle={visualizerIdle}
            visualizerLoading={visualizerLoading}
            visualizerOrientation={visualizerOrientation}
          />
        ))}
      </div>
    ) : null;

  /**
   * Visualizer views replace the progress bar; capture rows (pinned devices)
   * win over the single sensor row; `visualizer` wins over `waveform`.
   */
  const mediaRow = captureRows ?? VisualizerRow ?? WaveformRow;

  const boxStyle = {
    background: sv.background,
    color: sv.fg,
    boxShadow: `inset 0 0 0 1px ${sv.ring}`,
  } as const;

  /**
   * Blurred, darkened cover-art background (nutty.gg look). Full-bleed and
   * scaled up to hide the blur edge; the semi-transparent glass surface
   * (drawn by `boxStyle`) lets it show through, matte surfaces cover it.
   */
  const artBg =
    artBackground && artUrl ? (
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${artUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(28px) brightness(0.4) saturate(1.25)",
          transform: "scale(1.15)",
        }}
      />
    ) : null;

  let body: React.ReactNode;
  if (v === "card") {
    const art = Math.min(Math.max(96, Math.round(w * 0.45)), 220);
    body = (
      <div className="relative h-full w-full overflow-hidden rounded-[20px] p-4" style={boxStyle}>
        {artBg}
        <div className="relative flex h-full w-full flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <Art url={artUrl} size={art} radius={16} fg={sv.fg} idle={idle} />
          </div>
          <div className="mt-3 flex flex-col items-center gap-0.5">
            <div className="max-w-full truncate text-lg font-semibold tracking-tight">
              {trackLabel}
            </div>
            <div className="max-w-full truncate text-sm" style={{ color: sv.muted }}>
              {artistLabel}
            </div>
          </div>
          {showProgress && (
            <div className="mt-3">
              {mediaRow ?? (
                <ProgressRow pct={pct} sv={{ ...sv, fill }} elapsed={elapsed} remaining={remaining} showTimes={showTimes} />
              )}
            </div>
          )}
        </div>
      </div>
    );
  } else if (v === "compact") {
    body = (
      <div
        className="relative h-full w-full overflow-hidden rounded-full px-4"
        style={boxStyle}
      >
        {artBg}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: fill,
            opacity: style === "matte-light" ? 0.5 : 0.35,
          }}
        />
        <div className="relative flex h-full items-center gap-3">
          {isPlaying ? (
            <Play className="h-3.5 w-3.5 shrink-0 fill-current" style={{ color: sv.fg }} />
          ) : (
            <Pause className="h-3.5 w-3.5 shrink-0 fill-current" style={{ color: sv.fg }} />
          )}
          <Art url={artUrl} size={Math.min(32, Math.max(24, h * 0.55))} radius={8} fg={sv.fg} idle={idle} />
          <div className="min-w-0 truncate text-sm font-semibold">
            {trackLabel}
            <span className="ml-2 font-normal" style={{ color: sv.muted }}>
              {artistLabel}
            </span>
          </div>
          {showTimes && remaining && (
            <span className="ml-auto shrink-0 text-[10px] tabular-nums" style={{ color: sv.muted }}>
              {remaining}
            </span>
          )}
        </div>
      </div>
    );
  } else if (v === "simple") {
    const art = Math.min(56, Math.max(40, Math.round(h * 0.5)));
    body = (
      <div
        className="relative h-full w-full overflow-hidden rounded-xl p-3"
        style={boxStyle}
      >
        {artBg}
        <div className="relative flex h-full w-full items-center gap-3">
          <Art url={artUrl} size={art} radius={10} fg={sv.fg} idle={idle} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{trackLabel}</div>
            <div className="truncate text-xs" style={{ color: sv.muted }}>
              {artistLabel}
            </div>
            {showTimes && hasTimes && (
              <div className="text-[10px] tabular-nums" style={{ color: sv.muted }}>
                {elapsed ?? "0:00"} / {remaining ?? "--:--"}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } else {
    // standard
    const art = Math.min(Math.max(56, Math.round(h * 0.6)), 96);
    body = (
      <div
        className="relative h-full w-full overflow-hidden rounded-xl p-4"
        style={boxStyle}
      >
        {artBg}
        <div className="relative flex h-full w-full flex-col justify-center gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <Art url={artUrl} size={art} radius={12} fg={sv.fg} idle={idle} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-semibold tracking-tight">{trackLabel}</div>
              <div className="truncate text-sm" style={{ color: sv.muted }}>
                {artistLabel}
              </div>
            </div>
          </div>
          {showProgress &&
            (mediaRow ?? (
              <ProgressRow pct={pct} sv={{ ...sv, fill }} elapsed={elapsed} remaining={remaining} showTimes={showTimes} />
            ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("h-full w-full", className)}>
      <ModernChrome chrome={chrome}>{body}</ModernChrome>
    </div>
  );
}
