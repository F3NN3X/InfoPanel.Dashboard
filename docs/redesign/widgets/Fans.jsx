import React from 'react';
import { Widget, shell, get, num, fmt, detect, Icon, Bar, hw } from './kit';

export const meta = { id: 'Fans', name: 'Fans', category: 'Hardware', icon: 'mode_fan',
  prefixes: [], defaultSize: [2, 1], minSize: [1, 1],
  description: 'GPU fans 1–3 with duty %, plus CPU fan. Icons spin at a speed proportional to RPM.' };

// props: maxRpm (default 3000), spin (default true)
export default function Fans(p) {
  const d = p.data;
  const gpu = hw(d).gpu;
  const fans = [1, 2, 3].map((i) => ({ id: `g${i}`, label: `GPU ${i}`, rpm: num(get(d, `libre.${gpu}_gpu_fan_${i}`)), duty: num(get(d, `libre.${gpu}_gpu_fan_${i}_control`)) }))
    .concat([{ id: 'cpu', label: 'CPU', rpm: num(get(d, 'libre.embedded_controller_cpu_optional_fan')) }])
    .filter((f) => Number.isFinite(f.rpm));
  const max = p.maxRpm ?? 3000;
  const avg = fans.filter((f) => f.rpm > 0).reduce((a, f, _, arr) => a + f.rpm / arr.length, 0);
  const Fan = ({ rpm, cls }) => (
    <Icon name="mode_fan" className={`${cls} ${rpm > 0 ? 'text-[color:var(--accent)]' : 'text-zinc-600'}`}
      style={undefined} />
  );
  return (
    <Widget {...shell(p)} title={p.title ?? 'Fans'} icon="mode_fan" studio={{ label: 'Fans', value: avg, unit: 'rpm', rows: fans.map((f) => ({ n: f.label, v: f.rpm > 0 ? `${fmt(f.rpm)} rpm` : 'off', pct: (f.rpm / max) * 100 })) }}
      compact={{ label: 'Fans', value: avg, unit: 'rpm', sub: `${fans.filter((f) => f.rpm > 0).length} spinning`, pct: (avg / max) * 100, icon: 'mode_fan' }}>
      {({ size }) => (
        <div className="grid h-full gap-2" style={{ gridTemplateColumns: `repeat(${size === 'sm' ? 2 : fans.length}, minmax(0,1fr))` }}>
          {fans.slice(0, size === 'sm' ? 2 : 8).map((f) => (
            <div key={f.id} className="flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl bg-white/[0.04] p-2">
              <span className={`inline-flex ${p.spin !== false && f.rpm > 0 ? 'animate-spin' : ''}`} style={{ animationDuration: `${Math.max(0.25, 600 / (f.rpm || 1)).toFixed(2)}s` }}>
                <Fan rpm={f.rpm} cls={size === 'lg' ? 'text-5xl' : 'text-3xl'} />
              </span>
              <span className="text-sm font-semibold tabular-nums">{f.rpm > 0 ? fmt(f.rpm) : 'Off'}</span>
              <span className="text-[10.5px] text-zinc-500">{f.label}{Number.isFinite(f.duty) ? ` · ${fmt(f.duty)}%` : ''}</span>
              {size === 'lg' && <Bar value={f.rpm} max={max} className="h-1 w-3/4" />}
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
}
