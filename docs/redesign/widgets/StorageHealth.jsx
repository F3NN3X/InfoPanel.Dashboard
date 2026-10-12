import React from 'react';
import { Widget, shell, get, num, fmt, fmtGB, fmtRate, detect, pretty, Metric, Ring, Spark, Stat, Bar, useHistory, tone, Empty } from './kit';

export const meta = { id: 'StorageHealth', name: 'SSD Health', category: 'Storage', icon: 'health_metrics',
  prefixes: ['libre.kingston_', 'libre.wdc_', 'libre.samsung_', 'libre.crucial_', 'libre.wd_'], defaultSize: [3, 2], minSize: [1, 1],
  description: 'SMART life, temperature, read/write rate, activity, TBW, spare and power-on hours.' };

// props: disk (sensor slug, e.g. "kingston_sfyrd2000g"); default = first detected
export default function StorageHealth(p) {
  const d = p.data;
  const disks = detect(d, /^libre\.(.+)_power_on_hours$/);
  const id = p.disk ?? disks[0];
  if (!id) return <Widget {...shell(p)} title="SSD" icon="health_metrics"><Empty /></Widget>;
  const k = (s) => num(get(d, `libre.${id}_${s}`));
  const pick = (...ks) => ks.map(k).find(Number.isFinite);
  const life = k('life'), temp = pick('composite_temperature', 'temperature', 'temperature__2');
  const warnT = pick('warning_temperature') ?? 70, critT = pick('critical_temperature') ?? 85;
  const rd = k('read_rate'), wr = k('write_rate');
  const rH = useHistory(rd), wH = useHistory(wr);
  const lifeT = life < 20 ? 'crit' : life < 50 ? 'warn' : 'ok';
  const name = p.title ?? pretty(id).split(' ')[0];
  return (
    <Widget {...shell(p)} title={`${name} · ${fmtGB(k('total_space'))}`} icon="health_metrics" compact={{ label: name, value: life, unit: '%', sub: `${fmt(temp, 0)}°C · ${fmtRate(rd + wr)}`, pct: life, kind: 'ring', t: lifeT }}
      right={<span className="tabular-nums" style={{ color: tone(temp, warnT, critT) === 'ok' ? '#d4d4d8' : '#fbbf24' }}>{fmt(temp, 0)}°C</span>}>
      {({ size }) => size === 'xs' ? (
        <Metric label="Health" value={life} unit="%" scale="lg" t={lifeT} sub={`${fmt(temp, 0)} °C`} className="h-full justify-center" />
      ) : size === 'sm' ? (
        <div className="flex h-full items-center gap-3">
          <Ring value={life} t={lifeT} thickness={9} className="h-full max-h-28">
            <span className="text-xl font-semibold tabular-nums">{fmt(life, 0)}<span className="text-xs text-zinc-400">%</span></span>
            <span className="text-[10px] text-zinc-500">life</span>
          </Ring>
          <div className="grid min-w-0 flex-1 gap-2"><Stat label="Read" value={fmtRate(rd)} /><Stat label="Write" value={fmtRate(wr)} /></div>
        </div>
      ) : (
        <div className="flex h-full flex-col gap-3">
          <div className="flex items-end gap-5">
            <Metric value={life} unit="%" scale={size === 'lg' ? 'xl' : 'lg'} sub="Drive life" t={lifeT} />
            <div className="grid flex-1 grid-cols-3 gap-3">
              <Stat label="Read" value={fmtRate(rd)} />
              <Stat label="Write" value={fmtRate(wr)} />
              <Stat label="Activity" value={`${fmt(k('total_activity'), 0)}%`} />
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            <Spark values={rH} min={0} className="absolute inset-0 h-full" />
            <Spark values={wH} min={0} fill={false} color="#a78bfa" className="absolute inset-0 h-full" />
            <div className="absolute right-0 top-0 flex gap-2 text-[10px] text-zinc-500"><span style={{ color: 'var(--accent)' }}>● read</span><span className="text-violet-400">● write</span></div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-zinc-400"><span>{fmtGB(k('free_space'))} free</span><span className="tabular-nums">{fmt(k('used_space'), 0)}% used</span></div>
            <Bar value={k('used_space')} className="h-1.5" />
          </div>
          {size === 'lg' && (
            <div className="grid grid-cols-4 gap-3 border-t border-white/[0.06] pt-3">
              <Stat label="Written" value={fmtGB(k('data_written'))} />
              <Stat label="Read total" value={fmtGB(k('data_read'))} />
              <Stat label="Power-on" value={`${fmt(k('power_on_hours'))} h`} />
              <Stat label={Number.isFinite(k('available_spare')) ? 'Spare' : 'Power cycles'} value={Number.isFinite(k('available_spare')) ? `${fmt(k('available_spare'))}%` : fmt(k('power_on_count'))} />
            </div>
          )}
        </div>
      )}
    </Widget>
  );
}
