import React from 'react';
import { Widget, shell, get, num, fmt, fmtRate, detect, pretty, Spark, useHistory } from './kit';

export const meta = { id: 'DiskIO', name: 'Disk I/O', category: 'Storage', icon: 'swap_horiz',
  prefixes: [], defaultSize: [2, 2], minSize: [1, 1],
  description: 'Read / write throughput and activity for every physical disk, plus combined history.' };

export default function DiskIO(p) {
  const d = p.data;
  const disks = detect(d, /^libre\.(.+)_power_on_hours$/).map((id) => {
    const k = (s) => num(get(d, `libre.${id}_${s}`));
    return { id, name: pretty(id).split(' ')[0], r: k('read_rate'), w: k('write_rate'), act: k('total_activity') };
  });
  const total = disks.reduce((a, x) => a + (x.r || 0) + (x.w || 0), 0);
  const hist = useHistory(total);
  const max = Math.max(1, ...disks.flatMap((x) => [x.r, x.w]));
  return (
    <Widget {...shell(p)} title={p.title ?? 'Disk I/O'} icon="swap_horiz" studio={{ label: 'Disk I/O', value: fmtRate(total), hist, min: 0, rows: disks.map((x) => ({ n: x.name, v: `R ${fmtRate(x.r)} · W ${fmtRate(x.w)}`, pct: x.act })) }}
      compact={{ label: 'Disk I/O', value: fmtRate(total), sub: `${disks.length} disks`, hist, min: 0 }}>
      {({ size, h }) => h < 200 ? (
        <ul className="flex h-full flex-col justify-center gap-2.5 overflow-hidden">
          {disks.slice(0, Math.max(1, Math.floor((h + 10) / 40))).map((x) => (
            <li key={x.id} className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between gap-2"><span className="font-medium text-zinc-200">{x.name}</span><span className="tabular-nums text-zinc-400"><span className="text-[color:var(--accent)]">R</span> {fmtRate(x.r)} · <span className="text-violet-400">W</span> {fmtRate(x.w)}</span></div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full transition-[width] duration-700" style={{ width: `${Math.sqrt((x.r || 0) / max) * 50}%`, background: 'var(--accent)' }} />
                <div className="h-full bg-violet-400 transition-[width] duration-700" style={{ width: `${Math.sqrt((x.w || 0) / max) * 50}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex h-full flex-col gap-3">
          {disks.map((x) => (
            <div key={x.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline gap-2 text-xs"><span className="font-medium text-zinc-200">{x.name}</span><span className="text-[11px] text-zinc-500">{fmt(x.act, 0)}% active</span></div>
              {[['R', x.r, 'var(--accent)'], ['W', x.w, '#a78bfa']].map(([l, v, c]) => (
                <div key={l} className="grid grid-cols-[12px_minmax(0,1fr)_76px] items-center gap-2 text-[11px]">
                  <span className="text-zinc-500">{l}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.sqrt((v || 0) / max) * 100}%`, background: c }} /></div>
                  <span className="text-right tabular-nums text-zinc-300">{fmtRate(v)}</span>
                </div>
              ))}
            </div>
          ))}
          {size !== 'sm' && <Spark values={hist} min={0} className="mt-auto min-h-[28px] flex-1" />}
        </div>
      )}
    </Widget>
  );
}
