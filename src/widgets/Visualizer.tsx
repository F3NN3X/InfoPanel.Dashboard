import { useEffect, useRef } from "react";
import { useFastSensors } from "@/hooks/useSensors";
import type { ModuleSettings } from "@/modules/types";
import { Widget, shell, get, num, fmt, rampColor, accentOf, stepBands, type BandState, type ShellProps, type WidgetMeta } from "./kit";
import { AUDIO, levelDevice, spectrumOf } from "./audio-device";

export const meta: WidgetMeta = {
  id: "Visualizer",
  name: "Visualizer",
  category: "Audio",
  icon: "equalizer",
  prefixes: [],
  defaultSize: [3, 2],
  minSize: [1, 1],
  description: "Canvas audio visualiser driven by the level meter (L/R + level): bars, mirror, radial, wave, blob and LED-dot modes at 60 fps.",
};

type Mode = "bars" | "mirror" | "radial" | "wave" | "blob" | "dots";

interface Live {
  spectrum: Float32Array | null;
  l: number;
  r: number;
  lv: number;
  mode: Mode;
  ramp: string;
  bands?: number;
  sens: number;
  peaks: boolean;
  skin?: string;
}

export interface VisualizerProps extends ShellProps {
  look?: ModuleSettings;
  mode?: Mode;
  /** audio-level-meter container, default "default-audio" */
  device?: string;
  bands?: number;
  ramp?: string;
  sensitivity?: number;
  /** default true */
  peaks?: boolean;
}

// Bands are the AudioMeter plugin's spectrum (v1.3.0+); without it every band follows the live level.
export default function Visualizer(p: VisualizerProps) {
  useFastSensors(AUDIO);
  const d = p.data;
  // Auto ("" or unset) follows the loudest live device, like the media widget
  const dev = levelDevice(d, p.device ?? "", p.names);
  const k = (s: string) => num(get(d, `plugins.audio-level-meter.${dev}.${s}`));
  // the one rAF loop reads this ref; props never restart it
  const live = useRef<Live>({ spectrum: null, l: 0, r: 0, lv: 0, mode: "bars", ramp: "accent", sens: 1.4, peaks: true });
  live.current = { spectrum: spectrumOf(d, dev), l: (k("left-channel") || 0) / 100, r: (k("right-channel") || 0) / 100, lv: (k("audio-level") || 0) / 100, mode: p.mode ?? "bars", ramp: p.ramp ?? "accent", bands: p.bands, sens: p.sensitivity ?? 1.4, peaks: p.peaks !== false, skin: p.skin };
  const name = String(get(d, `plugins.audio-level-meter.${dev}.device-name`) || "Audio").replace(/\s*\(.+\)$/, "");
  const cv = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let raf = 0,
      vis = true,
      acc = "#34d399",
      track = "rgba(255,255,255,0.05)",
      accT = -Infinity;
    const t0 = performance.now();
    const st: BandState = { v: [], pk: [], lv: 0 };
    const running = () => vis && !document.hidden;
    const draw = (now: number) => {
      raf = 0;
      if (!running()) return;
      raf = requestAnimationFrame(draw);
      const c = cv.current;
      if (!c) return;
      const { width: w, height: h } = c.getBoundingClientRect();
      if (!w || !h) return;
      const dpr = window.devicePixelRatio || 1;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const L = live.current,
        t = (now - t0) / 1000;
      if (now - accT > 600) {
        acc = accentOf(c);
        track = getComputedStyle(c).getPropertyValue("--w-track").trim() || track;
        accT = now;
      }
      const mode = L.mode,
        B = L.bands ?? Math.max(8, Math.min(64, Math.round((mode === "radial" || mode === "blob" ? Math.min(w, h) * 2.4 : w) / (mode === "dots" ? 12 : 9))));
      stepBands(st, { spectrum: L.spectrum, l: L.l, r: L.r, lv: L.lv, sens: L.sens }, B);
      const col = (v: number, a = 1) => {
        const s = L.ramp === "accent" ? rampColor(0.35 + v * 0.65, "accent", acc) : rampColor(v, L.ramp);
        return a === 1 ? s : s.replace("rgb(", "rgba(").replace(")", `,${a})`);
      };
      const glow = L.skin === "synth" || L.skin === "nixie" || L.skin === "hud";
      ctx.shadowBlur = glow ? 10 : 0;
      ctx.shadowColor = acc;
      if (mode === "bars" || mode === "mirror") {
        const bw = w / B,
          gap = Math.max(1, bw * 0.28),
          mid = h / 2;
        for (let i = 0; i < B; i++) {
          const v = st.v[i],
            bh = mode === "mirror" ? v * mid : v * h,
            x = i * bw + gap / 2,
            ww = bw - gap;
          const g = ctx.createLinearGradient(0, h, 0, 0);
          g.addColorStop(0, col(0.15));
          g.addColorStop(1, col(v));
          ctx.fillStyle = g;
          if (mode === "mirror") {
            ctx.beginPath();
            ctx.roundRect(x, mid - bh, ww, bh * 2, ww / 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.roundRect(x, h - bh, ww, bh, [ww / 2, ww / 2, 1, 1]);
            ctx.fill();
            if (L.peaks) {
              ctx.fillStyle = col(1, 0.9);
              ctx.fillRect(x, h - st.pk[i] * h - 3, ww, 2);
            }
          }
        }
      } else if (mode === "dots") {
        const cols = B,
          s = w / cols,
          rows = Math.max(4, Math.floor(h / s));
        for (let i = 0; i < cols; i++)
          for (let j = 0; j < rows; j++) {
            const on = j < Math.round(st.v[i] * rows),
              y = h - (j + 0.5) * s;
            ctx.fillStyle = on ? col(j / rows) : track;
            ctx.beginPath();
            ctx.arc((i + 0.5) * s, y, s * 0.32, 0, Math.PI * 2);
            ctx.fill();
          }
      } else if (mode === "wave") {
        for (let layer = 0; layer < 3; layer++) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 3) {
            const i = Math.min(B - 1, Math.floor((x / w) * B)),
              amp = st.v[i] * h * 0.42 * (1 - layer * 0.25);
            const y = h / 2 + Math.sin(x * (0.025 + layer * 0.012) + t * (3 + layer)) * amp;
            if (x) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
          }
          ctx.strokeStyle = col(1 - layer * 0.3, 1 - layer * 0.3);
          ctx.lineWidth = 2.2 - layer * 0.5;
          ctx.stroke();
        }
      } else {
        const cx = w / 2,
          cy = h / 2,
          R = Math.min(w, h) * (mode === "blob" ? 0.26 : 0.24);
        if (mode === "radial") {
          for (let i = 0; i < B; i++) {
            const a = (i / B) * Math.PI * 2 - Math.PI / 2,
              len = st.v[i] * Math.min(w, h) * 0.24 + 2;
            ctx.strokeStyle = col(st.v[i]);
            ctx.lineWidth = Math.max(1.5, ((Math.PI * 2 * R) / B) * 0.55);
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
            ctx.lineTo(cx + Math.cos(a) * (R + len), cy + Math.sin(a) * (R + len));
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(cx, cy, R * (0.82 + st.lv * 0.12), 0, Math.PI * 2);
          ctx.fillStyle = col(0.2, 0.35);
          ctx.fill();
        } else {
          const pts = Array.from({ length: B }, (_, i) => {
            const a = (i / B) * Math.PI * 2;
            const rr = R * (1 + st.v[i] * 0.9);
            return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
          });
          const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2);
          g.addColorStop(0, col(1, 0.95));
          g.addColorStop(1, col(0.1, 0.15));
          ctx.beginPath();
          pts.forEach((pt, i) => {
            const nx = pts[(i + 1) % B];
            const mx = (pt[0] + nx[0]) / 2,
              my = (pt[1] + nx[1]) / 2;
            if (i) ctx.quadraticCurveTo(pt[0], pt[1], mx, my);
            else ctx.moveTo(mx, my);
          });
          ctx.quadraticCurveTo(pts[0][0], pts[0][1], (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
          ctx.fillStyle = g;
          ctx.fill();
        }
      }
    };
    // the loop stops while off-screen or hidden and restarts when visible again
    const wake = () => {
      if (!raf && running()) raf = requestAnimationFrame(draw);
    };
    const io =
      typeof IntersectionObserver === "undefined"
        ? undefined
        : new IntersectionObserver(([e]) => {
            vis = e.isIntersecting;
            wake();
          });
    if (io && cv.current) io.observe(cv.current);
    document.addEventListener("visibilitychange", wake);
    wake();
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      document.removeEventListener("visibilitychange", wake);
    };
    // the canvas is unmounted by the studio variant, so the loop and observer follow the variant
  }, [p.variant]);
  return (
    <Widget
      {...shell(p)}
      title={p.title ?? name}
      icon="equalizer"
      studio={{ label: name, live: (k("audio-level") || 0) > 0, value: fmt(k("peak-level"), 1), unit: "dB", meters: [{ n: "L", v: k("left-channel") }, { n: "R", v: k("right-channel") }, { n: "LVL", v: k("audio-level") }] }}
      right={<span className="font-mono text-[10.5px] tabular-nums text-[color:var(--w-muted)]">{fmt(k("peak-level"), 1)} dB</span>}
    >
      <canvas ref={cv} className="absolute inset-0 h-full w-full" />
    </Widget>
  );
}
