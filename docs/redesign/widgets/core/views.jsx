// Shared layouts: CompactView (tile / strip / column), StudioView (variant="studio") and the per-skin headers.
import React from 'react';
import { clamp, fmt } from './data';
import { mix } from './tokens';
import { useSkin, TONES } from './theme';
import { Icon, Bar, Ring, Spark, Img } from './primitives';

/* Compact views — rendered automatically for tile / strip / column shapes when a widget passes `compact`.
   compact = { label, value, unit, d, sub, icon, t, pct, hist, img, kind: 'spark' | 'bar' | 'ring' | 'text' } */
export function CompactView({ c, shape, w, h, icon }) {
  const sk = useSkin();
  const kind = c.kind ?? (c.hist ? 'spark' : Number.isFinite(c.pct) ? 'bar' : 'text');
  const val = typeof c.value === 'number' ? fmt(c.value, c.d ?? 0) : c.value;
  // numbers shrink to fit the available width instead of overflowing (text values clamp instead)
  const textLen = String(val ?? '–').length + (c.unit ? String(c.unit).length * 0.45 : 0);
  const fit = (base, avail) => ({ fontSize: Math.round(Math.max(13, Math.min(base, avail / (Math.max(2.5, textLen) * 0.62)))) });
  const Val = ({ cls, base, avail }) => (
    <span className={`${cls} block max-w-full overflow-hidden whitespace-nowrap font-semibold leading-none tracking-tight tabular-nums`} style={{ ...(base ? fit(base, avail) : null), fontFamily: sk.num, fontWeight: sk.numWeight, ...(sk.numGlow ? { color: 'color-mix(in oklab, var(--accent) 55%, #fff)', textShadow: '0 0 4px var(--accent), 0 0 14px var(--accent)' } : null), ...(c.t && c.t !== 'ok' ? { color: TONES[c.t] } : null) }}>
      {val ?? '–'}{c.unit && <span className="ml-0.5 text-[0.45em] font-medium text-zinc-400">{c.unit}</span>}
    </span>
  );
  const Label = (
    <div className="flex min-w-0 items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-zinc-400">
      <Icon name={c.icon ?? icon} className="text-[14px] text-[color:var(--accent)]" /><span className="truncate">{c.label}</span>
    </div>
  );
  const textVal = kind === 'text';
  if (c.img && shape !== 'strip') return (
    <div className="absolute inset-0">
      <Img src={c.img} icon={c.icon ?? icon} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3">
        <span className="line-clamp-2 text-sm font-semibold leading-tight">{val}</span>
        {c.sub && <span className="truncate text-[11px] text-zinc-300">{c.sub}</span>}
        {c.viz ? <div className="mt-1.5">{c.viz('h-6')}</div> : Number.isFinite(c.pct) && <Bar value={c.pct} className="mt-1.5 h-1" track="bg-white/20" />}
      </div>
    </div>
  );
  if (shape === 'strip') return (
    <div className="flex h-full min-w-0 items-center gap-4">
      {c.img ? <Img src={c.img} icon={c.icon ?? icon} className="aspect-square h-full max-h-20 shrink-0 rounded-lg" /> : null}
      <div className={`flex min-w-0 flex-col gap-1.5 ${textVal || c.img ? 'flex-1' : 'shrink-0'}`}>
        {Label}
        {textVal ? <Val cls="truncate text-base" /> : <Val cls="" base={h < 130 ? 24 : 30} avail={w * 0.38} />}
        {c.sub && <span className="truncate text-[11px] text-zinc-500">{c.sub}</span>}
      </div>
      {kind === 'spark' && <Spark values={c.hist} min={c.min} max={c.max} className="h-[70%] min-w-0 flex-1" />}
      {kind === 'bar' && <div className="flex min-w-0 flex-1 flex-col gap-1"><Bar value={c.pct} t={c.t} className="h-2" /></div>}
      {kind === 'ring' && <Ring value={c.pct} t={c.t} thickness={11} className="h-[78%] shrink-0" />}
      {c.viz ? <div className="min-w-0 flex-1">{c.viz('h-[56%] max-h-14')}</div> : textVal && Number.isFinite(c.pct) && <Bar value={c.pct} className="h-1 w-1/4 shrink-0" />}
    </div>
  );
  if (shape === 'column') return (
    <div className="flex h-full min-w-0 flex-col gap-2">
      {Label}
      {textVal ? <span className="line-clamp-3 text-base font-semibold leading-tight">{val}</span> : <Val cls="" base={w < 150 ? 24 : 36} avail={w - 26} />}
      {c.sub && <span className="line-clamp-2 text-[11px] text-zinc-500">{c.sub}</span>}
      <div className="relative mt-auto min-h-0 flex-1">
        {kind === 'spark' && <Spark values={c.hist} min={c.min} max={c.max} className="absolute inset-0 h-full" />}
        {(kind === 'bar' || kind === 'ring') && (
          <div className="absolute inset-y-0 left-0 right-0 mx-auto flex w-full max-w-[56px] flex-col justify-end overflow-hidden rounded-xl bg-white/[0.06]">
            <div className="w-full rounded-xl transition-[height] duration-700 ease-out" style={{ height: `${clamp(c.pct)}%`, background: TONES[c.t ?? 'ok'] }} />
          </div>
        )}
      </div>
    </div>
  );
  // tile (1×1) — w/h are the outer size; below ~130px drop the sub line so value + graph always fit
  const tiny = h < 132 || w < 132;
  const big = tiny ? 'text-[22px]' : w < 160 || h < 160 ? 'text-2xl' : 'text-[34px]';
  return (
    <div className="flex h-full min-w-0 flex-col">
      {Label}
      {kind === 'ring' ? (
        <div className="flex min-h-0 flex-1 items-center justify-center pt-1.5">
          <Ring value={c.pct} t={c.t} thickness={10} className="h-full max-h-full">
            <span className="font-semibold tabular-nums" style={{ fontSize: Math.max(12, Math.min(18, (w * 0.45) / Math.max(2.5, String(val).length * 0.62))) }}>{val}<span className="text-[10px] text-zinc-400">{c.unit}</span></span>
          </Ring>
        </div>
      ) : (
        <>
          <div className="mt-auto flex flex-col gap-1">
            {textVal ? <span className={`${tiny ? 'text-[13px]' : 'text-sm'} line-clamp-2 font-semibold leading-tight`}>{val}</span> : <Val cls="" base={tiny ? 22 : w < 160 || h < 160 ? 24 : 34} avail={w - 26} />}
            {c.sub && !(tiny && (kind === 'spark' || kind === 'bar' || textVal)) && <span className="truncate text-[11px] text-zinc-500">{c.sub}</span>}
          </div>
          {kind === 'spark' && <Spark values={c.hist} min={c.min} max={c.max} className={`${tiny ? 'mt-1.5 h-[22%]' : 'mt-2 h-[28%]'} shrink-0`} />}
          {kind === 'bar' && <Bar value={c.pct} t={c.t} className={`${tiny ? 'mt-2' : 'mt-2.5'} h-1.5 shrink-0`} />}
        </>
      )}
    </div>
  );
}

/* ───────── Studio variant ─────────
   Minimal stat-first layout from the Studio app: mono micro-label, big tight value anchored low, quiet sub, 3px bar.
   Driven by the widget's `studio` descriptor (falls back to `compact`):
   { label, value, unit, d, sub, t, pct, hist, img, live, right, kind: 'text'|'value',
     rows: [{ n, v, pct?, dot? }], meters: [{ n, v 0-100 }], cells: [0-100…], progress: { a, b, pct } } */
export function StudioView({ c, w, h, icon }) {
  const sk = useSkin();
  const val = typeof c.value === 'number' ? fmt(c.value, c.d ?? 0) : c.value;
  const mono = { fontFamily: sk.font ?? "'Geist Mono',ui-monospace,monospace" };
  const glow = sk.numGlow ? { textShadow: '0 0 4px var(--accent), 0 0 14px var(--accent)' } : null;
  const toneC = c.t && c.t !== 'ok' ? TONES[c.t] : undefined;
  const Label = ({ className = '' }) => (
    <div className={`flex min-w-0 shrink-0 items-center gap-1.5 text-[9.5px] uppercase tracking-[0.06em] text-[#8a8a94] ${className}`} style={mono}>
      {c.live != null && <span className="h-[5px] w-[5px] shrink-0 rounded-full" style={{ background: c.live ? 'oklch(0.75 0.15 150)' : '#52525b' }} />}
      <span className="truncate">{c.label}</span>
      {c.right && <span className="ml-auto shrink-0 normal-case tracking-normal text-[#9696a0]">{c.right}</span>}
    </div>
  );
  const Thin = ({ pct, className = '' }) => <div className={`h-[3px] shrink-0 overflow-hidden rounded-[2px] bg-[#2a2a31] ${className}`}><div className="h-full transition-[width] duration-500" style={{ width: `${clamp(pct)}%`, background: toneC ?? 'var(--accent)' }} /></div>;
  const len = String(val ?? '–').length + (c.unit ? String(c.unit).length * 0.5 : 0);
  const fitPx = (max) => Math.round(Math.max(14, Math.min(max, (w - 26) / (Math.max(2.5, len) * 0.6))));
  const Big = ({ max }) => c.kind === 'text'
    ? <span className="line-clamp-2 text-[15px] font-semibold leading-snug">{val ?? '—'}</span>
    : <span className="block max-w-full overflow-hidden whitespace-nowrap font-semibold leading-[1.05] tracking-[-0.02em] tabular-nums" style={{ fontSize: fitPx(max), fontFamily: sk.num, fontWeight: sk.numWeight ?? 600, color: toneC, ...glow }}>{val ?? '–'}{c.unit && <span className="ml-0.5 text-[0.5em] font-medium text-[#9696a0]">{c.unit}</span>}</span>;
  // single-row zones: label ← → value
  if (h < 100 || (w / h >= 2.6 && h < 130)) return (
    <div className="flex h-full min-w-0 items-center gap-3">
      <div className="flex min-w-0 flex-col gap-1"><Label />{c.sub && w > 260 && <span className="truncate text-[10px] text-[#9696a0]">{c.sub}</span>}</div>
      {c.hist && w > 300 ? <Spark values={c.hist} min={c.min} max={c.max} graph="line" fill={false} className="h-[46%] min-w-0 flex-1 opacity-80" /> : Number.isFinite(c.pct) && w > 300 ? <Thin pct={c.pct} className="min-w-0 flex-1" /> : <span className="flex-1" />}
      <span className="shrink-0 whitespace-nowrap text-[15px] font-semibold tracking-[-0.01em] tabular-nums" style={{ fontFamily: sk.num, color: toneC, ...glow }}>{val ?? '–'}{c.unit && <span className="ml-0.5 text-[10px] font-medium text-[#9696a0]">{c.unit}</span>}</span>
    </div>
  );
  const bigMax = h >= 280 ? 44 : h >= 190 ? 34 : 26;
  if (c.img) {
    const pr = c.progress;
    return (
      <div className="flex h-full min-w-0 flex-col">
        <div className="flex min-h-0 flex-1 items-center gap-2.5">
          <div className="aspect-square h-full max-h-[160px] shrink-0 overflow-hidden rounded-md"><Img src={c.img} icon={c.icon ?? icon} className="h-full w-full" /></div>
          <div className="flex min-w-0 flex-col gap-[3px]"><span className={`${h > 200 ? 'text-[17px]' : 'text-sm'} line-clamp-2 font-semibold leading-tight`}>{val}</span>{c.sub && <span className="truncate text-[11px] text-[#9696a0]">{c.sub}</span>}</div>
        </div>
        {c.viz && <div className="mt-2 shrink-0">{c.viz('h-7')}</div>}
        {(pr || Number.isFinite(c.pct)) && (
          <div className="mt-2 flex shrink-0 items-center gap-2 text-[9px] text-[#8a8a94]" style={mono}>
            {pr?.a && <span>{pr.a}</span>}<Thin pct={pr?.pct ?? c.pct} className="flex-1" />{pr?.b && <span>{pr.b}</span>}
          </div>
        )}
      </div>
    );
  }
  if (c.meters && h >= 120) {
    const n = Math.max(1, Math.min(c.meters.length, Math.floor((w + 8) / 26)));
    return (
      <div className="flex h-full min-w-0 flex-col">
        <Label />
        <div className="mt-2 flex min-h-0 flex-1 gap-2">
          {c.meters.slice(0, n).map((m, i) => (
            <div key={i} className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-[3px] bg-[#1c1c21]"><div className="absolute inset-x-0 bottom-0 transition-[height] duration-300" style={{ height: `${clamp(m.v)}%`, background: 'var(--accent)' }} /></div>
              <span className="truncate text-center text-[9px] text-[#9696a0]">{m.n}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (c.rows && h >= 130) {
    const head = h >= 210 && c.value != null;
    const n = Math.max(1, Math.floor((h - (head ? 86 : 34)) / 24));
    return (
      <div className="flex h-full min-w-0 flex-col">
        <Label />
        {head && <div className="mt-2"><Big max={26} /></div>}
        <div className="mt-auto flex flex-col gap-[7px] pt-2">
          {c.rows.slice(0, n).map((r, i) => (
            <div key={i} className="flex min-w-0 flex-col gap-[3px]">
              <div className="flex min-w-0 items-baseline justify-between gap-2 text-[10.5px]">
                <span className="flex min-w-0 items-center gap-1.5 truncate font-medium">{r.dot != null && <span className="h-[5px] w-[5px] shrink-0 rounded-full" style={{ background: r.dot ? 'oklch(0.75 0.15 150)' : '#52525b' }} />}{r.n}</span>
                <span className="shrink-0 tabular-nums text-[#9696a0]">{r.v}</span>
              </div>
              {Number.isFinite(r.pct) && <Thin pct={r.pct} />}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (c.cells && h >= 120) {
    const cols = Math.max(2, Math.min(c.cells.length, Math.round(Math.sqrt(c.cells.length * (w / Math.max(1, h - 60))))));
    return (
      <div className="flex h-full min-w-0 flex-col">
        <Label />
        <div className="mt-2 grid min-h-0 flex-1 gap-[3px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gridAutoRows: 'minmax(0,1fr)' }}>
          {c.cells.map((v, i) => <span key={i} className="rounded-[3px] transition-colors duration-700" style={{ background: `color-mix(in oklab, var(--accent) ${8 + clamp(v) * 0.92}%, #1c1c21)` }} />)}
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2"><Big max={22} />{c.sub && <span className="truncate text-[10px] text-[#9696a0]">{c.sub}</span>}</div>
      </div>
    );
  }
  return (
    <div className="flex h-full min-w-0 flex-col">
      <Label />
      {c.hist && h >= 150 && <div className="relative mt-2 min-h-0 flex-1"><Spark values={c.hist} min={c.min} max={c.max} graph="line" fill={false} className="absolute inset-0 h-full opacity-70" /></div>}
      <div className={`${c.hist && h >= 150 ? 'mt-2' : 'mt-auto'} flex min-w-0 flex-col`}>
        <Big max={bigMax} />
        {c.sub && <span className="mt-1 truncate text-[10px] text-[#9696a0]">{c.sub}</span>}
        {Number.isFinite(c.pct) && <Thin pct={c.pct} className="mt-1.5" />}
      </div>
    </div>
  );
}

export function SkinHeader({ kind, title, icon, right, bleed }) {
  const r = right && <span className="ml-auto flex shrink-0 items-center gap-1.5 normal-case tracking-normal">{right}</span>;
  if (kind === 'tui') return (
    <>
      <div className="absolute left-3 top-[5px] z-10 flex max-w-[70%] -translate-y-1/2 items-center bg-[#0b0b0d] px-1 text-[11px] leading-none">
        <span style={{ color: mix(55, '#52525b') }}>┐</span><span className="truncate px-0.5 font-semibold lowercase text-[color:var(--accent)]">{title}</span><span style={{ color: mix(55, '#52525b') }}>┌</span>
      </div>
      {right && <div className="absolute right-3 top-[5px] z-10 flex -translate-y-1/2 items-center gap-1 bg-[#0b0b0d] px-1 text-[10.5px] leading-none text-zinc-400">{right}</div>}
    </>
  );
  const base = 'relative z-10 flex min-w-0 items-center';
  if (kind === 'macos') return <header className={`${base} mb-2 gap-1.5 text-[13px] font-semibold text-[color:var(--accent)]`}>{icon && <Icon name={icon} fill className="text-[16px]" />}<span className="truncate">{title}</span>{r && <span className="ml-auto text-[12px] font-normal text-zinc-400">{right}</span>}</header>;
  if (kind === 'fluent') return <header className={`${base} mb-2 gap-2 text-[12px] font-medium text-zinc-300`}>{icon && <Icon name={icon} className="text-[16px] text-[color:var(--accent)]" />}<span className="truncate">{title}</span>{r}</header>;
  if (kind === 'hud') return <header className={`${base} mb-2 gap-2 text-[9.5px] uppercase tracking-[0.28em] text-[color:var(--accent)]`}><span className="truncate">{title}</span><span className="h-px min-w-[12px] flex-1" style={{ background: mix(35) }} />{right && <span className="shrink-0 tracking-[0.1em] text-zinc-400">{right}</span>}</header>;
  if (kind === 'ink') return <header className={`${base} mb-3 gap-2 text-[10px] uppercase tracking-[0.22em] text-zinc-500`}><span className="truncate">{title}</span>{r}</header>;
  if (kind === 'ios') return <header className={`${base} mb-1.5 gap-1.5 text-[12.5px] font-semibold text-[color:var(--accent)]`}>{icon && <Icon name={icon} fill className="text-[15px]" />}<span className="truncate">{title}</span>{r && <span className="ml-auto text-[12px] font-medium text-zinc-500">{right}</span>}</header>;
  if (kind === 'android') return <header className={`${base} mb-2.5 gap-2 text-[13px] font-medium`} style={{ color: mix(55, '#fff') }}>{icon && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: mix(28, '#1b1b1f') }}><Icon name={icon} fill className="text-[16px]" /></span>}<span className="truncate">{title}</span>{r}</header>;
  if (kind === 'synth') return <header className={`${base} mb-2 gap-2 text-[11px] font-bold uppercase italic tracking-[0.18em]`}><span className="truncate bg-gradient-to-r from-[#ff4fd8] to-[#38e8ff] bg-clip-text text-transparent">{title}</span>{r}</header>;
  if (kind === 'brutal') return <header className={`${base} -mx-[2px] -mt-[2px] mb-3 gap-2`}><span className="truncate bg-[var(--accent)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-black">{title}</span>{r}</header>;
  if (kind === 'cyber') return <header className={`${base} mb-2 gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--accent)]`}><span className="h-3 w-1 shrink-0 bg-[var(--accent)]" /><span className="truncate">{title}</span><span className="text-[9.5px] font-normal text-zinc-500">//{String(title).length.toString(16).padStart(2, '0')}</span>{r}</header>;
  if (kind === 'nixie') return <header className={`${base} mb-2 gap-2 text-[10px] uppercase tracking-[0.3em] text-[#a8805e]`}><span className="truncate">{title}</span>{r}</header>;
  if (kind === 'instrument') return <header className={`${base} mb-3 items-baseline gap-2.5`}><span className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight text-[#E6E9EE]">{title}</span>{r}</header>;
  if (kind === 'retro') return <header className={`${base} mb-1.5 gap-1 text-[17px] uppercase leading-none text-[color:var(--accent)]`}><span className="truncate">&gt; {title}</span><span className="animate-pulse">_</span>{r}</header>;
  return (
    <header className={`${base} mb-2 gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400 ${bleed ? 'px-4 pt-3' : ''}`}>
      {icon && <Icon name={icon} className="text-[15px] text-[color:var(--accent)]" />}
      <span className="truncate">{title}</span>{r}
    </header>
  );
}
