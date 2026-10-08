import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Music2, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

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
 * The surface can be tinted with the cover art's dominant color (sampled
 * onto a small canvas; cross-origin art degrades to an untinted surface).
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
  showTimes?: boolean;
  showProgress?: boolean;
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

/**
 * Average color of the cover art. Drawing a cross-origin image taints the
 * canvas and `getImageData` throws — in that case there is no tint.
 */
function useArtTint(url: string | undefined, enabled: boolean) {
  const [tint, setTint] = useState<RGB | null>(null);
  useEffect(() => {
    setTint(null);
    if (!url || !enabled) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      try {
        const n = 8;
        const c = document.createElement("canvas");
        c.width = n;
        c.height = n;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, n, n);
        const d = ctx.getImageData(0, 0, n, n).data;
        let r = 0;
        let g = 0;
        let b = 0;
        for (let i = 0; i < d.length; i += 4) {
          r += d[i];
          g += d[i + 1];
          b += d[i + 2];
        }
        const count = d.length / 4;
        if (!cancelled)
          setTint([Math.round(r / count), Math.round(g / count), Math.round(b / count)]);
      } catch {
        /* cross-origin art: no tint */
      }
    };
    img.src = url;
    return () => {
      cancelled = true;
      img.src = "";
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
  showTimes = true,
  showProgress = true,
  className,
}: ModernNowPlayingProps) {
  const { ref, w, h } = useElementSize();
  const artTint = useArtTint(artUrl, tint);
  const v = pickVariant(w, h, variant);
  const sv = makeSurface(style, artTint);
  const pct = Math.min(100, Math.max(0, progress));
  const idle = !track && !artUrl;
  const trackLabel = track ?? "Nothing playing";
  const artistLabel = artist ?? "—";
  const hasTimes = Boolean(elapsed || remaining);

  const boxStyle = {
    background: sv.background,
    color: sv.fg,
    boxShadow: `inset 0 0 0 1px ${sv.ring}`,
  } as const;

  let body: React.ReactNode;
  if (v === "card") {
    const art = Math.min(Math.max(96, Math.round(w * 0.45)), 220);
    body = (
      <div className="flex h-full w-full flex-col overflow-hidden rounded-[20px] p-4" style={boxStyle}>
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
            <ProgressRow pct={pct} sv={sv} elapsed={elapsed} remaining={remaining} showTimes={showTimes} />
          </div>
        )}
      </div>
    );
  } else if (v === "compact") {
    body = (
      <div
        className="relative h-full w-full overflow-hidden rounded-full px-4"
        style={boxStyle}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: sv.fill,
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
      <div className="flex h-full w-full items-center gap-3 overflow-hidden rounded-xl p-3" style={boxStyle}>
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
    );
  } else {
    // standard
    const art = Math.min(Math.max(56, Math.round(h * 0.6)), 96);
    body = (
      <div
        className="flex h-full w-full flex-col justify-center gap-3 overflow-hidden rounded-xl p-4"
        style={boxStyle}
      >
        <div className="flex min-w-0 items-center gap-4">
          <Art url={artUrl} size={art} radius={12} fg={sv.fg} idle={idle} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold tracking-tight">{trackLabel}</div>
            <div className="truncate text-sm" style={{ color: sv.muted }}>
              {artistLabel}
            </div>
          </div>
        </div>
        {showProgress && (
          <ProgressRow pct={pct} sv={sv} elapsed={elapsed} remaining={remaining} showTimes={showTimes} />
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("h-full w-full", className)}>
      {body}
    </div>
  );
}
