// Primitives: icons, numerals, meters, rings, graphs, chips, images and the inline visualiser.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { has, clamp, fmt, rows } from './data';
import { mix } from './tokens';
import { rampColor, accentOf, useSkin, TONES, tone } from './theme';

/* ───────── primitives ───────── */
export const Icon = ({ name, className = '', fill }) => (
  <span className={`material-symbols-rounded select-none leading-none ${className}`} style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400` }}>{name}</span>
);

const SCALES = ['sm', 'md', 'lg', 'xl', '2xl'];
export function Metric({ label, value, unit, d = 0, scale = 'md', sub, t = 'ok', align = 'left', className = '' }) {
  const sk = useSkin();
  const sc = sk.numUp ? SCALES[Math.min(4, SCALES.indexOf(scale) + 1)] : scale;
  const big = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl', xl: 'text-5xl', '2xl': 'text-7xl' }[sc];
  const shown = typeof value === 'number' ? fmt(value, d) : value;
  return (
    <div className={`flex min-w-0 flex-col ${align === 'center' ? 'items-center text-center' : ''} ${className}`}>
      {label && <span className="truncate text-[11px] font-medium text-zinc-400">{label}</span>}
      <span className={`${big} font-semibold leading-none tracking-tight tabular-nums`} style={{ fontFamily: sk.num, fontWeight: sk.numWeight, fontStretch: sk.numStretch, ...(sk.numGlow ? { color: 'color-mix(in oklab, var(--accent) 55%, #fff)', textShadow: '0 0 4px var(--accent), 0 0 14px var(--accent), 0 0 30px color-mix(in oklab, var(--accent) 50%, transparent)' } : null), ...(t !== 'ok' ? { color: TONES[t] } : null) }}>
        {shown}{unit && <span className="ml-0.5 align-top text-[0.45em] font-medium text-zinc-400">{unit}</span>}
      </span>
      {sub && <span className="mt-1 truncate text-[11px] text-zinc-500">{sub}</span>}
    </div>
  );
}

// Meter styles: bar · pill · segments · blocks (btop gradient) · hair
const blockColor = (i, n) => `oklch(0.78 0.16 ${150 - (i / Math.max(1, n - 1)) * 125})`;
export function Bar({ value, max = 100, t = 'ok', className = 'h-1.5', track = 'bg-white/[0.08]', style: meterStyle }) {
  const sk = useSkin();
  const m = meterStyle ?? sk.meter ?? 'bar';
  const pct = clamp((value / max) * 100);
  if (m === 'segments' || m === 'blocks') {
    const n = m === 'blocks' ? 14 : 24, lit = Math.round((pct / 100) * n);
    return (
      <div className={`flex w-full gap-[2px] ${className}`}>
        {Array.from({ length: n }, (_, i) => <span key={i} className="min-w-0 flex-1 rounded-[1px] transition-colors duration-300" style={{ background: i < lit ? (m === 'blocks' ? blockColor(i, n) : TONES[t]) : 'rgba(255,255,255,0.07)' }} />)}
      </div>
    );
  }
  if (m === 'wave') return (
    <div className={`relative w-full min-h-[8px] ${className}`}>
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        <line x1={pct} y1="5" x2="100" y2="5" stroke="rgba(255,255,255,.14)" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={Array.from({ length: Math.max(2, Math.round(pct / 2)) + 1 }, (_, i) => { const x = Math.min(pct, i * 2); return `${i ? 'L' : 'M'}${x.toFixed(2)},${(5 + Math.sin(i * 1.15) * 2.6).toFixed(2)}`; }).join('')}
          fill="none" stroke={TONES[t]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
  if (m === 'square') return (
    <div className={`w-full border border-white/70 bg-transparent p-[1px] min-h-[8px] ${className}`}>
      <div className="h-full transition-[width] duration-500" style={{ width: `${pct}%`, background: TONES[t] }} />
    </div>
  );
  if (m === 'hair') return (
    <div className={`relative w-full ${className}`}>
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/15" />
      <div className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 transition-[width] duration-500" style={{ width: `${pct}%`, background: TONES[t] }} />
    </div>
  );
  return (
    <div className={`w-full overflow-hidden rounded-full ${m === 'pill' ? 'bg-white/[0.12] min-h-[6px]' : track} ${className}`}>
      <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${pct}%`, background: m === 'pill' ? `linear-gradient(90deg, ${mix(70, '#fff')}, var(--accent))` : TONES[t], ...(t !== 'ok' && m === 'pill' ? { background: TONES[t] } : null) }} />
    </div>
  );
}

export function BarRow({ label, value, max = 100, display, hint, t, warn, crit }) {
  const tt = t ?? tone((value / max) * 100, warn, crit);
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline gap-2 text-xs">
        <span className="truncate text-zinc-300">{label}</span>
        {hint && <span className="truncate text-[11px] text-zinc-500">{hint}</span>}
        <span className="ml-auto shrink-0 font-medium tabular-nums">{display ?? `${fmt(value, 0)}%`}</span>
      </div>
      <Bar value={value} max={max} t={tt} />
    </div>
  );
}

export function Ring({ value, max = 100, thickness: th0 = 8, t = 'ok', children, className = '' }) {
  const sk = useSkin();
  const thickness = Math.max(1.5, th0 * (sk.ring ?? 1));
  const r = 50 - thickness / 2, c = 2 * Math.PI * r, pct = clamp(value / max, 0, 1);
  return (
    <div className={`relative aspect-square ${className}`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={thickness} />
        <circle cx="50" cy="50" r={r} fill="none" stroke={TONES[t]} strokeWidth={thickness} strokeLinecap={sk.skin === 'hud' || sk.skin === 'tui' ? 'butt' : 'round'}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset .6s ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

// Smooth (Catmull-Rom → cubic Bézier) area sparkline. Stretches to any box.
const smoothPath = (pts) => pts.reduce((acc, p, i, a) => {
  if (i === 0) return `M${p[0]},${p[1]}`;
  const p0 = a[i - 2] ?? a[i - 1], p1 = a[i - 1], p3 = a[i + 1] ?? p;
  const c1 = [p1[0] + (p[0] - p0[0]) / 6, p1[1] + (p[1] - p0[1]) / 6];
  const c2 = [p[0] - (p3[0] - p1[0]) / 6, p[1] - (p3[1] - p1[1]) / 6];
  return `${acc}C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p[0].toFixed(2)},${p[1].toFixed(2)}`;
}, '');
const BR_L = [0x01, 0x02, 0x04, 0x40], BR_R = [0x08, 0x10, 0x20, 0x80];
// btop-style braille area graph: 2×4 dots per character, rows tinted accent → red toward the top
function Braille({ values, lo, hi, className }) {
  const ref = useRef(null);
  const [dim, setDim] = useState({ c: 0, r: 0 });
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => { const { width, height } = e.contentRect; setDim({ c: Math.max(1, Math.floor(width / 6.02)), r: Math.max(1, Math.floor(height / 10)) }); });
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const { c: cols, r: rows } = dim, n = cols * 2, span = hi - lo || 1;
  const hts = Array.from({ length: n }, (_, i) => {
    const x = (values.length - 1) * (n > 1 ? i / (n - 1) : 1), a = values[Math.floor(x)], b = values[Math.ceil(x)];
    return Math.round(((a + (b - a) * (x % 1) - lo) / span) * rows * 4);
  });
  const lines = Array.from({ length: rows }, (_, cy) => {
    let s = '';
    for (let cx = 0; cx < cols; cx++) {
      let bits = 0;
      for (let sub = 0; sub < 4; sub++) {
        const lvl = (rows - 1 - cy) * 4 + (3 - sub);
        if (lvl < hts[cx * 2]) bits |= BR_L[sub];
        if (lvl < hts[cx * 2 + 1]) bits |= BR_R[sub];
      }
      s += String.fromCharCode(0x2800 + bits);
    }
    return s;
  });
  return (
    <div ref={ref} className={`overflow-hidden whitespace-pre font-mono text-[10px] leading-[10px] ${className}`} style={{ fontFamily: "'JetBrains Mono','Geist Mono',monospace" }}>
      {lines.map((l, i) => <div key={i} style={{ color: `color-mix(in oklab, var(--accent) ${Math.round(100 - (1 - i / Math.max(1, rows - 1)) * 70)}%, #f87171)` }}>{l}</div>)}
    </div>
  );
}
// Graph styles: area · line · step · bars · dots · braille (from the skin, or pass graph=)
export function Spark({ values = [], min, max, className = 'h-10', fill = true, color = 'var(--accent)', width = 1.75, graph }) {
  const id = useRef(`sp${Math.random().toString(36).slice(2, 8)}`).current;
  const sk = useSkin();
  const mode = graph ?? sk.graph ?? 'area';
  if (values.length < 2) return <div className={className} />;
  const lo = min ?? Math.min(...values), hi = max ?? Math.max(...values) * 1.08, span = hi - lo || 1;
  if (mode === 'braille') return <Braille values={values} lo={lo} hi={hi} className={className} />;
  const Y = (v) => Math.min(98, Math.max(2, 100 - ((v - lo) / span) * 94 - 3));
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, Y(v)]);
  const svg = (kids) => <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={`block w-full overflow-visible ${className}`} style={sk.glow ? { filter: 'drop-shadow(0 0 4px var(--accent))' } : undefined}>{kids}</svg>;
  if (mode === 'bars' || mode === 'dots') {
    const w = 100 / values.length;
    return svg(values.map((v, i) => mode === 'bars'
      ? <rect key={i} x={i * w + w * 0.15} y={Y(v)} width={w * 0.7} height={100 - Y(v)} fill={color} opacity={0.35 + 0.65 * (i / values.length)} />
      : <rect key={i} x={i * w + w * 0.2} y={Y(v) - 2} width={w * 0.6} height="4" rx="1" fill={color} opacity={0.3 + 0.7 * (i / values.length)} />));
  }
  const line = mode === 'step' ? pts.reduce((a, p, i) => (i ? `${a}H${p[0].toFixed(2)}V${p[1].toFixed(2)}` : `M${p[0]},${p[1]}`), '') : smoothPath(pts);
  const showFill = fill && mode === 'area';
  return svg(<>
    <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".32" /><stop offset=".7" stopColor={color} stopOpacity=".06" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
    {showFill && <path d={`${line}L100,100L0,100Z`} fill={`url(#${id})`} />}
    {mode === 'step' && fill && <path d={`${line}V100H0Z`} fill={color} opacity=".08" />}
    <path d={line} fill="none" stroke={color} strokeWidth={sk.skin === 'ink' ? 1 : width} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
  </>);
}

export const Dot = ({ ok, className = '' }) => (
  <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${className}`} style={{ background: ok ? '#4ade80' : '#52525b', boxShadow: ok ? '0 0 6px #4ade80' : 'none' }} />
);
export const Chip = ({ children, className = '' }) => (
  <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[10.5px] font-medium text-zinc-300 ${className}`}>{children}</span>
);
export const Stat = ({ label, value, className = '' }) => (
  <div className={`flex min-w-0 flex-col gap-0.5 ${className}`}>
    <span className="truncate text-[10.5px] text-zinc-500">{label}</span>
    <span className="truncate text-[13px] font-medium tabular-nums text-zinc-100">{value}</span>
  </div>
);
export function Empty({ icon = 'sensors_off', label = 'No data' }) {
  return <div className="flex h-full flex-col items-center justify-center gap-1 text-zinc-500"><Icon name={icon} className="text-xl" /><span className="text-xs">{label}</span></div>;
}
// Image with graceful fallback (localhost cover art, Steam CDN, …)
export function Img({ src, className = '', icon = 'image', alt = '' }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [src]);
  if (!has(src) || bad) return <div className={`flex items-center justify-center bg-white/[0.06] text-zinc-500 ${className}`}><Icon name={icon} className="text-[1.6em]" /></div>;
  return <img src={src} alt={alt} onError={() => setBad(true)} className={`object-cover ${className}`} />;
}

/* Band engine shared by <MiniViz> and the Visualizer widget. The API has no FFT, so bands are
   synthesised from the live L/R/level with a spectral envelope + per-band motion, then eased (fast attack, slow release).
   st = { v: [], pk: [], lv: 0 } is mutated in place; levels are 0–1. */
export function stepBands(st, { l = 0, r = 0, lv = 0, sens = 1.4 }, t, B) {
  st.lv += (Math.max(lv, l, r) * sens - st.lv) * 0.12;
  for (let i = 0; i < B; i++) {
    const x = i / Math.max(1, B - 1);
    const env = 0.35 + 0.65 * Math.exp(-((x - 0.28) ** 2) / 0.09) + 0.25 * Math.exp(-((x - 0.7) ** 2) / 0.02);
    const wob = 0.55 + 0.45 * Math.sin(t * (2.1 + (i % 7) * 0.53) + i * 1.7) * Math.sin(t * 1.3 + i * 0.37);
    const target = Math.min(1, 0.03 + st.lv * env * wob * (0.7 + (x < 0.5 ? l : r) * 0.6));
    const cur = st.v[i] ?? 0;
    st.v[i] = cur + (target - cur) * (target > cur ? 0.45 : 0.12);
    st.pk[i] = Math.max(st.v[i], (st.pk?.[i] ?? 0) - 0.006);
  }
  return st;
}
/* Inline canvas visualiser for media cards (replaces a progress bar). Driven by the level meter:
   l / r / level are 0–100. mode 'bars' | 'mirror' | 'wave' | 'dots' | 'line'. */
export function MiniViz({ l = 0, r = 0, level = 0, mode = 'bars', bands, ramp = 'accent', playing = true, sens = 1.5, className = '' }) {
  const cv = useRef(null);
  const live = useRef({});
  live.current = { l: l / 100, r: r / 100, lv: level / 100, mode, bands, ramp, playing, sens };
  useEffect(() => {
    let raf, vis = true, acc = '#34d399', accT = 0; const t0 = performance.now(); const st = { v: [], pk: [], lv: 0 };
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; }); if (cv.current) io.observe(cv.current);
    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      const c = cv.current; if (!c || !vis || document.hidden) return;
      const { width: w, height: h } = c.getBoundingClientRect(); if (!w || !h) return;
      const dpr = window.devicePixelRatio || 1;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      if (now - accT > 600) { acc = accentOf(c); accT = now; }
      const L = live.current, t = (now - t0) / 1000;
      const B = L.bands ?? Math.max(10, Math.min(72, Math.round(w / (L.mode === 'dots' ? 7 : 5))));
      stepBands(st, { l: L.l, r: L.r, lv: L.playing ? L.lv : 0, sens: L.sens }, t, B);
      const col = (v, a = 1) => { const s = L.ramp === 'accent' ? rampColor(0.4 + v * 0.6, 'accent', acc) : rampColor(v, L.ramp); return a === 1 ? s : s.replace('rgb(', 'rgba(').replace(')', `,${a})`); };
      if (L.mode === 'wave' || L.mode === 'line') {
        for (let layer = 0; layer < (L.mode === 'wave' ? 3 : 1); layer++) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 2) {
            const i = Math.min(B - 1, Math.floor((x / w) * B)), amp = st.v[i] * h * 0.45 * (1 - layer * 0.28);
            const y = h / 2 + Math.sin(x * (0.05 + layer * 0.02) + t * (4 + layer)) * amp;
            x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.strokeStyle = col(1 - layer * 0.3, 1 - layer * 0.3); ctx.lineWidth = 1.8 - layer * 0.4; ctx.lineCap = 'round'; ctx.stroke();
        }
      } else if (L.mode === 'dots') {
        const s = w / B, rows = Math.max(3, Math.floor(h / s));
        for (let i = 0; i < B; i++) for (let j = 0; j < rows; j++) {
          ctx.fillStyle = j < Math.round(st.v[i] * rows) ? col(j / rows) : 'rgba(255,255,255,0.06)';
          ctx.beginPath(); ctx.arc((i + 0.5) * s, h - (j + 0.5) * s, s * 0.3, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        const bw = w / B, gap = Math.max(1, bw * 0.3), mid = h / 2;
        for (let i = 0; i < B; i++) {
          const v = st.v[i], ww = bw - gap, x = i * bw + gap / 2;
          ctx.fillStyle = col(v);
          ctx.beginPath();
          if (L.mode === 'mirror') ctx.roundRect(x, mid - v * mid, ww, Math.max(1.5, v * h), ww / 2);
          else ctx.roundRect(x, h - Math.max(1.5, v * h), ww, Math.max(1.5, v * h), [ww / 2, ww / 2, 0, 0]);
          ctx.fill();
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);
  return <canvas ref={cv} className={`block w-full ${className}`} />;
}

/* ───────── shared building blocks (extracted from widgets during the audit) ───────── */
// Skin-aware big numerals (font, weight, stretch, glow). Use for every hero number.
export function Num({ children, className = '', style, weight = 700 }) {
  const sk = useSkin();
  return <span className={`tabular-nums ${className}`} style={{ fontFamily: sk.num, fontWeight: sk.numWeight ?? weight, fontStretch: sk.numStretch, ...(sk.numGlow ? { textShadow: '0 0 4px var(--accent), 0 0 14px var(--accent)' } : null), ...style }}>{children}</span>;
}
// Status pill: state 'ok' | 'warn' | 'crit' | 'off' — filled dot for live states, hollow dot for off.
const PILL = { ok: '#3CC97F', warn: '#EDB232', crit: '#F2665E', off: '#a1a1aa' };
export function Pill({ state = 'ok', children, className = '' }) {
  const c = PILL[state] ?? PILL.off;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${className}`} style={{ color: c, background: state === 'off' ? 'rgba(255,255,255,0.07)' : `color-mix(in oklab, ${c} 13%, transparent)` }}>
      <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={state === 'off' ? { border: '1.5px solid currentColor' } : { background: 'currentColor' }} />{children}
    </span>
  );
}
// Segmented control: options [[value, label]]
export function Segmented({ value, options, onChange, className = '' }) {
  return (
    <span className={`inline-flex rounded-md bg-white/[0.06] p-[2px] ${className}`}>
      {options.map(([v, l]) => <button key={v} type="button" onClick={() => onChange?.(v)} className={`whitespace-nowrap rounded px-2 py-0.5 text-[10.5px] ${value === v ? 'bg-white/[0.12] text-zinc-100' : 'text-zinc-400'}`}>{l}</button>)}
    </span>
  );
}
// Weather condition text / icon slug → Material Symbols name (Yr + OpenWeatherMap)
export const weatherIcon = (s = '') => { s = String(s).toLowerCase();
  if (/thunder/.test(s)) return 'thunderstorm'; if (/snow|sleet/.test(s)) return 'weather_snowy'; if (/rain|drizzle|shower/.test(s)) return 'rainy';
  if (/fog|mist/.test(s)) return 'foggy'; if (/partly|fair/.test(s)) return /night/.test(s) ? 'partly_cloudy_night' : 'partly_cloudy_day';
  if (/cloud/.test(s)) return 'cloud'; if (/clear|sun/.test(s)) return /night/.test(s) ? 'clear_night' : 'clear_day'; return 'partly_cloudy_day'; };
// Slow pan/zoom background image (Web Animations API — no CSS keyframes needed)
export function KenBurns({ src, className = '', on = true }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el || !on || !el.animate) return;
    const a = el.animate([{ transform: 'scale(1.06) translate(0%,0%)' }, { transform: 'scale(1.18) translate(-2.5%,-1.5%)' }], { duration: 22000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    return () => a.cancel();
  }, [on, src]);
  return <div ref={ref} className={`absolute inset-0 ${className}`}><Img src={src} icon="sports_esports" className="h-full w-full" /></div>;
}
// Logo image that falls back to a typeset title when the URL can't load
export function Logo({ src, name, className = '', size = 'text-3xl' }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [src]);
  if (!has(src) || bad) return <span className={`block font-black uppercase leading-[0.9] tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,.8)] ${size} ${className}`}>{name}</span>;
  return <img src={src} alt={name} onError={() => setBad(true)} className={`object-contain object-left drop-shadow-[0_4px_18px_rgba(0,0,0,.7)] ${className}`} />;
}
