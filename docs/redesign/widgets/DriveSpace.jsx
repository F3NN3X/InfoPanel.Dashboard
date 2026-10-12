import React from 'react';
import { Widget, shell, get, num, fmt, fmtMB, Metric, Bar, BarRow, Ring, tone, Pill } from './kit';

export const meta = { id: 'DriveSpace', name: 'Drive Space', category: 'Storage', icon: 'hard_drive',
  prefixes: ['plugins.drive-info-plugin.'], defaultSize: [2, 2], minSize: [1, 1],
  description: 'Used / free space per volume with label, type and file system.' };

// props: drive ('c', 'd', …) to pin one volume; omit to list all
export default function DriveSpace(p) {
  const d = p.data;
  const ids = [...new Set(Object.keys(d || {}).map((k) => k.match(/^plugins\.drive-info-plugin\.([^.]+)\.name$/)?.[1]).filter(Boolean))];
  const drives = ids.map((id) => {
    const k = (s) => get(d, `plugins.drive-info-plugin.${id}.${s}`);
    const total = num(k('total_size')), used = num(k('used_space'));
    return { id, name: k('name'), label: k('volume_label'), type: k('type'), format: k('format'), total, used, free: num(k('available_space')), pct: (used / total) * 100 };
  });
  const one = p.drive ? drives.find((x) => x.id === p.drive.toLowerCase().replace(':', '')) : null;
  const warn = p.warn ?? 80, crit = p.crit ?? 92;
  const list = (one ? [one] : [...drives]).sort((a, b) => (p.sort === 'name' ? a.id.localeCompare(b.id) : b.pct - a.pct));
  const neutral = p.neutral !== false;
  const tn = (pct) => (pct >= (p.crit ?? 90) ? 'crit' : pct >= (p.warn ?? 80) ? 'warn' : neutral ? 'muted' : 'ok');
  const critN = drives.filter((x) => x.pct >= (p.crit ?? 90)).length;
  return (
    <Widget {...shell(p)} title={p.title ?? (one ? `${one.name} ${one.label}` : 'Drives')} icon="hard_drive" right={critN > 0 && <Pill state="crit" className="text-[11px]">{critN} critical</Pill>} studio={(one ?? drives[0]) && { label: 'Drives', value: (one ?? drives[0]).pct, unit: '%', sub: `${(one ?? drives[0]).name} · ${fmtMB((one ?? drives[0]).free)} free`, pct: (one ?? drives[0]).pct, rows: list.map((x) => ({ n: `${x.name} ${x.label}`, v: `${fmtMB(x.free)} free`, pct: x.pct })) }} compact={(one ?? drives[0]) && { label: `${(one ?? drives[0]).name} ${(one ?? drives[0]).label}`, value: (one ?? drives[0]).pct, unit: '%', sub: `${fmtMB((one ?? drives[0]).free)} free`, pct: (one ?? drives[0]).pct, t: tone((one ?? drives[0]).pct, warn, crit) }}>
      {({ size, h }) => {
        const first = one ?? drives[0];
        if (!first) return null;
        if (size === 'xs') return (
          <div className="flex h-full flex-col justify-center gap-1.5">
            <div className="flex items-baseline justify-between"><span className="text-sm font-semibold">{first.name}</span><span className="text-[11px] text-zinc-400">{fmtMB(first.free)} free</span></div>
            <Bar value={first.pct} t={tone(first.pct, warn, crit)} className="h-2" />
          </div>
        );
        if (one && size !== 'sm') return (
          <div className="flex h-full items-center gap-5">
            <Ring value={one.pct} t={tone(one.pct, warn, crit)} className="h-full max-h-[170px]">
              <span className="text-3xl font-semibold tabular-nums">{fmt(one.pct, 0)}<span className="text-sm text-zinc-400">%</span></span>
              <span className="text-[11px] text-zinc-400">used</span>
            </Ring>
            <div className="grid flex-1 gap-2 text-xs">
              {[['Free', fmtMB(one.free)], ['Used', fmtMB(one.used)], ['Total', fmtMB(one.total)], ['Type', `${one.type} · ${one.format}`]].map(([l, v]) => (
                <div key={l} className="flex justify-between gap-2"><span className="text-zinc-500">{l}</span><span className="tabular-nums text-zinc-200">{v}</span></div>
              ))}
            </div>
          </div>
        );
        const n = Math.max(1, Math.floor(h / (size === 'lg' ? 46 : 38)));
        return (
          <div className="flex h-full flex-col gap-3 overflow-hidden">
            {list.slice(0, n).map((x) => (
              <BarRow key={x.id} label={<><span className="font-semibold">{x.name}</span> <span className="text-zinc-500">{x.label}</span></>}
                hint={size === 'lg' ? `${x.format} · ${fmtMB(x.total)}` : null} value={x.pct} t={tn(x.pct)} display={`${fmtMB(x.free)} free`} />
            ))}
          </div>
        );
      }}
    </Widget>
  );
}
