import React from 'react';
import { Widget, shell, get, num } from './kit';

export const meta = { id: 'Uptime', name: 'Uptime', category: 'System', icon: 'timer',
  prefixes: ['plugins.system-info-plugin.uptime.'], defaultSize: [2, 1], minSize: [1, 1],
  description: 'Time since boot as days / hours / minutes / seconds.' };

// props: showSeconds (default true)
export default function Uptime(p) {
  const d = p.data;
  const k = (s) => num(get(d, `plugins.system-info-plugin.uptime.${s}`));
  const parts = [['d', k('days'), 'days'], ['h', k('hours'), 'hours'], ['m', k('minutes'), 'min'], ['s', k('seconds'), 'sec']].filter((x, i) => i < 3 || p.showSeconds !== false);
  const pad = (v) => String(Number.isFinite(v) ? v : 0).padStart(2, '0');
  return (
    <Widget {...shell(p)} title={p.title ?? 'Uptime'} icon="timer" compact={{ label: 'Uptime', value: `${k('days')}d ${k('hours')}h`, sub: `${pad(k('minutes'))}m ${pad(k('seconds'))}s`, kind: 'value' }}>
      {({ size }) => size === 'xs' ? (
        <div className="flex h-full flex-col justify-center">
          <span className="text-[11px] text-zinc-400">Uptime</span>
          <span className="text-2xl font-semibold tabular-nums">{k('days')}d {k('hours')}h {pad(k('minutes'))}m</span>
        </div>
      ) : (
        <div className="flex h-full items-center justify-between gap-2">
          {parts.map(([u, v, l], i) => (
            <React.Fragment key={u}>
              {i > 0 && <span className="pb-4 text-2xl font-light text-zinc-600">:</span>}
              <div className="flex flex-1 flex-col items-center">
                <span className={`${size === 'lg' ? 'text-7xl' : size === 'md' ? 'text-5xl' : 'text-3xl'} font-semibold leading-none tabular-nums tracking-tight`} style={u === 'd' ? { color: 'var(--accent)' } : undefined}>{pad(v)}</span>
                <span className="mt-1.5 text-[10.5px] uppercase tracking-wider text-zinc-500">{l}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}
    </Widget>
  );
}
