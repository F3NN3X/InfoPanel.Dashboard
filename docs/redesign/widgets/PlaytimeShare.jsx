import React from 'react';
import { Widget, shell, get, num, fmt, rows, useSkin, numFont, hue, STATE, Num } from './kit';

export const meta = { id: 'PlaytimeShare', name: 'Playtime Share', category: 'Gaming', icon: 'stacked_bar_chart',
  prefixes: [], defaultSize: [3, 2], minSize: [1, 1],
  description: 'How the last two weeks of play split between games — one bar, segments sized by share — with sessions and library totals.' };

const PALETTE = [hue(0), hue(70), hue(140), hue(210), hue(280), 'rgba(255,255,255,0.35)'];
// props: colors (array)
export default function PlaytimeShare(p) {
  const d = p.data;
  const sk = useSkin();
  const Lb = (s) => get(d, `plugins.InfoPanel.SteamAPI.SteamAPI-Library.${s}`);
  const games = rows(Lb('recent-games')).map(([name, two, total]) => ({ name, two: num(two), total: num(total) }));
  const sum = games.reduce((a, g) => a + (g.two || 0), 0) || 1;
  const pal = p.colors ?? PALETTE;
  const Big = ({ children }) => <Num className="leading-none">{children}</Num>;
  return (
    <Widget {...shell(p)} title={p.title ?? 'Playtime'} icon="stacked_bar_chart"
      studio={{ label: 'Playtime · 2 weeks', value: num(Lb('recent-playtime')), d: 1, unit: 'h', rows: games.map((g) => ({ n: g.name, v: `${fmt(g.two, 1)} h`, pct: (g.two / sum) * 100 })) }}
      compact={{ label: 'Last 2 weeks', value: num(Lb('recent-playtime')), d: 1, unit: 'h', sub: games[0]?.name, pct: ((games[0]?.two || 0) / sum) * 100 }}>
      {({ w, h }) => (
        <div className="flex h-full min-w-0 flex-col gap-3">
          <div className="flex items-end gap-6">
            <div className="flex flex-col gap-1"><span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">Last 2 weeks</span><span className="text-[28px]"><Big>{fmt(num(Lb('recent-playtime')), 1)}</Big><span className="ml-1 text-sm text-zinc-400">h</span></span></div>
            <div className="flex flex-col gap-1"><span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">Sessions</span><span className="text-[28px]"><Big>{fmt(num(Lb('recent-sessions')))}</Big></span></div>
          </div>
          <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-md">
            {games.map((g, i) => <span key={g.name} title={`${g.name} · ${fmt(g.two, 1)} h`} className="h-full transition-[flex-grow] duration-700 first:rounded-l-md last:rounded-r-md" style={{ flexGrow: g.two, background: pal[i % pal.length] }} />)}
          </div>
          <ul className="flex min-h-0 flex-col gap-1.5 overflow-hidden">
            {games.slice(0, Math.max(1, Math.floor((h - 120) / 22))).map((g, i) => (
              <li key={g.name} className="grid min-w-0 grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2 text-[13px]">
                <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: pal[i % pal.length] }} />
                <span className="truncate">{g.name}</span>
                <span className="whitespace-nowrap tabular-nums text-zinc-400"><b className="font-medium text-zinc-100">{fmt(g.two, 1)} h</b>{w > 300 && ` · ${fmt(g.total, 1)} h total`}</span>
              </li>
            ))}
          </ul>
          {h > 170 && <span className="mt-auto truncate text-xs text-zinc-500">Library: {fmt(num(Lb('total-games')))} games · {fmt(num(Lb('total-playtime')))} h lifetime</span>}
        </div>
      )}
    </Widget>
  );
}
