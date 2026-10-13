import React, { useRef } from 'react';
import { Widget, shell, get, num, fmt, detect, useSkin, numFont, hue, STATE, hw, Pill } from './kit';

export const meta = { id: 'StatusTracker', name: 'Status Tracker', category: 'System', icon: 'view_week',
  prefixes: [], defaultSize: [4, 2], minSize: [2, 1],
  description: 'History of a state, one block per reading (Tremor Tracker style): OK, 50–80 %, above 80 %, no data. Hover a block for its value.' };

const COL = STATE;
// props: tracks [{ label, key, kind: 'threshold' | 'status', warn, crit, up }], samples (default 60)
export default function StatusTracker(p) {
  const d = p.data;
  const sk = useSkin();
  const cpu = hw(d).cpu, gpu = hw(d).gpu;
  const eth = Object.keys(d || {}).find((k) => /^plugins\.network-info-plugin\.\{[^}]+\}\.name$/.test(k) && get(d, k) === 'Ethernet')?.replace(/\.name$/, '.status');
  const tracks = p.tracks ?? [
    { label: 'Hottest thread', key: `libre.${cpu}_cpu_core_max`, kind: 'threshold', warn: 50, crit: 80 },
    { label: 'GPU load', key: `libre.${gpu}_gpu_core_load`, kind: 'threshold', warn: 50, crit: 80 },
    { label: 'Memory', key: 'libre.total_memory_memory', kind: 'threshold', warn: 80, crit: 92 },
    { label: 'Ethernet', key: eth, kind: 'status', up: 'Up' },
    { label: 'Data API', key: 'system.bridge.status', kind: 'status', up: 'running' },
  ];
  const N = p.samples ?? 60;
  const hist = useRef({}); const lastT = useRef('');
  const stamp = tracks.map((t) => get(d, t.key)).join('|') + get(d, 'system.bridge.time');
  if (stamp !== lastT.current) {
    lastT.current = stamp;
    tracks.forEach((t) => {
      const raw = get(d, t.key, null), v = num(raw);
      const st = raw == null || raw === '' ? 'none' : t.kind === 'status' ? (String(raw) === t.up ? 'ok' : 'crit') : v >= t.crit ? 'crit' : v >= t.warn ? 'warn' : 'ok';
      const arr = hist.current[t.label] ?? Array(N).fill({ st: 'none', v: '—' });
      hist.current[t.label] = [...arr, { st, v: t.kind === 'status' ? raw : `${fmt(v, 0)}%` }].slice(-N);
    });
  }
  return (
    <Widget {...shell(p)} title={p.title ?? `Last ${N} readings`} icon="view_week"
      compact={(box) => box.shape === 'tile' || box.shape === 'column' ? { label: 'Status', value: `${tracks.filter((t) => hist.current[t.label]?.at(-1)?.st === 'ok').length}/${tracks.length}`, sub: 'OK now', kind: 'value', icon: 'view_week' } : null}
      studio={{ label: `Last ${N} readings`, value: `${tracks.filter((t) => hist.current[t.label]?.at(-1)?.st === 'ok').length}/${tracks.length}`, sub: 'OK now', rows: tracks.map((t) => { const l = hist.current[t.label]?.at(-1); return { n: t.label, v: l?.v ?? '—', dot: l?.st === 'ok' }; }) }}>
      {({ w, h }) => {
        const labelW = w > 360 ? 112 : 76, rowsFit = Math.max(1, Math.floor((h - (h > 130 ? 46 : 0) + 10) / 34));
        return (
          <div className="flex h-full min-w-0 flex-col gap-2.5">
            {tracks.slice(0, rowsFit).map((t) => (
              <div key={t.label} className="grid items-center gap-2.5" style={{ gridTemplateColumns: `${labelW}px minmax(0,1fr)` }}>
                <span className="truncate text-[13px]">{t.label}</span>
                <div className="flex h-6 min-w-0 gap-[2px] overflow-hidden">
                  {(hist.current[t.label] ?? []).map((c, i) => <i key={i} title={`${t.label}: ${c.v}`} className="min-w-0 flex-1 rounded-[2px] transition-colors duration-300" style={{ background: COL[c.st] }} />)}
                </div>
              </div>
            ))}
            {h > 130 && (
              <>
                <div className="flex justify-between text-[11px] text-zinc-500" style={{ marginLeft: labelW + 10 }}><span>−{N}s</span><span>now</span></div>
                <div className="flex flex-wrap gap-1.5">
                  {[['ok', 'OK'], ['warn', '50–80%'], ['crit', 'Above 80% / down'], ['none', 'No data']].map(([s, l]) => (
                    <Pill key={s} state={s === 'none' ? 'off' : s}>{l}</Pill>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      }}
    </Widget>
  );
}
