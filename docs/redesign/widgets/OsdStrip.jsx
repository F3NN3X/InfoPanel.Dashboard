import React from 'react';
import { Widget, shell, get, num, fmt, detect, has, useSkin, numFont, hue, STATE, hw } from './kit';

export const meta = { id: 'OsdStrip', name: 'OSD Strip', category: 'Gaming', icon: 'videogame_asset',
  prefixes: [], defaultSize: [6, 1], minSize: [2, 1],
  description: 'In-game overlay strip (RTSS / Afterburner OSD): fixed cell order, monospace digits, colour only when a value drops.' };

// props: cells (subset/order of ['fps','low','ft','gpu','cpu','vram','display']), target (fps, default = refresh rate)
export default function OsdStrip(p) {
  const d = p.data;
  const sk = useSkin();
  const R = (s) => get(d, `plugins.InfoPanel.RTSS.rtss.${s}`);
  const cpu = hw(d).cpu, gpu = hw(d).gpu;
  const L = (k) => num(get(d, `libre.${k}`));
  const fps = num(R('fps')), low = num(R('1% low fps')), ft = num(R('current frame time')), hz = num(R('refreshrate'));
  const idle = !(fps > 0);
  const target = p.target ?? hz;
  const drop = (v) => (idle || !Number.isFinite(v) ? null : v < target * 0.5 ? '#F2665E' : v < target * 0.75 ? '#EDB232' : null);
  const res = String(R('resolution')).replace(/\s/g, ''), resL = /3840x2160/.test(res) ? '4K' : /2560x1440/.test(res) ? '1440p' : /1920x1080/.test(res) ? '1080p' : res;
  const ALL = {
    fps: ['FPS', idle ? '—' : fmt(fps), drop(fps)], low: ['1% low', idle ? '—' : fmt(low), drop(low)], ft: ['Frame time', idle ? '—' : `${fmt(ft, 1)} ms`, null],
    gpu: ['GPU', `${fmt(L(`${gpu}_gpu_core_load`), 0)}% · ${fmt(L(`${gpu}_gpu_core`), 0)}°`, null], cpu: ['CPU', `${fmt(L(`${cpu}_cpu_total`), 0)}%`, null],
    vram: ['VRAM', `${fmt(L(`${gpu}_gpu_memory_used`) / 1024, 1)} GB`, null], display: ['Display', `${resL} · ${fmt(hz)} Hz`, null],
  };
  const keys = p.cells ?? Object.keys(ALL);
  return (
    <Widget {...shell(p)} showHeader={false}
      compact={(box) => box.shape === 'strip' ? null : { label: 'FPS', value: idle ? '—' : fps, sub: idle ? 'No game running' : `1% ${fmt(low)} · ${fmt(ft, 1)} ms`, kind: 'value', icon: 'videogame_asset', t: drop(fps) === '#F2665E' ? 'crit' : drop(fps) ? 'warn' : 'ok' }}
      studio={{ label: 'OSD', live: !idle, value: idle ? '—' : fps, unit: idle ? '' : 'fps', rows: keys.map((k) => ({ n: ALL[k][0], v: ALL[k][1] })) }}>
      {({ w, h }) => {
        const n = Math.max(1, Math.min(keys.length, Math.floor(w / 92)));
        return (
          <div className="flex h-full flex-col justify-center gap-1.5">
            <div className="grid min-w-0 overflow-hidden rounded-md bg-black/55 ring-1 ring-white/10" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}>
              {keys.slice(0, n).map((k, i) => { const [l, v, c] = ALL[k]; return (
                <div key={k} className={`flex min-w-0 flex-col gap-0.5 px-2.5 py-1.5 ${i ? 'border-l border-white/10' : ''}`}>
                  <span className="truncate text-[9.5px] font-semibold uppercase tracking-[0.08em] text-zinc-400">{l}</span>
                  <span className="truncate text-[15px] font-medium tabular-nums" style={{ fontFamily: sk.skin === 'retro' || sk.skin === 'tui' ? sk.num : "'IBM Plex Mono','JetBrains Mono',ui-monospace,monospace", color: c ?? (k === 'fps' && !idle ? 'var(--accent)' : undefined) }}>{v}</span>
                </div>
              ); })}
            </div>
            {h > 90 && <span className="truncate text-[11px] text-zinc-500">RTSS: {has(R('windowtitle')) ? R('windowtitle') : '—'}{/✓|enabled/i.test(R('benchmark-mode')) ? ' · benchmark mode on' : ''}</span>}
          </div>
        );
      }}
    </Widget>
  );
}
