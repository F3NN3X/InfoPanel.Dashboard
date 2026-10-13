import React, { useRef } from 'react';
import { Widget, shell, get, num, fmt, Dot } from './kit';

export const meta = { id: 'MeterBridge', name: 'Meter Bridge', category: 'Audio', icon: 'graphic_eq',
  prefixes: [], defaultSize: [4, 3], minSize: [1, 1],
  description: 'Studio-style multi-channel level meters: dB scale, stereo LED ladders with dimmed zone colours, peak-hold markers, per-channel volume and live L/R dB readouts.' };

const dbOf = (pct) => (pct > 0 ? 20 * Math.log10(pct / 100) : -Infinity);
const fmtDb = (db) => (Number.isFinite(db) ? fmt(db, db > -10 ? 1 : 0) : '-∞');
const SCALE = [0, -6, -12, -18, -24, -36, -48, -60];
const ZONE = (db, warnDb, clipDb) => (db > clipDb ? '#f87171' : db > warnDb ? '#fbbf24' : 'var(--accent)');

// props: channels (array of device names/ids; default all), orientation 'vertical' | 'horizontal', floor (dB, default -60),
//        segments, holdMs (default 1500), warnDb (-18), clipDb (-6), showScale, showVolume, ladder 'led' | 'smooth'
export default function MeterBridge(p) {
  const d = p.data;
  const floor = p.floor ?? -60, warnDb = p.warnDb ?? -18, clipDb = p.clipDb ?? -6, holdMs = p.holdMs ?? 1500;
  const ids = [...new Set(Object.keys(d || {}).map((k) => k.match(/^plugins\.audio-level-meter\.([^.]+)\.device-name$/)?.[1]).filter(Boolean))].filter((id) => id !== 'default-audio');
  const volFor = (id) => { const g = id.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)?.[1]; const key = g && Object.keys(d).find((k) => k.startsWith('plugins.volume-plugin') && k.includes(`{${g}}`) && k.endsWith('.volume')); return key ? num(get(d, key)) : NaN; };
  let ch = ids.map((id) => {
    const k = (s) => get(d, `plugins.audio-level-meter.${id}.${s}`);
    const full = String(k('device-name'));
    return { id, name: full.replace(/\s*\(.+\)$/, ''), full, l: dbOf(num(k('left-channel'))), r: dbOf(num(k('right-channel'))), vol: volFor(id) };
  });
  if (p.channels) ch = p.channels.map((c) => ch.find((x) => x.id === c || x.name.toLowerCase() === String(c).toLowerCase())).filter(Boolean);
  // peak hold
  const hold = useRef({}); const now = Date.now();
  ch.forEach((c) => ['l', 'r'].forEach((s) => {
    const key = c.id + s, cur = c[s], hv = hold.current[key];
    if (!hv || cur >= hv.v || now - hv.t > holdMs) hold.current[key] = { v: cur, t: now };
    c[s + 'h'] = hold.current[key].v;
  }));
  const pos = (db) => Math.min(100, Math.max(0, ((Math.max(floor, db) - floor) / -floor) * 100));
  const vertical = p.orientation !== 'horizontal';
  const anyLive = ch.some((c) => c.l > floor || c.r > floor);

  const Ladder = ({ db, hdb, n, horiz }) => (
    <div className={`relative flex ${horiz ? 'h-full flex-1 flex-row gap-[2px]' : 'w-full flex-1 flex-col-reverse gap-[2px]'}`}>
      {p.ladder === 'smooth' ? (
        <>
          <div className="absolute inset-0 rounded-[2px] bg-white/[0.05]" />
          <div className="absolute rounded-[2px] transition-all duration-100" style={{ ...(horiz ? { left: 0, top: 0, bottom: 0, width: `${pos(db)}%` } : { left: 0, right: 0, bottom: 0, height: `${pos(db)}%` }),
            background: `linear-gradient(${horiz ? '90deg' : '0deg'}, var(--accent) 0%, var(--accent) ${pos(warnDb)}%, #fbbf24 ${pos(warnDb)}%, #fbbf24 ${pos(clipDb)}%, #f87171 ${pos(clipDb)}%)`, backgroundSize: horiz ? `${(100 / Math.max(1, pos(db))) * 100}% 100%` : `100% ${(100 / Math.max(1, pos(db))) * 100}%`, backgroundPosition: horiz ? 'left' : 'bottom' }} />
        </>
      ) : Array.from({ length: n }, (_, i) => {
        const segDb = floor + ((i + 0.5) / n) * -floor, on = segDb <= db;
        return <span key={i} className="min-h-0 min-w-0 flex-1 rounded-[1.5px] transition-opacity duration-75" style={{ background: ZONE(segDb, warnDb, clipDb), opacity: on ? 1 : 0.16 }} />;
      })}
      {Number.isFinite(hdb) && hdb > floor && <span className="absolute rounded-full bg-white transition-all duration-150" style={horiz ? { left: `calc(${pos(hdb)}% - 1px)`, top: -1, bottom: -1, width: 2 } : { bottom: `calc(${pos(hdb)}% - 1px)`, left: -1, right: -1, height: 2 }} />}
    </div>
  );

  return (
    <Widget {...shell(p)} title={p.title ?? 'Levels'} icon="graphic_eq" studio={{ label: 'Levels', live: anyLive, meters: ch.map((c) => ({ n: c.name, v: pos(Math.max(c.l, c.r)) })), value: fmtDb(Math.max(...ch.map((c) => Math.max(c.l, c.r)))), unit: 'dB' }} right={<span className="flex items-center gap-1.5 text-zinc-300"><Dot ok={anyLive} />{anyLive ? 'Live' : 'Idle'}</span>}>
      {({ w, h }) => {
        if (!vertical || h < 120) {
          const rowH = 30, n = Math.max(1, Math.floor((h + 8) / (rowH + 8)));
          return (
            <ul className="flex h-full flex-col justify-center gap-2 overflow-hidden">
              {ch.slice(0, n).map((c) => (
                <li key={c.id} className="grid items-center gap-x-3" style={{ gridTemplateColumns: `${w > 340 ? 88 : 60}px minmax(0,1fr) ${w > 300 ? 72 : 40}px` }} title={c.full}>
                  <div className="flex min-w-0 flex-col leading-tight"><span className="truncate text-xs font-semibold">{c.name}</span>{p.showVolume !== false && Number.isFinite(c.vol) && <span className="text-[10.5px] tabular-nums text-zinc-500">{fmt(c.vol)}%</span>}</div>
                  <div className="flex h-[22px] flex-col gap-[3px]"><Ladder db={c.l} hdb={c.lh} n={p.segments ?? Math.max(12, Math.floor(w / 14))} horiz /><Ladder db={c.r} hdb={c.rh} n={p.segments ?? Math.max(12, Math.floor(w / 14))} horiz /></div>
                  <div className="flex flex-col text-right font-mono text-[10px] leading-tight tabular-nums text-zinc-400"><span>{fmtDb(c.l)}</span>{w > 300 && <span>{fmtDb(c.r)}</span>}</div>
                </li>
              ))}
            </ul>
          );
        }
        const colMin = 74, n = Math.max(1, Math.min(ch.length, Math.floor((w + 14) / (colMin + 14))));
        const colW = (w - (n - 1) * 14) / n, scale = p.showScale !== false && colW > 92;
        const segs = p.segments ?? Math.max(10, Math.min(36, Math.floor((h - 52) / 7.5)));
        return (
          <div className="grid h-full gap-x-3.5" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}>
            {ch.slice(0, n).map((c) => (
              <div key={c.id} className="flex min-h-0 min-w-0 flex-col gap-2" title={c.full}>
                <div className="flex flex-col gap-1"><div className="flex items-baseline justify-between gap-2"><span className="truncate text-[13px] font-semibold">{c.name}</span>{p.showVolume !== false && Number.isFinite(c.vol) && <span className="shrink-0 text-[13px] font-semibold tabular-nums">{fmt(c.vol)}%</span>}</div>{p.showVolume !== false && Number.isFinite(c.vol) && <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-zinc-300 transition-[width] duration-300" style={{ width: `${c.vol}%` }} /></div>}</div>
                <div className="flex min-h-0 flex-1 gap-2">
                  {scale && (
                    <div className="relative w-[30px] shrink-0 font-mono text-[10px] tabular-nums text-zinc-500">
                      {SCALE.filter((s) => s >= floor).map((s) => <span key={s} className="absolute right-0 flex -translate-y-1/2 items-center gap-1" style={{ top: `${100 - pos(s)}%` }}><span className="h-px w-1.5 bg-zinc-600" />{s === 0 ? '0' : `−${-s}`}</span>)}
                    </div>
                  )}
                  <div className="flex flex-1 justify-center gap-[5px]">
                    <div className="flex w-[7px]"><Ladder db={c.l} hdb={c.lh} n={segs} /></div>
                    <div className="flex w-[7px]"><Ladder db={c.r} hdb={c.rh} n={segs} /></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 font-mono text-[10px] tabular-nums text-zinc-500">
                  <span className="flex justify-between gap-1"><span className="font-sans font-semibold text-zinc-400">L</span>{fmtDb(c.l)}</span>
                  <span className="flex justify-between gap-1"><span className="font-sans font-semibold text-zinc-400">R</span>{fmtDb(c.r)}</span>
                </div>
              </div>
            ))}
          </div>
        );
      }}
    </Widget>
  );
}
