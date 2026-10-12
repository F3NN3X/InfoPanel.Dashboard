import React from 'react';
import { Widget, shell, get, num, fmt, Ring, Icon, Dot, Chip } from './kit';

export const meta = { id: 'VolumeMixer', name: 'Volume Mixer', category: 'Audio', icon: 'tune',
  prefixes: ['plugins.volume-plugin.', 'plugins.wavelink-plugin.'], defaultSize: [2, 2], minSize: [1, 1],
  description: 'Per-device volume + mute, default device, and Wave Link status.' };

// props: onSetVolume(containerKey, value 0-100), onToggleMute(containerKey) — optional; without them the faders are read-only
export default function VolumeMixer(p) {
  const d = p.data;
  const keys = [...new Set(Object.keys(d || {}).map((k) => k.match(/^plugins\.volume-plugin\.(.+)\.short_name$/)?.[1]).filter(Boolean))];
  const ch = keys.map((id) => {
    const k = (s) => get(d, `plugins.volume-plugin.${id}.${s}`);
    return { id, name: String(k('short_name')).replace(/\s*\(.+$/, ''), full: k('friendly_name'), dev: k('device_friendly_name'), vol: num(k('volume')), mute: k('mute') === 'True' };
  });
  const def = ch.find((c) => c.id === 'default') ?? ch[0];
  const list = ch.filter((c) => c.id !== 'default');
  const wl = get(d, 'plugins.wavelink-plugin.wavelink.status') === 'up';
  const live = !!p.onSetVolume;
  const setFrom = (id) => (e) => { if (!live) return; const r = e.currentTarget.getBoundingClientRect(); p.onSetVolume(id, Math.round(((e.clientX - r.left) / r.width) * 100)); };
  return (
    <Widget {...shell(p)} title={p.title ?? 'Volume'} icon="tune" studio={def && { label: 'Volume', live: wl, value: def.vol, unit: '%', sub: def.name, pct: def.vol, meters: list.map((c) => ({ n: c.name, v: c.mute ? 0 : c.vol })) }} compact={def && { label: def.name, value: def.vol, unit: '%', pct: def.mute ? 0 : def.vol, kind: 'ring', sub: def.mute ? 'Muted' : 'Default device', icon: def.mute ? 'volume_off' : 'volume_up' }} right={<Chip><Dot ok={wl} />Wave Link</Chip>}>
      {({ size, h }) => {
        if (!def) return null;
        if (size === 'xs' || size === 'sm') return (
          <div className="flex h-full items-center gap-3">
            <Ring value={def.mute ? 0 : def.vol} thickness={10} className="h-full max-h-24">
              <Icon name={def.mute ? 'volume_off' : 'volume_up'} className="text-xl" />
            </Ring>
            <div className="flex min-w-0 flex-col">
              <span className="text-2xl font-semibold tabular-nums">{fmt(def.vol)}<span className="text-sm text-zinc-400">%</span></span>
              <span className="truncate text-[11px] text-zinc-400">{def.name}</span>
            </div>
          </div>
        );
        const n = Math.max(1, Math.floor((h + 10) / ((size === 'lg' ? 34 : 30) + 10)));
        return (
          <ul className="flex h-full flex-col gap-2.5 overflow-hidden">
            {list.slice(0, n).map((c) => (
              <li key={c.id} className="grid grid-cols-[18px_minmax(0,1fr)_36px] items-center gap-x-2.5" title={c.full}>
                <button type="button" onClick={() => p.onToggleMute?.(c.id)} className={`flex items-center justify-center ${c.mute ? 'text-red-400' : 'text-zinc-400'}`}>
                  <Icon name={c.mute ? 'volume_off' : c.vol < 35 ? 'volume_down' : 'volume_up'} className="text-[17px]" />
                </button>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-xs text-zinc-200">{c.name}{size === 'lg' && <span className="text-zinc-500"> · {c.dev}</span>}</span>
                  <div onClick={setFrom(c.id)} className={`relative h-1.5 rounded-full bg-white/[0.08] ${live ? 'cursor-pointer' : ''}`}>
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${c.vol}%`, background: c.mute ? '#52525b' : 'var(--accent)' }} />
                    <div className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" style={{ left: `${c.vol}%` }} />
                  </div>
                </div>
                <span className="text-right text-xs tabular-nums text-zinc-400">{fmt(c.vol)}</span>
              </li>
            ))}
          </ul>
        );
      }}
    </Widget>
  );
}
