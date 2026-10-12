import React from 'react';
import { Widget, shell, get, num, fmt, detect, pretty, useSkin, numFont, hue, STATE, hw } from './kit';

export const meta = { id: 'GpuRings', name: 'GPU Rings', category: 'Hardware', icon: 'donut_large',
  prefixes: [], defaultSize: [3, 2], minSize: [1, 1],
  description: 'Stacked radial rings for bounded percentages only — VRAM outer, core load inner, temperature in the centre — with a legend of clocks, power and fans.' };

// props: outer 'vram' | 'load' | 'power', inner 'load' | 'vram' | 'fan', colors { outer, inner }
export default function GpuRings(p) {
  const d = p.data;
  const sk = useSkin();
  const gpu = p.gpu ?? hw(d).gpu;
  const G = (k) => num(get(d, `libre.${gpu}_${k}`));
  const vram = (G('gpu_memory_used') / G('gpu_memory_total')) * 100;
  const fans = [1, 2, 3].map((i) => G(`gpu_fan_${i}`)).filter((v) => v > 0), duty = G('gpu_fan_1_control');
  const M = { vram: { l: 'VRAM', v: vram, txt: `${fmt(G('gpu_memory_used') / 1024, 1)} / ${fmt(G('gpu_memory_total') / 1024, 1)} GB` }, load: { l: 'Core load', v: G('gpu_core_load'), txt: `${fmt(G('gpu_core_load'), 0)}%` },
    power: { l: 'Board power', v: G('gpu_board_power'), txt: `${fmt(G('gpu_board_power'), 1)}%` }, fan: { l: 'Fan duty', v: duty, txt: `${fmt(duty, 0)}%` } };
  const outer = M[p.outer ?? 'vram'], inner = M[p.inner ?? 'load'];
  const cO = p.colors?.outer ?? 'var(--accent)', cI = p.colors?.inner ?? hue(70);
  const legend = [[cO, outer.l, outer.txt], [cI, inner.l, inner.txt], [null, 'Clock', `${fmt(G('gpu_core_clock'), 0)} MHz`], [null, 'Power', `${fmt(G('gpu_package'), 1)} W`],
    [null, 'Fans', fans.length ? `${fmt(fans.reduce((a, b) => a + b, 0) / fans.length, 0)} RPM · ${fmt(duty, 0)}%` : 'idle'], [null, 'Mem junction', `${fmt(G('gpu_memory_junction'), 0)}°C`]];
  const name = (get(d, 'plugins.InfoPanel.RTSS.rtss.gpu-name') || pretty(gpu ?? '')).replace(/^NVIDIA GeForce /, '');
  const Rings = ({ size }) => (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        {[[44, outer.v, cO], [32, inner.v, cI]].map(([r, v, c]) => { const C = 2 * Math.PI * r; return (
          <g key={r}><circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
            <circle cx="50" cy="50" r={r} fill="none" stroke={c} strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(100, v || 0) / 100)} style={{ transition: 'stroke-dashoffset .7s ease-out' }} /></g>); })}
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <b className="font-bold leading-none tabular-nums" style={{ fontSize: size * 0.19, ...numFont(sk) }}>{fmt(G('gpu_core'), 0)}°C</b>
        {size > 100 && <span className="text-[11px] text-zinc-400">Core</span>}
      </div>
    </div>
  );
  return (
    <Widget {...shell(p)} title={p.title ?? name} icon="donut_large"
      studio={{ label: name, value: inner.v, unit: '%', sub: `${fmt(G('gpu_core'), 0)}°C · ${outer.l} ${outer.txt}`, pct: outer.v, rows: legend.map(([, l, v]) => ({ n: l, v })) }}>
      {({ w, h }) => {
        const side = w > h * 1.35;
        const size = Math.max(60, Math.min(side ? h : h * 0.55, side ? w * 0.45 : w, 150));
        const rows = Math.max(2, Math.floor((side ? h : h - size - 12) / 22));
        return (
          <div className={`flex h-full min-w-0 items-center gap-4 ${side ? '' : 'flex-col justify-center'}`}>
            <Rings size={size} />
            {(side ? w - size > 120 : h - size > 40) && (
              <div className="grid min-w-0 flex-1 gap-1.5 self-stretch content-center">
                {legend.slice(0, rows).map(([c, l, v]) => (
                  <div key={l} className="grid min-w-0 grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2 text-[12.5px]">
                    <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c ?? 'transparent' }} />
                    <span className="truncate text-zinc-400">{l}</span>
                    <span className="font-medium tabular-nums">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }}
    </Widget>
  );
}
