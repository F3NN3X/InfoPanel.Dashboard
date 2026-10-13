// One drawing per style on a 2D context, from the frame's bands, waveform or level history. Nothing
// here keeps time or invents motion: the same input draws the same pixels.
import { colorAt, css, type Palette } from "./palette";
import type { VizInput, VizLook, VizStyle } from "./types";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What the engine hands each drawing besides the input: the bands at the drawn count, and their peak caps. */
export interface DrawFrame {
  bars: Float32Array;
  peaks: Float32Array | null;
}

export type Drawer = (ctx: CanvasRenderingContext2D, w: number, h: number, input: VizInput, pal: Palette, look: VizLook, frame: DrawFrame) => void;

const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

/** Bars, dots or spokes drawn for a style at a size: `look.count`, else sized to the canvas. */
export function barCount(style: VizStyle, look: Pick<VizLook, "count" | "orientation">, w: number, h: number): number {
  if (look.count > 0) return Math.round(look.count);
  if (style === "dots") return clampN(w / 10, 6, 48);
  if (style === "radial" || style === "blob") return clampN((Math.min(w, h) * 2.4) / 9, 8, 64);
  if (style === "scroll") return clampN(w / 4, 8, 160);
  return clampN((look.orientation === "vertical" ? h : w) / 7, 8, 72);
}

/** LED cells of 3 px with a 1 px gap that fit a bar of `len` px. */
export const segmentCount = (len: number, cell = 3, gap = 1): number => Math.max(0, Math.floor((len + gap) / (cell + gap)));

export type BarGeometry = Pick<VizLook, "gap" | "align" | "orientation" | "minLevel" | "minPx">;

/**
 * One rect per value: equal slots along the row (or column), each bar `1 - gap` of its slot, its
 * length the value (never below `minLevel` of the length or `minPx`), grown from `align`.
 */
export function bandRects(values: ArrayLike<number>, w: number, h: number, g: BarGeometry): Rect[] {
  const n = values.length;
  const vertical = g.orientation === "vertical";
  const across = vertical ? h : w;
  const along = vertical ? w : h;
  const slot = across / Math.max(1, n);
  const thick = Math.max(1, slot * (1 - Math.min(0.8, Math.max(0, g.gap))));
  const out: Rect[] = [];
  for (let i = 0; i < n; i++) {
    const v = Math.min(1, Math.max(0, values[i] ?? 0));
    const len = Math.min(along, Math.max(v * along, g.minLevel * along, g.minPx));
    const a = i * slot + (slot - thick) / 2;
    const b = g.align === "start" ? 0 : g.align === "center" ? (along - len) / 2 : along - len;
    out.push(vertical ? { x: b, y: a, w: len, h: thick } : { x: a, y: b, w: thick, h: len });
  }
  return out;
}

/** The fill for a value: one colour, one gradient over the canvas, or the ramp's colour at the value. */
function fillOf(ctx: CanvasRenderingContext2D, pal: Palette, w: number, h: number): (v: number, alpha?: number) => string | CanvasGradient {
  if (pal.mode === "solid") return (_v, a = 1) => css(pal.stops[0], a);
  if (pal.mode === "gradient") {
    const g = pal.gradient === "horizontal" ? ctx.createLinearGradient(0, 0, w, 0) : pal.gradient === "radial" ? ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2) : ctx.createLinearGradient(0, h, 0, 0);
    pal.stops.forEach((s, i) => g.addColorStop(pal.stops.length === 1 ? 0 : i / (pal.stops.length - 1), css(s)));
    return () => g;
  }
  return (v, a = 1) => css(colorAt(pal.stops, v), a);
}

function barPath(ctx: CanvasRenderingContext2D, r: Rect, shape: Palette["shape"], align: VizLook["align"], vertical: boolean) {
  ctx.beginPath();
  if (shape === "square" || typeof ctx.roundRect !== "function") return ctx.rect(r.x, r.y, r.w, r.h);
  const rad = Math.min(vertical ? r.h : r.w, vertical ? r.w : r.h) / 2;
  if (shape === "pill" || align === "center") return ctx.roundRect(r.x, r.y, r.w, r.h, rad);
  // round: only the free end is rounded
  const free = align === "end" ? (vertical ? [0, rad, rad, 0] : [rad, rad, 0, 0]) : vertical ? [rad, 0, 0, rad] : [0, 0, rad, rad];
  ctx.roundRect(r.x, r.y, r.w, r.h, free);
}

/** LED cells along a bar, from its anchor (both ways from the middle when centred), coloured by distance. */
function drawSegments(ctx: CanvasRenderingContext2D, r: Rect, fill: (v: number) => string | CanvasGradient, align: VizLook["align"], vertical: boolean, along: number) {
  const s0 = vertical ? r.x : r.y;
  const len = vertical ? r.w : r.h;
  const cell = (pos: number, t: number) => {
    ctx.fillStyle = fill(t);
    if (vertical) ctx.fillRect(pos, r.y, 3, r.h);
    else ctx.fillRect(r.x, pos, r.w, 3);
  };
  if (align === "center") {
    const mid = s0 + len / 2;
    for (let j = 0, n = segmentCount(len / 2); j < n; j++) {
      const t = (j * 4 + 1.5) / (along / 2);
      cell(mid + j * 4 + 0.5, t);
      cell(mid - j * 4 - 3.5, t);
    }
    return;
  }
  for (let j = 0, n = segmentCount(len); j < n; j++) cell(align === "end" ? s0 + len - j * 4 - 3 : s0 + j * 4, (j * 4 + 1.5) / along);
}

function drawBarsWith(align: VizLook["align"]): Drawer {
  return (ctx, w, h, _input, pal, look, { bars, peaks }) => {
    const vertical = look.orientation === "vertical";
    const along = vertical ? w : h;
    const rects = bandRects(bars, w, h, { ...look, align });
    const fill = fillOf(ctx, pal, w, h);
    rects.forEach((r, i) => {
      if (pal.shape === "segments") return drawSegments(ctx, r, fill, align, vertical, along);
      ctx.fillStyle = fill(bars[i]);
      barPath(ctx, r, pal.shape, align, vertical);
      ctx.fill();
    });
    if (!peaks) return;
    ctx.fillStyle = css(pal.peak, 0.9);
    rects.forEach((r, i) => {
      const p = peaks[i] * along;
      if (p <= 0) return;
      const at = (s: number) => (vertical ? ctx.fillRect(s, r.y, 2, r.h) : ctx.fillRect(r.x, s, r.w, 2));
      if (align === "end") at(along - p - 3);
      else if (align === "start") at(p + 1);
      else {
        at(along / 2 - p / 2 - 3);
        at(along / 2 + p / 2 + 1);
      }
    });
  };
}

const drawDots: Drawer = (ctx, w, h, _input, pal, _look, { bars }) => {
  const n = bars.length;
  const s = w / n;
  const rows = Math.max(3, Math.floor(h / s));
  const fill = fillOf(ctx, pal, w, h);
  const track = css(pal.track);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < rows; j++) {
      ctx.fillStyle = j < Math.round(bars[i] * rows) ? fill(j / rows) : track;
      ctx.beginPath();
      ctx.arc((i + 0.5) * s, h - (j + 0.5) * s, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
};

/** A smooth Catmull-Rom curve through the points (as Béziers). */
export function catmullRom(ctx: CanvasRenderingContext2D, pts: readonly [number, number][], move = true) {
  if (pts.length === 0) return;
  if (move) ctx.moveTo(pts[0][0], pts[0][1]);
  else ctx.lineTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
}

/** The band curve's points across the width, `y(v)` per band. */
const bandPoints = (bands: ArrayLike<number>, w: number, y: (v: number) => number): [number, number][] =>
  Array.from({ length: bands.length }, (_, i) => [bands.length === 1 ? w / 2 : (i / (bands.length - 1)) * w, y(bands[i])]);

/** The captured waveform as a trace across the width, `scale` of the half height. */
function waveTrace(ctx: CanvasRenderingContext2D, wave: Float32Array, w: number, h: number, scale: number, gain: number) {
  const mid = h / 2;
  const step = Math.max(1, Math.floor(wave.length / Math.max(2, w / 2)));
  ctx.beginPath();
  for (let i = 0, k = 0; i < wave.length; i += step, k++) {
    const x = (i / (wave.length - 1)) * w;
    const y = mid - Math.max(-1, Math.min(1, wave[i] * gain)) * (mid - 1) * scale;
    if (k) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
}

const LAYERS = [
  { k: 1, a: 1, lw: 1 },
  { k: 0.7, a: 0.55, lw: 0.8 },
  { k: 0.45, a: 0.3, lw: 0.6 },
];

function drawTrace(layers: typeof LAYERS): Drawer {
  return (ctx, w, h, input, pal, look) => {
    const fill = fillOf(ctx, pal, w, h);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const mirrored = layers.length > 1;
    for (const L of layers) {
      ctx.strokeStyle = fill(Math.max(0.35, input.level) * L.k, L.a);
      ctx.lineWidth = look.lineWidth * L.lw;
      if (input.wave && input.wave.length > 1) {
        waveTrace(ctx, input.wave, w, h, L.k, look.gain);
        continue;
      }
      const lw = look.lineWidth;
      ctx.beginPath();
      if (mirrored) {
        const amp = (h / 2 - lw) * L.k;
        catmullRom(ctx, bandPoints(input.bands, w, (v) => h / 2 - v * amp));
        ctx.stroke();
        ctx.beginPath();
        catmullRom(ctx, bandPoints(input.bands, w, (v) => h / 2 + v * amp));
      } else catmullRom(ctx, bandPoints(input.bands, w, (v) => h - lw - v * (h - 2 * lw)));
      ctx.stroke();
    }
  };
}

const drawRadial: Drawer = (ctx, w, h, input, pal, _look, { bars }) => {
  const n = bars.length;
  const cx = w / 2;
  const cy = h / 2;
  const m = Math.min(w, h);
  const R = m * 0.24;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.5, ((Math.PI * 2 * R) / n) * 0.55);
  const fill = fillOf(ctx, pal, w, h);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const len = bars[i] * m * 0.24 + 2;
    ctx.strokeStyle = fill(bars[i]);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.lineTo(cx + Math.cos(a) * (R + len), cy + Math.sin(a) * (R + len));
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, R * (0.82 + input.level * 0.12), 0, Math.PI * 2);
  ctx.fillStyle = css(colorAt(pal.stops, 0.2), 0.35);
  ctx.fill();
};

const drawBlob: Drawer = (ctx, w, h, _input, pal, _look, { bars }) => {
  const n = bars.length;
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.26;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = R * (1 + bars[i] * 0.9);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
  const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2);
  g.addColorStop(0, css(colorAt(pal.stops, 1), 0.95));
  g.addColorStop(1, css(colorAt(pal.stops, 0.1), 0.15));
  ctx.beginPath();
  pts.forEach((pt, i) => {
    const nx = pts[(i + 1) % n];
    const mx = (pt[0] + nx[0]) / 2;
    const my = (pt[1] + nx[1]) / 2;
    if (i) ctx.quadraticCurveTo(pt[0], pt[1], mx, my);
    else ctx.moveTo(mx, my);
  });
  ctx.quadraticCurveTo(pts[0][0], pts[0][1], (pts[0][0] + pts[1 % n][0]) / 2, (pts[0][1] + pts[1 % n][1]) / 2);
  ctx.fillStyle = g;
  ctx.fill();
};

/** The newest `count` history samples, oldest first. */
export function historyTail(history: VizInput["history"], count: number): Float32Array {
  const n = Math.min(count, history.length);
  const out = new Float32Array(n);
  const size = history.buf.length;
  for (let i = 0; i < n; i++) out[i] = history.buf[(history.start + history.length - n + i) % size];
  return out;
}

const drawScroll: Drawer = (ctx, w, h, input, pal, look, { bars }) => {
  const count = bars.length;
  const vals = historyTail(input.history, count);
  const slot = w / count;
  const off = count - vals.length;
  const fill = fillOf(ctx, pal, w, h);
  if (look.scrollAs === "line") {
    const mid = h / 2;
    const amp = mid - look.lineWidth;
    const xs = (i: number) => (off + i + 0.5) * slot;
    ctx.beginPath();
    vals.forEach((v, i) => (i ? ctx.lineTo(xs(i), mid - v * amp) : ctx.moveTo(xs(i), mid - v * amp)));
    for (let i = vals.length - 1; i >= 0; i--) ctx.lineTo(xs(i), mid + vals[i] * amp);
    ctx.closePath();
    ctx.fillStyle = fill(input.level, 0.25);
    ctx.fill();
    ctx.strokeStyle = fill(input.level);
    ctx.lineWidth = look.lineWidth;
    ctx.stroke();
    return;
  }
  const rects = bandRects(vals, vals.length * slot, h, { ...look, orientation: "horizontal" });
  rects.forEach((r, i) => {
    r.x += off * slot;
    ctx.fillStyle = fill(vals[i]);
    barPath(ctx, r, pal.shape === "segments" ? "square" : pal.shape, look.align, false);
    ctx.fill();
  });
};

export const DRAW: Record<VizStyle, Drawer> = {
  bars: (ctx, w, h, input, pal, look, frame) => drawBarsWith(look.align)(ctx, w, h, input, pal, look, frame),
  mirror: drawBarsWith("center"),
  dots: drawDots,
  wave: drawTrace(LAYERS),
  line: drawTrace(LAYERS.slice(0, 1)),
  radial: drawRadial,
  blob: drawBlob,
  scroll: drawScroll,
};

/** Fades the left and right `width` px out of what is drawn. */
export function fadeEdges(ctx: CanvasRenderingContext2D, w: number, h: number, width: number) {
  const edge = Math.min(width, w / 2);
  if (edge <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  const l = ctx.createLinearGradient(0, 0, edge, 0);
  l.addColorStop(0, "rgba(0,0,0,1)");
  l.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = l;
  ctx.fillRect(0, 0, edge, h);
  const r = ctx.createLinearGradient(w - edge, 0, w, 0);
  r.addColorStop(0, "rgba(0,0,0,0)");
  r.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = r;
  ctx.fillRect(w - edge, 0, edge, h);
  ctx.restore();
}
