import React from 'react';
import { Widget, shell, get, num, fmt, Metric, BarRow, Ring, Spark, Dot, useHistory, tone } from './kit';

export const meta = { id: 'SystemStatus', name: 'System Status', category: 'System', icon: 'monitor_heart', prefixes: ['system.'], defaultSize: [2, 1], minSize: [1, 1],
  description: 'CPU + RAM load and Data API health.' };

export default function SystemStatus(p) {
  const d = p.data;
  const cpu = num(get(d, 'system.cpu.load')), ram = num(get(d, 'system.ram.load')), free = num(get(d, 'system.ram.free'));
  const ok = get(d, 'system.bridge.status') === 'running';
  const cpuH = useHistory(cpu), ramH = useHistory(ram);
  const warn = p.warn ?? 75, crit = p.crit ?? 90;
  return (
    <Widget {...shell(p)} title={p.title ?? 'System'} icon="monitor_heart" compact={{ label: 'CPU', value: cpu, unit: '%', sub: `RAM ${fmt(ram, 0)}%`, hist: cpuH, min: 0, max: 100, t: tone(cpu, warn, crit) }}
      right={<span className="flex items-center gap-1.5 font-mono text-[10.5px] text-zinc-400"><Dot ok={ok} />{get(d, 'system.bridge.time')}</span>}>
      {({ size }) => size === 'xs' ? (
        <div className="grid h-full grid-cols-2 items-center gap-2">
          <Metric label="CPU" value={cpu} unit="%" scale="md" t={tone(cpu, warn, crit)} />
          <Metric label="RAM" value={ram} unit="%" scale="md" t={tone(ram, warn, crit)} />
        </div>
      ) : size === 'sm' ? (
        <div className="flex h-full flex-col justify-center gap-3">
          <BarRow label="CPU" value={cpu} warn={warn} crit={crit} />
          <BarRow label="RAM" value={ram} hint={`${fmt(free, 0)}% free`} warn={warn} crit={crit} />
        </div>
      ) : size === 'md' ? (
        <div className="grid h-full min-h-0 grid-cols-2 gap-4" style={{ gridTemplateRows: 'minmax(0,1fr)' }}>
          {[['CPU', cpu, cpuH], ['RAM', ram, ramH]].map(([l, v, h]) => (
            <div key={l} className="flex min-h-0 min-w-0 flex-col">
              <Metric label={l} value={v} unit="%" scale="lg" t={tone(v, warn, crit)} />
              <Spark values={h} min={0} max={100} className="mt-2 min-h-0 flex-1" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid h-full min-h-0 grid-cols-2 gap-5">
          {[['CPU load', cpu, cpuH, 'Processor'], ['RAM load', ram, ramH, `${fmt(free, 1)}% free`]].map(([l, v, h, sub]) => (
            <div key={l} className="flex min-h-0 min-w-0 flex-col items-center gap-2">
              <Ring value={v} t={tone(v, warn, crit)} thickness={7} className="min-h-0 max-w-full flex-1">
                <span className="text-4xl font-semibold tabular-nums">{fmt(v, 0)}<span className="text-base text-zinc-400">%</span></span>
                <span className="text-[11px] text-zinc-400">{l}</span>
              </Ring>
              <Spark values={h} min={0} max={100} className="h-10 shrink-0" />
              <span className="shrink-0 text-[11px] text-zinc-500">{sub}</span>
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
}
