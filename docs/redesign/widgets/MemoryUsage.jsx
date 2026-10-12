import React from 'react';
import { Widget, shell, get, num, fmt, Metric, Ring, Spark, Stat, Bar, useHistory, tone } from './kit';

export const meta = { id: 'MemoryUsage', name: 'Memory', category: 'Hardware', icon: 'memory_alt',
  prefixes: ['libre.total_memory', 'libre.virtual_memory'], defaultSize: [2, 1], minSize: [1, 1],
  description: 'Physical + virtual memory load, used and available.' };

export default function MemoryUsage(p) {
  const d = p.data;
  const m = (s) => num(get(d, `libre.${s}`));
  const phys = { pct: m('total_memory_memory'), used: m('total_memory_memory_used'), free: m('total_memory_memory_available') };
  const virt = { pct: m('virtual_memory_memory'), used: m('virtual_memory_memory_used'), free: m('virtual_memory_memory_available') };
  const hist = useHistory(phys.pct);
  const warn = p.warn ?? 80, crit = p.crit ?? 92;
  const Row = ({ l, v }) => (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2 text-xs">
        <span className="text-zinc-300">{l}</span>
        <span className="text-[11px] tabular-nums text-zinc-500">{fmt(v.used, 1)} / {fmt(v.used + v.free, 0)} GB</span>
        <span className="ml-auto font-medium tabular-nums">{fmt(v.pct, 0)}%</span>
      </div>
      <Bar value={v.pct} t={tone(v.pct, warn, crit)} className="h-2" />
    </div>
  );
  return (
    <Widget {...shell(p)} title={p.title ?? 'Memory'} icon="memory_alt" compact={{ label: 'RAM', value: phys.pct, unit: '%', sub: `${fmt(phys.used, 1)} / ${fmt(phys.used + phys.free, 0)} GB`, pct: phys.pct, kind: 'ring', t: tone(phys.pct, warn, crit) }}>
      {({ size }) => size === 'xs' ? (
        <Metric label="RAM" value={phys.pct} unit="%" scale="lg" sub={`${fmt(phys.used, 1)} GB used`} t={tone(phys.pct, warn, crit)} className="h-full justify-center" />
      ) : size === 'sm' ? (
        <div className="flex h-full flex-col justify-center gap-3"><Row l="Physical" v={phys} /><Row l="Virtual" v={virt} /></div>
      ) : (
        <div className="flex h-full gap-5">
          <Ring value={phys.pct} t={tone(phys.pct, warn, crit)} thickness={8} className="h-full max-h-[180px] shrink-0">
            <span className={`${size === 'lg' ? 'text-4xl' : 'text-2xl'} font-semibold tabular-nums`}>{fmt(phys.pct, 0)}<span className="text-sm text-zinc-400">%</span></span>
            <span className="text-[11px] text-zinc-400">{fmt(phys.used, 1)} GB</span>
          </Ring>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
            <div className="grid grid-cols-2 gap-3"><Stat label="Available" value={`${fmt(phys.free, 1)} GB`} /><Stat label="Total" value={`${fmt(phys.used + phys.free, 0)} GB`} /></div>
            <Row l="Virtual" v={virt} />
            {size === 'lg' && <Spark values={hist} className="min-h-0 flex-1" />}
          </div>
        </div>
      )}
    </Widget>
  );
}
