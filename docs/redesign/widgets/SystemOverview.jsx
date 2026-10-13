import React from 'react';
import { Widget, shell, get, num, fmt, fmtRate, detect, pretty, Ring, Spark, Bar, heat, useHistory, tone, TONES, SkinCtx, SKINS, hw, Num } from './kit';

export const meta = { id: 'SystemOverview', name: 'System Overview', category: 'System', icon: 'dashboard',
  prefixes: [], defaultSize: [5, 2], minSize: [1, 1],
  description: 'Unified CPU · GPU · RAM (+ VRAM, network) panel. Each section has its own colour, ring, stats, smooth graph; CPU adds a load-intensity core heatmap.' };

const DEF = { cpu: '#38bdf8', gpu: '#a78bfa', ram: '#fbbf24', vram: '#facc15', net: '#34d399' };
// Under a non-default skin, sections derive from the skin's accent by hue rotation, so the palette follows the skin.
const SHIFT = { cpu: 0, gpu: 55, ram: -45, vram: -80, net: 120 };
const sectionColor = (k) => (SHIFT[k] ? `oklch(from var(--sys-base) l c calc(h + ${SHIFT[k]}))` : 'var(--sys-base)');

// props: sections ['cpu','gpu','ram','vram','net'], colors { cpu, gpu, ram, … } | unifiedColor (use accent everywhere),
//        ring 'ring' | 'none', coreView 'heatmap' | 'bars' | 'off', heatRamp, details 'auto' | 'min' | 'full', warn, crit
export default function SystemOverview(p) {
  const d = p.data;
  const cpu = hw(d).cpu, gpu = hw(d).gpu;
  const L = (k) => num(get(d, `libre.${k}`));
  const C = (k) => L(`${cpu}_${k}`), G = (k) => L(`${gpu}_${k}`);
  const cores = []; for (let i = 1; i <= 64; i++) { const v = C(`cpu_core__${i}`); if (!Number.isFinite(v)) break; cores.push(v); }
  const fans = [1, 2, 3].map((i) => G(`gpu_fan_${i}`)).filter((v) => v > 0);
  const net = detect(d, /^libre\.(.+)_download_speed$/).sort((a, b) => L(`${b}_download_speed`) - L(`${a}_download_speed`))[0];
  const ramUsed = L('total_memory_memory_used'), ramTot = ramUsed + L('total_memory_memory_available');
  const vUsed = L('virtual_memory_memory_used'), vTot = vUsed + L('virtual_memory_memory_available');
  const ALL = {
    cpu: { label: 'CPU', v: C('cpu_total'), name: pretty(cpu ?? '').replace(/^AMD Ryzen/, 'Ryzen'), stats: [['Temp', `${fmt(C('core__tctl_tdie'), 0)}°C`], ['Power', `${fmt(C('package'), 0)} W`], ['Clock', `${fmt(C('cores__average_effective') / 1000, 2)} GHz`], ['Max core', `${fmt(C('cpu_core_max'), 0)}%`]] },
    gpu: { label: 'GPU', v: G('gpu_core_load'), name: (get(d, 'plugins.InfoPanel.RTSS.rtss.gpu-name') || pretty(gpu ?? '')).replace(/^NVIDIA /, ''), stats: [['Temp', `${fmt(G('gpu_core'), 0)}°C`], ['Hotspot', `${fmt(G('gpu_memory_junction'), 0)}°C`], ['Power', `${fmt(G('gpu_package'), 0)} W`], ['Clock', `${fmt(G('gpu_core_clock'), 0)} MHz`], ['Mem', `${fmt(G('gpu_memory_clock'), 0)} MHz`], ['Fans', fans.length ? `${fmt(fans.reduce((a, b) => a + b, 0) / fans.length, 0)} rpm` : 'idle']] },
    ram: { label: 'RAM', v: L('total_memory_memory'), name: `${fmt(ramUsed, 1)} / ${fmt(ramTot, 0)} GB`, stats: [['Free', `${fmt(L('total_memory_memory_available'), 1)} GB`], ['Page', `${fmt(vUsed, 0)} / ${fmt(vTot, 0)} GB`], ['Page load', `${fmt(L('virtual_memory_memory'), 0)}%`]] },
    vram: { label: 'VRAM', v: (G('gpu_memory_used') / G('gpu_memory_total')) * 100, name: `${fmt(G('gpu_memory_used') / 1024, 1)} / ${fmt(G('gpu_memory_total') / 1024, 0)} GB`, stats: [['Free', `${fmt(G('gpu_memory_free') / 1024, 1)} GB`], ['Ctrl', `${fmt(G('gpu_memory_controller'), 0)}%`]] },
    net: { label: 'NET', v: (L(`${net}_download_speed`) / (2500 * 128)) * 100, name: pretty(net ?? ''), big: fmtRate(L(`${net}_download_speed`)), stats: [['Down', fmtRate(L(`${net}_download_speed`))], ['Up', fmtRate(L(`${net}_upload_speed`))], ['Total ↓', `${fmt(L(`${net}_data_downloaded`), 1)} GB`]] },
  };
  const H = { cpu: useHistory(ALL.cpu.v, 60), gpu: useHistory(ALL.gpu.v, 60), ram: useHistory(ALL.ram.v, 60), vram: useHistory(ALL.vram.v, 60), net: useHistory(ALL.net.v, 60) };
  const keys = (p.sections ?? ['cpu', 'gpu', 'ram']).filter((k) => ALL[k]);
  const skinned = p.skin && p.skin !== 'default';
  const col = (k) => (p.unifiedColor ? undefined : p.colors?.[k] ?? (skinned ? (SKINS[p.skin]?.mono || p.skin === 'ink' ? undefined : sectionColor(k)) : DEF[k]));
  const vars = (k) => (col(k) ? { '--accent': col(k) } : undefined);
  const warn = p.warn ?? 80, crit = p.crit ?? 92;
  const coreView = p.coreView ?? 'heatmap';

  return (
    <Widget {...shell(p)} showHeader={!!p.title} title={p.title} icon="dashboard" studio={{ label: 'System', value: ALL.cpu.v, unit: '%', sub: ALL.cpu.name, hist: H.cpu, min: 0, max: 100, rows: keys.map((k) => ({ n: ALL[k].label, v: ALL[k].big ?? `${fmt(ALL[k].v, 0)}%`, pct: ALL[k].v })) }}>
      {({ w, h, shape }) => {
        // 1×1: concentric activity rings
        if (shape === 'tile') return (
          <div className="flex h-full items-center gap-2" style={{ '--sys-base': 'var(--accent)' }}>
            <div className="h-full min-w-0 flex-1"><svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="h-full w-full -rotate-90">
              {keys.slice(0, 3).map((k, i) => { const r = 44 - i * 13, c = 2 * Math.PI * r; return (
                <g key={k} style={vars(k)}>
                  <circle cx="50" cy="50" r={r} fill="none" stroke="var(--accent)" strokeOpacity=".16" strokeWidth="10" />
                  <circle cx="50" cy="50" r={r} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, ALL[k].v) / 100)} style={{ transition: 'stroke-dashoffset .7s ease-out' }} />
                </g>); })}
            </svg></div>
            {w - h > 60 && <div className="flex shrink-0 flex-col gap-1">{keys.slice(0, 3).map((k) => <span key={k} className="flex items-baseline gap-1.5 text-[11px]" style={vars(k)}><span className="text-zinc-500">{ALL[k].label}</span><Num className="text-[color:var(--accent)]">{fmt(ALL[k].v, 0)}%</Num></span>)}</div>}
          </div>
        );
        const ratio = w / Math.max(1, h);
        const cols = shape === 'column' || ratio < 0.8 ? 1 : ratio > 1.9 || keys.length <= 2 ? keys.length : 2;
        const rowsN = Math.ceil(keys.length / cols);
        const cellH = (h - (rowsN - 1) * 14) / rowsN, cellW = (w - (cols - 1) * 18) / cols;
        const level = p.details && p.details !== 'auto' ? p.details : cellH < 92 ? 'min' : cellH < 170 ? 'mid' : 'full';
        const ring = p.ring !== 'none' && cellW > 130 && cellH > 54;
        const rpx = Math.round(Math.max(40, Math.min(level === 'min' ? cellH - 8 : 86, cellH * 0.42, cellW * 0.34)));
        return (
          <div className="grid h-full" style={{ '--sys-base': 'var(--accent)', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gridTemplateRows: `repeat(${rowsN}, minmax(0,1fr))`, columnGap: 18, rowGap: 14 }}>
            {keys.map((k, i) => { const s = ALL[k], t = tone(s.v, warn, crit); return (
              <section key={k} style={vars(k)} className={`flex min-h-0 min-w-0 flex-col gap-2.5 ${cols > 1 && i % cols ? 'border-l border-white/[0.06] pl-[18px]' : ''}`}>
                <div className="flex min-w-0 items-center gap-3">
                  {ring && (
                    <div className="shrink-0" style={{ width: rpx, height: rpx }}>
                      <Ring value={s.v} t={t} thickness={9} className="h-full w-full">
                        <Num style={{ fontSize: rpx * 0.3 }}>{fmt(s.v, 0)}</Num>
                      </Ring>
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className={`flex min-w-0 gap-x-2 ${cellW < 120 ? 'flex-col gap-y-1' : 'items-baseline'}`}>
                      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{s.label}</span>
                      <Num className="whitespace-nowrap leading-none" style={{ fontSize: Math.max(12, Math.min(20, (cellW - (ring ? rpx + 12 : 0) - (cellW < 120 ? 0 : 44) - 2) / (String(s.big ?? fmt(s.v, 0) + '%').length * 0.68))), color: t === 'ok' ? 'var(--accent)' : TONES[t] }}>{s.big ?? `${fmt(s.v, 0)}%`}</Num>
                    </div>
                    <span className="truncate text-[11px] text-zinc-500">{s.name}</span>
                  </div>
                </div>
                {level === 'full' && (
                  <div className="grid gap-x-3 gap-y-1" style={{ gridTemplateColumns: cellW < 230 ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))' }}>
                    {s.stats.slice(0, Math.max(2, Math.min(cellW < 130 ? 2 : cellW < 230 ? 3 : 6, Math.floor((cellH - Math.max(ring ? rpx : 34, 34) - 40) / (cellW < 130 ? 28 : 18)) * (cellW < 230 ? 1 : 2)))).map(([l, v]) => (
                      cellW < 130
                      ? <div key={l} className="flex min-w-0 flex-col whitespace-nowrap text-[11px] leading-tight"><span className="truncate text-zinc-500">{l}</span><span className="truncate tabular-nums text-zinc-200">{v}</span></div>
                      : <div key={l} className="flex min-w-0 items-baseline justify-between gap-2 whitespace-nowrap text-[11.5px]"><span className="min-w-0 truncate text-zinc-500">{l}</span><span className="shrink-0 text-right tabular-nums text-zinc-200">{v}</span></div>
                    ))}
                  </div>
                )}
                {level !== 'min' && (
                  <div className="relative mt-auto min-h-[14px] flex-1 overflow-hidden">
                    {k === 'cpu' && coreView !== 'off' && cores.length > 0 ? (() => {
                      const hc = cellW > 170 ? 8 : 4;
                      return (
                        <div className="absolute inset-0 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.min(cores.length, hc)}, minmax(0,1fr))`, gridTemplateRows: `repeat(${Math.ceil(cores.length / hc)}, minmax(0,1fr))`, maxHeight: Math.ceil(cores.length / hc) * 16 }}>
                          {cores.map((v, ci) => coreView === 'bars'
                            ? <div key={ci} className="flex min-h-0 flex-col justify-end overflow-hidden rounded-[3px] bg-white/[0.05]"><div className="transition-[height] duration-700" style={{ height: `${Math.max(6, v)}%`, background: 'var(--accent)' }} /></div>
                            : <div key={ci} title={`Core ${ci + 1} · ${fmt(v, 0)}%`} className="min-h-0 rounded-[3px] transition-colors duration-700" style={{ background: heat(v, p.heatRamp ?? 'accent') }} />)}
                        </div>
                      );
                    })() : (
                      <div className="absolute inset-x-0 bottom-0 flex h-full max-h-12 flex-col justify-end gap-1.5">
                        <Spark values={H[k]} min={0} max={k === 'net' ? undefined : 100} className="min-h-0 flex-1" />
                        {(k === 'vram' || k === 'ram') && <Bar value={s.v} t={t} className="h-1.5 shrink-0" />}
                      </div>
                    )}
                  </div>
                )}
              </section>
            ); })}
          </div>
        );
      }}
    </Widget>
  );
}
