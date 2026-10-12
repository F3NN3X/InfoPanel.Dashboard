import React from 'react';
import { Widget, shell, get, num, fmt, has, Bar, tone, TONES } from './kit';

export const meta = { id: 'SensorGroup', name: 'Sensor Group', category: 'Generic', icon: 'view_list',
  prefixes: [], defaultSize: [2, 2], minSize: [1, 1],
  description: 'Bind any list of data points. Rows or a tile grid, each with optional bar and thresholds.' };

const DEFAULT = [
  { key: 'system.cpu.load', label: 'CPU', max: 100 },
  { key: 'libre.nvidia_geforce_rtx_5090_gpu_core_load', label: 'GPU', max: 100 },
  { key: 'system.ram.load', label: 'RAM', max: 100 },
  { key: 'libre.nvidia_geforce_rtx_5090_gpu_core', label: 'GPU temp', max: 100, warn: 75 },
  { key: 'libre.kingston_sfyrd2000g_temperature__2', label: 'NVMe temp', max: 90, warn: 70 },
  { key: 'plugins.volume-plugin.default.volume', label: 'Volume', max: 100 },
];

// props: sensors [{ key, label, max?, warn?, crit?, decimals? }], layout 'auto' | 'rows' | 'grid', bars (default true)
export default function SensorGroup(p) {
  const d = p.data;
  const items = (p.sensors ?? DEFAULT).map((s) => {
    const raw = get(d, s.key); const v = num(raw);
    return { ...s, raw, v, unit: String(raw).replace(/^[-\d.,\s]+/, '').trim(), t: tone(v, s.warn, s.crit) };
  });
  const first = items[0];
  return (
    <Widget {...shell(p)} title={p.title ?? 'Sensors'} icon="view_list" studio={first && { label: p.title ?? 'Sensors', value: first.v, unit: first.unit, rows: items.map((x) => ({ n: x.label, v: `${Number.isFinite(x.v) ? fmt(x.v, x.decimals ?? 0) : x.raw} ${x.unit}`, pct: x.max ? (x.v / x.max) * 100 : undefined })) }}
      compact={first && { label: first.label, value: first.v, unit: first.unit, sub: items.slice(1, 3).map((x) => `${x.label} ${fmt(x.v, 0)}${x.unit}`).join(' · '), pct: first.max ? (first.v / first.max) * 100 : undefined, t: first.t }}>
      {({ w, h, size }) => {
        const grid = p.layout === 'grid' || (p.layout !== 'rows' && w / h > 1.6 && w > 400);
        if (grid) {
          const cols = Math.max(2, Math.min(items.length, Math.floor(w / 120)));
          return (
            <div className="grid h-full gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gridAutoRows: 'minmax(0,1fr)' }}>
              {items.map((x) => (
                <div key={x.key} className="flex min-w-0 flex-col justify-between gap-1 rounded-xl bg-white/[0.04] p-2.5">
                  <span className="truncate text-[11px] text-zinc-400">{x.label}</span>
                  <span className="text-xl font-semibold tabular-nums" style={x.t !== 'ok' ? { color: TONES[x.t] } : undefined}>{Number.isFinite(x.v) ? fmt(x.v, x.decimals ?? 0) : x.raw}<span className="ml-0.5 text-[11px] text-zinc-500">{x.unit}</span></span>
                  {p.bars !== false && x.max && <Bar value={x.v} max={x.max} t={x.t} className="h-1" />}
                </div>
              ))}
            </div>
          );
        }
        return (
          <ul className="flex h-full flex-col justify-center gap-2.5 overflow-hidden">
            {items.slice(0, Math.max(1, Math.floor(h / (p.bars !== false ? 32 : 22)))).map((x) => (
              <li key={x.key} className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2 text-xs">
                  <span className="truncate text-zinc-300">{x.label}</span>
                  <span className="ml-auto font-medium tabular-nums" style={x.t !== 'ok' ? { color: TONES[x.t] } : undefined}>{Number.isFinite(x.v) ? fmt(x.v, x.decimals ?? 0) : has(x.raw) ? x.raw : '–'}<span className="text-zinc-500"> {x.unit}</span></span>
                </div>
                {p.bars !== false && x.max && <Bar value={x.v} max={x.max} t={x.t} className="h-1" />}
              </li>
            ))}
          </ul>
        );
      }}
    </Widget>
  );
}
